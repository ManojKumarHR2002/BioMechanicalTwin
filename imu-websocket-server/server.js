
const express = require("express");
const http = require("http");
const cors = require("cors");
const WebSocket = require("ws");
const { createClient } = require("redis");


// ============================================================
// CONFIGURATION
// ============================================================

const PORT = 3000;

const REDIS_HOST = "127.0.0.1";
const REDIS_PORT = 6379;

const FRAME_STREAM_NAME = "imu:frame";


// ============================================================
// EXPRESS
// ============================================================

const app = express();

app.use(cors());
app.use(express.json());


// ============================================================
// HTTP SERVER
// ============================================================

const server = http.createServer(app);


// ============================================================
// REDIS
// ============================================================

const redisClient = createClient({

    socket: {
        host: REDIS_HOST,
        port: REDIS_PORT
    }

});

redisClient.on("error", (err) => {

    console.error(
        "Redis error:",
        err
    );

});

redisClient.on("connect", () => {

    console.log(
        "Redis connecting..."
    );

});

redisClient.on("ready", () => {

    console.log(
        "Redis ready"
    );

});

redisClient.on("reconnecting", () => {

    console.log(
        "Redis reconnecting..."
    );

});


// ============================================================
// WEBSOCKET
// ============================================================

const wss = new WebSocket.Server({

    server,

    path: "/ws",

    // IMPORTANT:
    // Disable compression.
    //
    // Small IMU packets + high FPS:
    // compression adds CPU and latency.

    perMessageDeflate: false

});


// ============================================================
// STATISTICS
// ============================================================

let redisFrames = 0;

let websocketFrames = 0;

let skippedOldFrames = 0;

let lastStatsTime = Date.now();


// ============================================================
// HEALTH
// ============================================================

app.get("/", (req, res) => {

    res.json({

        status: "ok",

        service:
            "FAST IMU WebSocket Server",

        websocket:
            "/ws",

        redis_stream:
            FRAME_STREAM_NAME

    });

});


app.get("/health", (req, res) => {

    res.json({

        status: "ok",

        redis:
            redisClient.isReady,

        websocket_clients:
            wss.clients.size,

        redis_frames:
            redisFrames,

        websocket_frames:
            websocketFrames,

        skipped_old_frames:
            skippedOldFrames

    });

});


// ============================================================
// WEBSOCKET CONNECTION
// ============================================================

wss.on("connection", (ws, req) => {

    const clientIp =
        req.socket.remoteAddress ||
        "unknown";


    console.log(
        `WebSocket client connected: ${clientIp}`
    );


    ws.send(
        JSON.stringify({

            type: "connection",

            status: "connected",

            message:
                "Connected to IMU frame stream"

        })
    );


    ws.on("close", () => {

        console.log(
            `WebSocket client disconnected: ${clientIp}`
        );

    });


    ws.on("error", (error) => {

        console.error(
            "WebSocket client error:",
            error
        );

    });

});


// ============================================================
// BROADCAST ONLY NEWEST FRAME
// ============================================================

function broadcastLatestFrame(frame) {

    const message =
        JSON.stringify({

            type: "frame",

            data: frame

        });


    let sent = 0;


    wss.clients.forEach((ws) => {

        if (
            ws.readyState !==
            WebSocket.OPEN
        ) {
            return;
        }


        // ----------------------------------------------------
        // BACKPRESSURE
        // ----------------------------------------------------
        //
        // If browser is already behind, DO NOT add another
        // frame to its outgoing queue.
        //
        // This is critical for low latency.
        // ----------------------------------------------------

        if (
            ws.bufferedAmount > 64 * 1024
        ) {

            skippedOldFrames++;

            return;
        }


        try {

            ws.send(
                message
            );

            sent++;

            websocketFrames++;

        } catch (error) {

            console.error(
                "WebSocket send error:",
                error
            );

        }

    });


    return sent;
}


// ============================================================
// READ REDIS FRAMES
// ============================================================

async function readFrames() {

    console.log(
        `Waiting for Redis stream: ${FRAME_STREAM_NAME}`
    );


    /*
     * Start from newest frame.
     *
     * We don't want old frames after server startup.
     */

    let lastId = "$";


    while (true) {

        try {

            // ------------------------------------------------
            // Read Redis stream
            // ------------------------------------------------

            const result =
                await redisClient.xRead(

                    {
                        key:
                            FRAME_STREAM_NAME,

                        id:
                            lastId
                    },

                    {
                        BLOCK: 100,

                        COUNT: 100
                    }

                );


            if (!result) {

                continue;

            }


            // ------------------------------------------------
            // IMPORTANT:
            //
            // We do NOT immediately send every Redis frame.
            //
            // We first collect the newest frame.
            // ------------------------------------------------

            let newestFrame = null;


            for (
                const stream
                of result
            ) {

                for (
                    const entry
                    of stream.messages
                ) {

                    lastId =
                        entry.id;


                    redisFrames++;


                    const frameJson =
                        entry.message.frame;


                    if (!frameJson) {

                        continue;

                    }


                    try {

                        newestFrame =
                            JSON.parse(
                                frameJson
                            );

                    } catch (error) {

                        console.error(
                            "Invalid frame JSON:",
                            error
                        );

                    }

                }

            }


            // ------------------------------------------------
            // Nothing valid
            // ------------------------------------------------

            if (
                newestFrame === null
            ) {

                continue;

            }


            // ------------------------------------------------
            // SEND ONLY NEWEST FRAME
            // ------------------------------------------------

            broadcastLatestFrame(
                newestFrame
            );


            // ------------------------------------------------
            // Statistics
            // ------------------------------------------------

            printStats();

        } catch (error) {

            console.error(
                "Redis reader error:",
                error
            );


            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        50
                    )
            );

        }

    }

}


// ============================================================
// STATISTICS
// ============================================================

function printStats() {

    const now =
        Date.now();


    const elapsed =
        now -
        lastStatsTime;


    if (
        elapsed < 1000
    ) {

        return;

    }


    const seconds =
        elapsed / 1000;


    const redisFPS =
        redisFrames /
        seconds;


    const websocketFPS =
        websocketFrames /
        seconds;


    console.log(

        `REDIS IN: ${redisFPS.toFixed(1)} FPS | ` +

        `WS NEWEST: ${websocketFPS.toFixed(1)} sends/s | ` +

        `CLIENTS: ${wss.clients.size} | ` +

        `SKIPPED: ${skippedOldFrames}`

    );


    redisFrames = 0;

    websocketFrames = 0;

    skippedOldFrames = 0;

    lastStatsTime =
        now;

}


// ============================================================
// START SERVER
// ============================================================

async function startServer() {

    try {

        console.log(
            "===================================="
        );

        console.log(
            " FAST IMU WebSocket Server"
        );

        console.log(
            " LOW LATENCY MODE"
        );

        console.log(
            "===================================="
        );


        // ----------------------------------------------------
        // Redis
        // ----------------------------------------------------

        await redisClient.connect();


        console.log(
            `Redis: ${REDIS_HOST}:${REDIS_PORT}`
        );


        // ----------------------------------------------------
        // HTTP + WebSocket
        // ----------------------------------------------------

        server.listen(
            PORT,
            "0.0.0.0",
            () => {

                console.log(
                    `HTTP: http://0.0.0.0:${PORT}`
                );

                console.log(
                    `WebSocket: ws://0.0.0.0:${PORT}/ws`
                );

                console.log();

                console.log(
                    "Waiting for IMU frames..."
                );

            }
        );


        // ----------------------------------------------------
        // Start Redis reader
        // ----------------------------------------------------

        readFrames();

    } catch (error) {

        console.error(
            "Failed to start server:",
            error
        );

        process.exit(1);

    }

}


// ============================================================
// SHUTDOWN
// ============================================================

async function shutdown() {

    console.log();

    console.log(
        "Shutting down..."
    );


    try {

        if (
            redisClient.isOpen
        ) {

            await redisClient.quit();

        }

    } catch (error) {

        console.error(
            "Redis shutdown error:",
            error
        );

    }


    server.close(() => {

        console.log(
            "Server stopped"
        );

        process.exit(0);

    });

}


process.on(
    "SIGINT",
    shutdown
);

process.on(
    "SIGTERM",
    shutdown
);


// ============================================================
// RUN
// ============================================================

startServer();

