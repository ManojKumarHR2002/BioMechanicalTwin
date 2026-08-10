/*
    =====================================================
    ESP32-C3
    MPU6050 + DMP Quaternion
    WiFi + MQTT
    NTP Timestamp
    =====================================================

    GOAL:
    -----------------------------------------------------
    SEND AS MUCH IMU DATA AS POSSIBLE

    NO artificial FPS limiter.

    Every complete DMP FIFO packet is:
        1. Read
        2. Decoded
        3. Published immediately to MQTT

    Therefore:

        MPU packet rate
              ↓
        MQTT packet rate
              ↓
        Redis
              ↓
        WebSocket
              ↓
        Three.js

    The actual FPS depends on:
        - MPU/DMP output rate
        - I2C speed
        - ESP32 CPU
        - WiFi
        - MQTT broker
        - Network latency

    LED:
        GREEN = MQTT connected
        RED   = MQTT disconnected
*/


// =====================================================
// LIBRARIES
// =====================================================

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <time.h>
#include <sys/time.h>

#include "I2Cdev.h"
#include "MPU6050_6Axis_MotionApps20.h"


// =====================================================
// LED
// =====================================================

const int LED_RED   = 1;
const int LED_GREEN = 0;


// =====================================================
// WIFI
// =====================================================

const char *ssid =
    "TP-Link_DF6C_Cave_2.4";

const char *password =
    "Caveiot@123";


// =====================================================
// MQTT
// =====================================================

const char *mqttServer =
    "192.168.1.144";

const int mqttPort = 1883;


// -----------------------------------------------------
// SENSOR TOPIC
// -----------------------------------------------------

const char *mqttTopic =
    "imu/R_SH";

const char *SENSOR_LABEL =
    "R_SH";


// =====================================================
// NTP
// =====================================================

const char *ntpServer =
    "pool.ntp.org";

const long gmtOffset_sec =
    19800;

const int daylightOffset_sec =
    0;


// =====================================================
// OBJECTS
// =====================================================

WiFiClient wifiClient;

PubSubClient mqtt(wifiClient);

MPU6050 mpu;


// =====================================================
// DMP
// =====================================================

bool dmpReady = false;

uint8_t fifoBuffer[64];

uint16_t packetSize;

uint16_t fifoCount;


// =====================================================
// SENSOR DATA
// =====================================================

Quaternion q;

VectorInt16 aa;

VectorInt16 gg;


// =====================================================
// PACKET
// =====================================================

#pragma pack(push, 1)

struct Sample
{
    uint64_t epoch;

    int16_t ax;
    int16_t ay;
    int16_t az;

    int16_t gx;
    int16_t gy;
    int16_t gz;

    float qw;
    float qx;
    float qy;
    float qz;
};


// -----------------------------------------------------
// One MQTT message = one IMU frame
// -----------------------------------------------------

struct Packet
{
    char label[8];

    uint16_t count;

    Sample samples[1];
};

#pragma pack(pop)


Packet packet;


// =====================================================
// FPS STATISTICS
// =====================================================

unsigned long frameCounter = 0;

unsigned long lastStatsTime = 0;


// =====================================================
// FIFO STATISTICS
// =====================================================

unsigned long fifoOverflowCounter = 0;

unsigned long mqttFailCounter = 0;


// =====================================================
// FUNCTION PROTOTYPES
// =====================================================

void connectWiFi();

void syncTime();

uint64_t getEpochMillis();

void connectMQTT();

void maintainConnection();

void setupMPU();

bool readAndPublishSensor();

void updateLEDs();


// =====================================================
// WIFI CONNECT
// =====================================================

void connectWiFi()
{
    if (WiFi.status() == WL_CONNECTED)
    {
        return;
    }


    // -------------------------------------------------
    // RED while connecting
    // -------------------------------------------------

    digitalWrite(
        LED_RED,
        HIGH
    );

    digitalWrite(
        LED_GREEN,
        LOW
    );


    WiFi.mode(WIFI_STA);


    Serial.println();
    Serial.print(
        "Connecting WiFi"
    );


    WiFi.begin(
        ssid,
        password
    );


    while (
        WiFi.status() != WL_CONNECTED
    )
    {
        Serial.print(".");

        delay(200);
    }


    Serial.println();

    Serial.println(
        "WiFi Connected"
    );


    Serial.print(
        "IP Address : "
    );

    Serial.println(
        WiFi.localIP()
    );


    Serial.print(
        "RSSI       : "
    );

    Serial.print(
        WiFi.RSSI()
    );

    Serial.println(
        " dBm"
    );
}


// =====================================================
// NTP
// =====================================================

void syncTime()
{
    Serial.println();

    Serial.print(
        "Synchronizing NTP"
    );


    configTime(
        gmtOffset_sec,
        daylightOffset_sec,
        ntpServer
    );


    struct tm timeinfo;


    while (
        !getLocalTime(&timeinfo)
    )
    {
        Serial.print(".");

        delay(200);
    }


    Serial.println();

    Serial.println(
        "NTP Synchronized"
    );


    Serial.print(
        "Current Time : "
    );


    Serial.println(
        &timeinfo,
        "%d-%m-%Y %H:%M:%S"
    );
}


// =====================================================
// EPOCH MILLISECONDS
// =====================================================

uint64_t getEpochMillis()
{
    struct timeval tv;


    gettimeofday(
        &tv,
        NULL
    );


    return
        ((uint64_t)tv.tv_sec * 1000ULL)
        +
        (tv.tv_usec / 1000ULL);
}


// =====================================================
// MQTT CONNECT
// =====================================================

void connectMQTT()
{
    mqtt.setServer(
        mqttServer,
        mqttPort
    );


    // -------------------------------------------------
    // Packet size
    //
    // label  = 8
    // count  = 2
    // sample = 36
    //
    // total = 46 bytes
    //
    // 128 gives plenty of room.
    // -------------------------------------------------

    mqtt.setBufferSize(
        128
    );


    while (
        !mqtt.connected()
    )
    {
        Serial.print(
            "Connecting MQTT... "
        );


        if (
            mqtt.connect(
                SENSOR_LABEL
            )
        )
        {
            Serial.println(
                "Connected"
            );


            digitalWrite(
                LED_GREEN,
                HIGH
            );

            digitalWrite(
                LED_RED,
                LOW
            );
        }
        else
        {
            Serial.print(
                "Failed. MQTT state = "
            );

            Serial.println(
                mqtt.state()
            );


            digitalWrite(
                LED_GREEN,
                LOW
            );

            digitalWrite(
                LED_RED,
                HIGH
            );


            delay(500);
        }
    }
}


// =====================================================
// CONNECTION MAINTENANCE
// =====================================================

void maintainConnection()
{
    // -------------------------------------------------
    // WIFI
    // -------------------------------------------------

    if (
        WiFi.status() != WL_CONNECTED
    )
    {
        Serial.println(
            "WiFi Lost"
        );


        digitalWrite(
            LED_GREEN,
            LOW
        );

        digitalWrite(
            LED_RED,
            HIGH
        );


        connectWiFi();

        syncTime();
    }


    // -------------------------------------------------
    // MQTT
    // -------------------------------------------------

    if (
        !mqtt.connected()
    )
    {
        Serial.println(
            "MQTT Lost"
        );


        digitalWrite(
            LED_GREEN,
            LOW
        );

        digitalWrite(
            LED_RED,
            HIGH
        );


        connectMQTT();
    }


    // -------------------------------------------------
    // MQTT loop
    // -------------------------------------------------

    mqtt.loop();


    // -------------------------------------------------
    // LEDs
    // -------------------------------------------------

    updateLEDs();
}


// =====================================================
// LED STATUS
// =====================================================

void updateLEDs()
{
    if (
        WiFi.status() == WL_CONNECTED &&
        mqtt.connected()
    )
    {
        digitalWrite(
            LED_GREEN,
            HIGH
        );

        digitalWrite(
            LED_RED,
            LOW
        );
    }
    else
    {
        digitalWrite(
            LED_GREEN,
            LOW
        );

        digitalWrite(
            LED_RED,
            HIGH
        );
    }
}


// =====================================================
// MPU6050 + DMP
// =====================================================

void setupMPU()
{
    Serial.println();

    Serial.println(
        "--------------------------------"
    );

    Serial.println(
        "Initializing MPU6050..."
    );

    Serial.println(
        "--------------------------------"
    );


    // -------------------------------------------------
    // I2C
    // -------------------------------------------------

    Wire.begin(
        8,
        9
    );


    // 400 kHz I2C

    Wire.setClock(
        400000
    );


    // -------------------------------------------------
    // MPU INITIALIZE
    // -------------------------------------------------

    mpu.initialize();


    // -------------------------------------------------
    // MPU SAMPLE RATE
    //
    // 1000 / (1 + 4)
    // = 200 Hz
    // -------------------------------------------------

    mpu.setRate(
        4
    );


    // -------------------------------------------------
    // CONNECTION TEST
    // -------------------------------------------------

    if (
        !mpu.testConnection()
    )
    {
        Serial.println(
            "MPU6050 NOT FOUND!"
        );


        digitalWrite(
            LED_RED,
            HIGH
        );


        while (true)
        {
            delay(1000);
        }
    }


    Serial.println(
        "MPU6050 Connected"
    );


    // -------------------------------------------------
    // OFFSETS
    // -------------------------------------------------

    mpu.setXGyroOffset(
        220
    );

    mpu.setYGyroOffset(
        76
    );

    mpu.setZGyroOffset(
        -85
    );

    mpu.setZAccelOffset(
        1788
    );


    // -------------------------------------------------
    // DMP INITIALIZE
    // -------------------------------------------------

    Serial.println(
        "Initializing DMP..."
    );


    uint8_t devStatus =
        mpu.dmpInitialize();


    if (
        devStatus != 0
    )
    {
        Serial.print(
            "DMP Initialization Failed : "
        );

        Serial.println(
            devStatus
        );


        digitalWrite(
            LED_RED,
            HIGH
        );


        while (true)
        {
            delay(1000);
        }
    }


    // -------------------------------------------------
    // ENABLE DMP
    // -------------------------------------------------

    mpu.setDMPEnabled(
        true
    );


    // -------------------------------------------------
    // DMP FIFO PACKET SIZE
    // -------------------------------------------------

    packetSize =
        mpu.dmpGetFIFOPacketSize();


    dmpReady = true;


    // -------------------------------------------------
    // RESET FIFO
    // -------------------------------------------------

    mpu.resetFIFO();


    Serial.println();

    Serial.println(
        "--------------------------------"
    );

    Serial.println(
        "DMP READY"
    );


    Serial.print(
        "FIFO Packet Size : "
    );

    Serial.println(
        packetSize
    );


    Serial.println(
        "Streaming Mode   : MAXIMUM"
    );

    Serial.println(
        "FPS Limiter      : NONE"
    );

    Serial.println(
        "--------------------------------"
    );
}


// =====================================================
// READ ONE FIFO PACKET + PUBLISH
// =====================================================
//
// IMPORTANT:
//
// Unlike the previous version:
//
//     We DO NOT throw away old FIFO packets.
//
// Every complete DMP packet is decoded and published.
//
// This gives maximum data throughput.
//
// =====================================================

bool readAndPublishSensor()
{
    if (
        !dmpReady
    )
    {
        return false;
    }


    // -------------------------------------------------
    // Get FIFO count
    // -------------------------------------------------

    fifoCount =
        mpu.getFIFOCount();


    // -------------------------------------------------
    // FIFO OVERFLOW
    // -------------------------------------------------

    if (
        fifoCount >= 1024
    )
    {
        fifoOverflowCounter++;


        Serial.println(
            "FIFO OVERFLOW - RESET"
        );


        mpu.resetFIFO();


        return false;
    }


    // -------------------------------------------------
    // No complete packet
    // -------------------------------------------------

    if (
        fifoCount < packetSize
    )
    {
        return false;
    }


    // -------------------------------------------------
    // Process EVERY complete packet
    //
    // Do NOT skip packets.
    // -------------------------------------------------

    bool published =
        false;


    while (
        fifoCount >= packetSize
    )
    {
        // -------------------------------------------------
        // Read ONE DMP packet
        // -------------------------------------------------

        mpu.getFIFOBytes(
            fifoBuffer,
            packetSize
        );


        fifoCount -=
            packetSize;


        // -------------------------------------------------
        // Decode quaternion
        // -------------------------------------------------

        mpu.dmpGetQuaternion(
            &q,
            fifoBuffer
        );


        // -------------------------------------------------
        // Decode acceleration
        // -------------------------------------------------

        mpu.dmpGetAccel(
            &aa,
            fifoBuffer
        );


        // -------------------------------------------------
        // Decode gyro
        // -------------------------------------------------

        mpu.dmpGetGyro(
            &gg,
            fifoBuffer
        );


        // -------------------------------------------------
        // Fill packet
        // -------------------------------------------------

        packet.count = 1;


        Sample &s =
            packet.samples[0];


        s.epoch =
            getEpochMillis();


        s.ax =
            aa.x;

        s.ay =
            aa.y;

        s.az =
            aa.z;


        s.gx =
            gg.x;

        s.gy =
            gg.y;

        s.gz =
            gg.z;


        s.qw =
            q.w;

        s.qx =
            q.x;

        s.qy =
            q.y;

        s.qz =
            q.z;


        // -------------------------------------------------
        // Packet size
        // -------------------------------------------------

        const uint16_t payloadSize =
            sizeof(packet.label)
            +
            sizeof(packet.count)
            +
            sizeof(Sample);


        // -------------------------------------------------
        // MQTT PUBLISH
        //
        // QoS 0 = lowest latency
        // -------------------------------------------------

        bool success =
            mqtt.publish(
                mqttTopic,
                (const uint8_t *)&packet,
                payloadSize
            );


        if (success)
        {
            frameCounter++;

            published = true;
        }
        else
        {
            mqttFailCounter++;
        }


        // -------------------------------------------------
        // If MQTT disconnects during processing,
        // stop immediately and reconnect in main loop.
        // -------------------------------------------------

        if (
            !mqtt.connected()
        )
        {
            break;
        }


        // -------------------------------------------------
        // Keep MQTT connection alive
        // -------------------------------------------------

        mqtt.loop();
    }


    return published;
}


// =====================================================
// SETUP
// =====================================================

void setup()
{
    // -------------------------------------------------
    // Serial
    // -------------------------------------------------

    Serial.begin(
        115200
    );


    delay(500);


    // -------------------------------------------------
    // LEDs
    // -------------------------------------------------

    pinMode(
        LED_RED,
        OUTPUT
    );

    pinMode(
        LED_GREEN,
        OUTPUT
    );


    digitalWrite(
        LED_RED,
        HIGH
    );

    digitalWrite(
        LED_GREEN,
        LOW
    );


    // -------------------------------------------------
    // Startup
    // -------------------------------------------------

    Serial.println();

    Serial.println(
        "======================================"
    );

    Serial.println(
        "ESP32-C3 IMU MAXIMUM DATA STREAM"
    );

    Serial.println(
        "======================================"
    );


    // -------------------------------------------------
    // Clear packet
    // -------------------------------------------------

    memset(
        &packet,
        0,
        sizeof(packet)
    );


    // -------------------------------------------------
    // Sensor label
    // -------------------------------------------------

    strncpy(
        packet.label,
        SENSOR_LABEL,
        sizeof(packet.label) - 1
    );


    // -------------------------------------------------
    // WiFi
    // -------------------------------------------------

    connectWiFi();


    // -------------------------------------------------
    // NTP
    // -------------------------------------------------

    syncTime();


    // -------------------------------------------------
    // MQTT
    // -------------------------------------------------

    connectMQTT();


    // -------------------------------------------------
    // MPU
    // -------------------------------------------------

    setupMPU();


    // -------------------------------------------------
    // Statistics timer
    // -------------------------------------------------

    lastStatsTime =
        millis();


    Serial.println();

    Serial.println(
        "======================================"
    );

    Serial.println(
        "SYSTEM READY"
    );

    Serial.println(
        "MAXIMUM STREAMING ENABLED"
    );

    Serial.println(
        "NO FPS LIMITER"
    );

    Serial.println(
        "======================================"
    );
}


// =====================================================
// LOOP
// =====================================================

void loop()
{
    // -------------------------------------------------
    // Maintain WiFi + MQTT
    // -------------------------------------------------

    maintainConnection();


    // -------------------------------------------------
    // READ + SEND EVERYTHING AVAILABLE
    // -------------------------------------------------
    //
    // There is NO:
    //
    //     delay()
    //
    // There is NO:
    //
    //     25 ms
    //
    // There is NO:
    //
    //     30 ms
    //
    // There is NO:
    //
    //     40 FPS LIMIT
    //
    // Every available DMP packet is sent.
    // -------------------------------------------------

    readAndPublishSensor();


    // -------------------------------------------------
    // FPS STATISTICS
    // -------------------------------------------------

    unsigned long now =
        millis();


    if (
        now - lastStatsTime >= 1000
    )
    {
        Serial.print(
            "MQTT FPS: "
        );

        Serial.print(
            frameCounter
        );


        Serial.print(
            " | FIFO overflow: "
        );

        Serial.print(
            fifoOverflowCounter
        );


        Serial.print(
            " | MQTT failures: "
        );

        Serial.println(
            mqttFailCounter
        );


        // Reset one-second counters

        frameCounter = 0;

        fifoOverflowCounter = 0;

        mqttFailCounter = 0;


        lastStatsTime =
            now;
    }
}
