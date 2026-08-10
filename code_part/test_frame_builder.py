import json
import time

import redis


# ============================================================
# REDIS
# ============================================================

REDIS_HOST = "127.0.0.1"
REDIS_PORT = 6379

RAW_STREAM_NAME = "imu:raw"
FRAME_STREAM_NAME = "imu:frame"


redis_client = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    decode_responses=True,
)


# ============================================================
# FRAME CONFIG
# ============================================================

FRAME_PERIOD_MS = 10

FRAME_STREAM_MAXLEN = 100000


# ============================================================
# SENSOR SAMPLE FIELDS
# ============================================================

FIELDS = [
    "ax",
    "ay",
    "az",
    "gx",
    "gy",
    "gz",
    "qw",
    "qx",
    "qy",
    "qz",
]


# ============================================================
# LATEST SENSOR DATA
#
# latest["CHEST"] = newest CHEST sample
# latest["L_SH"]  = newest L_SH sample
# ...
# ============================================================

latest = {}


# ============================================================
# STATISTICS
# ============================================================

samples_received = 0
frames_generated = 0
redis_errors = 0

last_stats_time = time.monotonic()


# ============================================================
# CREATE FRAME
# ============================================================

def create_frame(frame_time):

    sensors = {}


    # --------------------------------------------------------
    # EVERY KNOWN SENSOR GOES INTO THE FRAME
    # --------------------------------------------------------

    for sensor, sample in latest.items():

        sensor_data = {}


        # ----------------------------------------------------
        # Copy IMU data
        # ----------------------------------------------------

        for field in FIELDS:

            if field in sample:

                sensor_data[field] = sample[field]


        # ----------------------------------------------------
        # Original sample timestamp
        # ----------------------------------------------------

        sensor_time = int(
            sample["epoch"]
        )


        sensor_data["sample_time"] = sensor_time


        # ----------------------------------------------------
        # Age relative to frame
        # ----------------------------------------------------

        sensor_data["age_ms"] = (
            frame_time -
            sensor_time
        )


        # ----------------------------------------------------
        # Put sensor into frame
        # ----------------------------------------------------

        sensors[sensor] = sensor_data


    # --------------------------------------------------------
    # FRAME
    # --------------------------------------------------------

    return {

        "time": frame_time,

        "sensors": sensors,

    }


# ============================================================
# WRITE FRAME
# ============================================================

def write_frame(frame):

    global redis_errors

    frame_json = json.dumps(
        frame,
        separators=(",", ":")
    )


    try:

        redis_client.xadd(
            FRAME_STREAM_NAME,

            {
                "frame": frame_json
            },

            maxlen=FRAME_STREAM_MAXLEN,
            approximate=True,
        )


    except redis.RedisError as e:

        redis_errors += 1

        print(
            "Redis frame write error:",
            e
        )


# ============================================================
# PROCESS RAW SAMPLE
# ============================================================

def process_sample(sample):

    global samples_received

    sensor = sample.get(
        "stream"
    )


    if not sensor:

        return


    try:

        sample_epoch = int(
            sample["epoch"]
        )

    except (
        KeyError,
        TypeError,
        ValueError,
    ):

        return


    # --------------------------------------------------------
    # STORE NEWEST SAMPLE
    # --------------------------------------------------------

    latest[sensor] = sample


    samples_received += 1


# ============================================================
# PRINT STATISTICS
# ============================================================

def print_stats():

    global samples_received
    global frames_generated
    global last_stats_time


    now = time.monotonic()


    elapsed = (
        now -
        last_stats_time
    )


    if elapsed < 1.0:

        return


    raw_rate = (
        samples_received /
        elapsed
    )


    frame_rate = (
        frames_generated /
        elapsed
    )


    print(
        f"RAW: {raw_rate:7.1f}/s | "
        f"FRAMES: {frame_rate:7.1f}/s | "
        f"SENSORS: {len(latest):2d} | "
        f"Redis errors: {redis_errors}"
    )


    samples_received = 0

    frames_generated = 0

    last_stats_time = now


# ============================================================
# START
# ============================================================

print()
print("=" * 70)
print(" FAST IMU FRAME BUILDER")
print("=" * 70)

print(
    f"Input stream  : {RAW_STREAM_NAME}"
)

print(
    f"Output stream : {FRAME_STREAM_NAME}"
)

print(
    f"Frame period  : {FRAME_PERIOD_MS} ms"
)

print(
    f"Target        : "
    f"{1000 / FRAME_PERIOD_MS:.0f} FPS"
)

print("=" * 70)
print()


# ============================================================
# REDIS STREAM
# ============================================================

last_id = "$"


# ============================================================
# FRAME CLOCK
# ============================================================

next_frame_time = None


# ============================================================
# MAIN LOOP
# ============================================================

while True:

    try:

        # ----------------------------------------------------
        # Read incoming raw samples
        # ----------------------------------------------------

        response = redis_client.xread(
            {
                RAW_STREAM_NAME: last_id
            },

            block=10,

            count=100,
        )


        # ----------------------------------------------------
        # Process incoming samples
        # ----------------------------------------------------

        if response:

            for _, entries in response:

                for msg_id, sample in entries:

                    last_id = msg_id

                    process_sample(
                        sample
                    )


                    # ----------------------------------------
                    # Initialize frame clock
                    # ----------------------------------------

                    if next_frame_time is None:

                        sample_time = int(
                            sample["epoch"]
                        )

                        next_frame_time = (
                            sample_time
                            -
                            (
                                sample_time
                                %
                                FRAME_PERIOD_MS
                            )
                        )


        # ----------------------------------------------------
        # Generate frames in REAL TIME
        #
        # Do NOT generate old missed frames.
        # ----------------------------------------------------

        if latest:

            newest_time = max(
                int(sample["epoch"])
                for sample in latest.values()
            )


            if next_frame_time is None:

                next_frame_time = (
                    newest_time
                )


            # ----------------------------------------------
            # Generate only ONE frame per loop.
            #
            # This prevents:
            #
            # 200 FPS
            # 0 FPS
            # 200 FPS
            #
            # ----------------------------------------------

            if newest_time >= next_frame_time:

                frame = create_frame(
                    next_frame_time
                )


                write_frame(
                    frame
                )


                frames_generated += 1


                next_frame_time += (
                    FRAME_PERIOD_MS
                )


                # ------------------------------------------
                # If we fell far behind, jump to NOW.
                #
                # Do NOT replay old frames.
                # ------------------------------------------

                if (
                    newest_time -
                    next_frame_time
                    >
                    100
                ):

                    next_frame_time = (
                        newest_time -
                        (
                            newest_time
                            %
                            FRAME_PERIOD_MS
                        )
                    )


        # ----------------------------------------------------
        # Statistics
        # ----------------------------------------------------

        print_stats()


    except KeyboardInterrupt:

        print()

        print(
            "Stopping frame builder..."
        )

        break


    except redis.RedisError as e:

        print(
            "Redis error:",
            e
        )

        time.sleep(
            0.01
        )


    except Exception as e:

        print(
            "Unexpected error:",
            e
        )

        time.sleep(
            0.01
        )
