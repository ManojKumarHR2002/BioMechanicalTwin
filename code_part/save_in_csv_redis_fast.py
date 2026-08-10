import json
import struct
import queue
import threading
import time

import redis
import paho.mqtt.client as mqtt


# ============================================================
# MQTT
# ============================================================

BROKER = "127.0.0.1"
PORT = 1883
TOPIC = "imu/#"


# ============================================================
# REDIS
# ============================================================

REDIS_HOST = "127.0.0.1"
REDIS_PORT = 6379

STREAM_NAME = "imu:raw"


redis_client = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    decode_responses=True
)


# ============================================================
# PACKET FORMAT
# ============================================================

HEADER_FORMAT = "<8sH"
HEADER_SIZE = struct.calcsize(
    HEADER_FORMAT
)

SAMPLE_FORMAT = "<Qhhhhhhffff"
SAMPLE_SIZE = struct.calcsize(
    SAMPLE_FORMAT
)


# ============================================================
# QUEUE
# ============================================================

data_queue = queue.Queue(
    maxsize=50000
)


# ============================================================
# STATISTICS
# ============================================================

mqtt_messages = 0
samples_received = 0
redis_samples = 0
queue_drops = 0

stats_lock = threading.Lock()


# ============================================================
# REDIS WRITER
# ============================================================

def redis_writer():

    global redis_samples

    while True:

        sample = data_queue.get()

        if sample is None:

            break


        try:

            # ------------------------------------------------
            # WRITE IMMEDIATELY
            #
            # NO 200 SAMPLE WAIT
            # ------------------------------------------------

            redis_client.xadd(
                STREAM_NAME,
                sample,
                maxlen=500000,
                approximate=True
            )


            with stats_lock:

                redis_samples += 1


        except redis.RedisError as e:

            print(
                "Redis write error:",
                e
            )


# ============================================================
# MQTT CONNECT
# ============================================================

def on_connect(
    client,
    userdata,
    flags,
    rc,
    properties=None
):

    print(
        f"Connected to MQTT: {rc}"
    )

    client.subscribe(
        TOPIC
    )


# ============================================================
# MQTT MESSAGE
# ============================================================

def on_message(
    client,
    userdata,
    msg
):

    global mqtt_messages
    global samples_received
    global queue_drops


    payload = msg.payload


    if len(payload) < HEADER_SIZE:

        return


    try:

        label_bytes, count = struct.unpack(
            HEADER_FORMAT,
            payload[:HEADER_SIZE]
        )

    except struct.error:

        return


    label = (
        label_bytes
        .decode(errors="ignore")
        .rstrip("\x00")
    )


    offset = HEADER_SIZE

    recv_time = time.time_ns()


    with stats_lock:

        mqtt_messages += 1


    for _ in range(count):

        if (
            offset + SAMPLE_SIZE
            >
            len(payload)
        ):

            break


        try:

            (
                epoch,
                ax,
                ay,
                az,
                gx,
                gy,
                gz,
                qw,
                qx,
                qy,
                qz

            ) = struct.unpack(
                SAMPLE_FORMAT,
                payload[
                    offset:
                    offset + SAMPLE_SIZE
                ]
            )

        except struct.error:

            break


        sample = {

            "stream": label,

            "epoch": epoch,

            "recv_time": recv_time,

            "ax": ax,
            "ay": ay,
            "az": az,

            "gx": gx,
            "gy": gy,
            "gz": gz,

            "qw": qw,
            "qx": qx,
            "qy": qy,
            "qz": qz

        }


        try:

            data_queue.put_nowait(
                sample
            )

            with stats_lock:

                samples_received += 1


        except queue.Full:

            with stats_lock:

                queue_drops += 1


        offset += SAMPLE_SIZE


# ============================================================
# STATISTICS THREAD
# ============================================================

def statistics():

    last_samples = 0
    last_redis = 0
    last_time = time.monotonic()


    while True:

        time.sleep(1)


        now = time.monotonic()

        elapsed = (
            now - last_time
        )


        with stats_lock:

            current_samples = (
                samples_received
            )

            current_redis = (
                redis_samples
            )

            current_mqtt = (
                mqtt_messages
            )

            current_drops = (
                queue_drops
            )


        sample_rate = (
            current_samples -
            last_samples
        ) / elapsed


        redis_rate = (
            current_redis -
            last_redis
        ) / elapsed


        print(

            f"MQTT MSG: {current_mqtt:6d} | "

            f"SAMPLES: {sample_rate:7.1f}/s | "

            f"REDIS: {redis_rate:7.1f}/s | "

            f"QUEUE: {data_queue.qsize():5d} | "

            f"DROPS: {current_drops}"

        )


        last_samples = (
            current_samples
        )

        last_redis = (
            current_redis
        )

        last_time = now


# ============================================================
# THREADS
# ============================================================

threading.Thread(
    target=redis_writer,
    daemon=True
).start()


threading.Thread(
    target=statistics,
    daemon=True
).start()


# ============================================================
# MQTT CLIENT
# ============================================================

client = mqtt.Client(
    mqtt.CallbackAPIVersion.VERSION2
)

client.on_connect = on_connect
client.on_message = on_message


print(
    "Starting MQTT → Redis..."
)


client.connect(
    BROKER,
    PORT,
    60
)


client.loop_forever()
