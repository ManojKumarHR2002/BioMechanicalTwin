/**
 * @file imuSocket.js
 * @description WebSocket Telemetry Streaming Service for IMU hardware sensors.
 * @module IMUSocketService
 *
 * Manages WebSocket connection lifecycle, automatic reconnection handling, real-time JSON
 * telemetry payload parsing, streaming FPS calculation, and listener callbacks.
 */

export class IMUSocketService {
  /**
   * Constructs the WebSocket streaming service.
   * @param {string} [url='ws://192.168.1.141:3000/ws'] - Target WebSocket endpoint URL.
   */
  constructor(url = 'ws://192.168.1.141:3000/ws') {
    this.url = url;
    this.socket = null;
    this.status = 'DISCONNECTED'; // 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'

    this.frameCount = 0;
    this.lastSecondFrames = 0;
    this.fps = 0;
    this.lastFrameTime = '-';
    this.latestFrame = null;
    this.sensors = {};

    // Callback event listeners
    this.onStatusChange = null;
    this.onFrameReceived = null;
    this.onFpsUpdate = null;

    this.reconnectTimer = null;
    this.fpsInterval = null;

    this.startFpsCounter();
  }

  /**
   * Sets a new WebSocket URL and initiates reconnection if modified.
   * @param {string} newUrl - New WebSocket endpoint URL string.
   */
  setUrl(newUrl) {
    if (this.url === newUrl && this.status === 'CONNECTED') return;
    this.url = newUrl;
    this.disconnect();
    this.connect();
  }

  /**
   * Establishes a WebSocket connection to the configured server endpoint.
   */
  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
      return;
    }

    this.updateStatus('CONNECTING');
    console.log('[IMUSocket] Connecting to:', this.url);

    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        console.log('[IMUSocket] Connected successfully');
        this.updateStatus('CONNECTED');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'connection') {
            console.log('[IMUSocket] Connection message:', message.message);
            return;
          }

          let frame = null;
          if (message.type === 'frame' && message.data) {
            frame = message.data;
          } else if (message.data) {
            frame = message.data;
          } else {
            frame = message;
          }

          this.frameCount++;
          this.lastSecondFrames++;
          this.lastFrameTime = frame.time || frame.timestamp || new Date().toISOString();
          this.latestFrame = frame;

          let sensors = frame.sensors || frame.sensorData || {};
          if ((!sensors || Object.keys(sensors).length === 0) && (frame.qw !== undefined || frame.w !== undefined || frame.ax !== undefined || frame.qx !== undefined)) {
            sensors = { Sensor1: frame };
          }

          this.sensors = sensors;

          // Dispatch frame to listener callback
          if (this.onFrameReceived) {
            this.onFrameReceived(frame, this.sensors);
          }
        } catch (err) {
          console.error('[IMUSocket] JSON parse error:', err);
        }
      };

      this.socket.onclose = () => {
        console.warn('[IMUSocket] Disconnected from server');
        this.updateStatus('DISCONNECTED');
        this.scheduleReconnect();
      };

      this.socket.onerror = (error) => {
        console.error('[IMUSocket] Connection error:', error);
      };
    } catch (err) {
      console.error('[IMUSocket] Connection setup failed:', err);
      this.updateStatus('DISCONNECTED');
      this.scheduleReconnect();
    }
  }

  /**
   * Schedules an automatic reconnection attempt after a brief delay.
   * @private
   */
  scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      console.log('[IMUSocket] Reconnecting...');
      this.connect();
    }, 2000);
  }

  /**
   * Closes active WebSocket connection and clears pending reconnection timers.
   */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.close();
      this.socket = null;
    }
    this.updateStatus('DISCONNECTED');
  }

  /**
   * Updates connection status state and triggers onStatusChange callback.
   * @param {'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'} newStatus - New status string.
   * @private
   */
  updateStatus(newStatus) {
    this.status = newStatus;
    if (this.onStatusChange) {
      this.onStatusChange(newStatus);
    }
  }

  /**
   * Starts a 1-second interval timer for calculating frame processing throughput (FPS).
   * @private
   */
  startFpsCounter() {
    this.fpsInterval = setInterval(() => {
      this.fps = this.lastSecondFrames;
      this.lastSecondFrames = 0;
      if (this.onFpsUpdate) {
        this.onFpsUpdate(this.fps);
      }
    }, 1000);
  }

  /**
   * Cleans up sockets and timers upon instance teardown.
   */
  destroy() {
    this.disconnect();
    if (this.fpsInterval) clearInterval(this.fpsInterval);
  }
}
