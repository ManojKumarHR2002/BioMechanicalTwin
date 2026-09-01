/**
 * @file sensorDetector.js
 * @description Sensor Dynamics & Motion Intensity Processing Engine.
 * @module SensorDetector
 *
 * Computes vector magnitudes for linear acceleration ($m/s^2$) and angular velocity ($deg/s$),
 * calculates jerk dynamics (delta acceleration), normalizes motion intensity indices, and tracks sensor activity states.
 */

export class SensorDetector {
  /**
   * Initializes the SensorDetector engine.
   */
  constructor() {
    /** @type {Map<string, Object>} Map storing real-time telemetry metrics per sensor */
    this.sensorStates = new Map();
    
    this.shakeThresholdAcc = 3.5; // m/s^2 deviation from 1G (9.81 m/s^2)
    this.shakeThresholdGyro = 120; // deg/s angular velocity
    this.cooldownMs = 1500; // Hold active glow state for 1.5 seconds after motion subsides

    /** @type {Function|null} Callback triggered when any sensor telemetry state updates */
    this.onSensorUpdated = null;
    /** @type {Function|null} Callback triggered when high dynamic motion is detected */
    this.onSensorShaken = null;
    /** @type {string|null} Name of the sensor with the most recent dynamic activity trigger */
    this.latestShakenSensor = null;
  }

  /**
   * Processes a telemetry frame payload for a specific sensor and updates calculated metrics.
   * @param {string} sensorName - Unique identifier string for the sensor (e.g. 'Sensor1').
   * @param {Object} data - Raw sensor telemetry data containing acceleration and gyroscope readings.
   * @returns {Object|undefined} Updated sensor metrics state object.
   */
  processSensorFrame(sensorName, data) {
    if (!data) return;

    // Extract acceleration vector components (support multiple payload key formats)
    const ax = Number(data.ax ?? data.accX ?? (Array.isArray(data.acc) ? data.acc[0] : 0));
    const ay = Number(data.ay ?? data.accY ?? (Array.isArray(data.acc) ? data.acc[1] : 0));
    const az = Number(data.az ?? data.accZ ?? (Array.isArray(data.acc) ? data.acc[2] : 0));

    // Extract angular velocity vector components
    const gx = Number(data.gx ?? data.gyroX ?? (Array.isArray(data.gyro) ? data.gyro[0] : 0));
    const gy = Number(data.gy ?? data.gyroY ?? (Array.isArray(data.gyro) ? data.gyro[1] : 0));
    const gz = Number(data.gz ?? data.gyroZ ?? (Array.isArray(data.gyro) ? data.gyro[2] : 0));

    // Compute Euclidean vector magnitudes
    const accMag = Math.sqrt(ax * ax + ay * ay + az * az);
    const gyroMag = Math.sqrt(gx * gx + gy * gy + gz * gz);

    // Compute deviation from standard gravity reference (9.81 m/s^2 or ~1.0 G)
    const accDev = Math.abs(accMag - (accMag > 4 ? 9.81 : 1.0));

    let state = this.sensorStates.get(sensorName);
    if (!state) {
      state = {
        name: sensorName,
        accMag: 0,
        gyroMag: 0,
        intensity: 0,
        isShaking: false,
        lastShakeTime: 0,
        prevAccMag: accMag,
        deltaAcc: 0,
      };
      this.sensorStates.set(sensorName, state);
    }

    // Compute delta acceleration (jerk approximation)
    const deltaAcc = Math.abs(accMag - state.prevAccMag);
    state.prevAccMag = accMag;
    state.deltaAcc = deltaAcc;

    // Calculate normalized motion intensity index [0..100%]
    const intensity = Math.min(100, Math.round((accDev * 12) + (gyroMag * 0.3) + (deltaAcc * 15)));
    state.intensity = intensity;
    state.accMag = accMag;
    state.gyroMag = gyroMag;

    const now = performance.now();
    const isTriggered = accDev > this.shakeThresholdAcc || gyroMag > this.shakeThresholdGyro || deltaAcc > 2.2;

    if (isTriggered) {
      state.lastShakeTime = now;
      if (!state.isShaking) {
        state.isShaking = true;
        this.latestShakenSensor = sensorName;
        if (this.onSensorShaken) {
          this.onSensorShaken(sensorName, intensity);
        }
      }
    } else {
      // Cooldown timer: hold active state for cooldownMs before clearing
      if (now - state.lastShakeTime > this.cooldownMs) {
        state.isShaking = false;
      }
    }

    // Trigger frame update callback
    if (this.onSensorUpdated) {
      this.onSensorUpdated(this.sensorStates);
    }

    return state;
  }

  /**
   * Retrieves the current metric state for a specific sensor.
   * @param {string} sensorName - Sensor identifier.
   * @returns {Object|undefined} Sensor state object if present.
   */
  getSensorState(sensorName) {
    return this.sensorStates.get(sensorName);
  }

  /**
   * Returns an array of all active sensor state objects.
   * @returns {Array<Object>} List of sensor state objects.
   */
  getAllStates() {
    return Array.from(this.sensorStates.values());
  }
}
