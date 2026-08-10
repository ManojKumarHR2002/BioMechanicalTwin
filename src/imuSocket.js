/**
 * IMU WebSocket Service
 * Handles WebSocket connection to IMU sensor server, auto-reconnecting,
 * frame counting, FPS calculation, and broadcasting frame data to listeners.
 */
export class IMUSocketService {
  constructor(url = 'ws://192.168.1.144:3000/ws') {
    this.url = url;
    this.socket = null;
    this.status = 'DISCONNECTED'; // 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'
    
    this.frameCount = 0;
    this.lastSecondFrames = 0;
    this.fps = 0;
    this.lastFrameTime = '-';
    this.latestFrame = null;
    this.sensors = {};

    this.onStatusChange = null;
    this.onFrameReceived = null;
    this.onFpsUpdate = null;

    this.reconnectTimer = null;
    this.fpsInterval = null;

    this.startFpsCounter();
  }

  setUrl(newUrl) {
    if (this.url === newUrl && this.status === 'CONNECTED') return;
    this.url = newUrl;
    this.disconnect();
    this.connect();
  }

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
      return;
    }

    this.updateStatus('CONNECTING');
    console.log('[IMUSocket] Connecting to:', this.url);

    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        console.log('[IMUSocket] Connected');
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
            console.log('[IMUSocket] Connection msg:', message.message);
            return;
          }

          if (message.type !== 'frame') return;

          const frame = message.data;
          this.frameCount++;
          this.lastSecondFrames++;
          this.lastFrameTime = frame.time || new Date().toISOString();
          this.latestFrame = frame;
          this.sensors = frame.sensors || {};

          if (this.onFrameReceived) {
            this.onFrameReceived(frame, this.sensors);
          }
        } catch (err) {
          console.error('[IMUSocket] JSON parse error:', err);
        }
      };

      this.socket.onclose = () => {
        console.warn('[IMUSocket] Disconnected');
        this.updateStatus('DISCONNECTED');
        this.scheduleReconnect();
      };

      this.socket.onerror = (error) => {
        console.error('[IMUSocket] Error:', error);
      };
    } catch (err) {
      console.error('[IMUSocket] Connection failed:', err);
      this.updateStatus('DISCONNECTED');
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      console.log('[IMUSocket] Reconnecting...');
      this.connect();
    }, 2000);
  }

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

  updateStatus(newStatus) {
    this.status = newStatus;
    if (this.onStatusChange) {
      this.onStatusChange(newStatus);
    }
  }

  startFpsCounter() {
    this.fpsInterval = setInterval(() => {
      this.fps = this.lastSecondFrames;
      this.lastSecondFrames = 0;
      if (this.onFpsUpdate) {
        this.onFpsUpdate(this.fps);
      }
    }, 1000);
  }

  destroy() {
    this.disconnect();
    if (this.fpsInterval) clearInterval(this.fpsInterval);
  }
}
