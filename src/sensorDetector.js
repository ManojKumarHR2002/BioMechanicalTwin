/**
 * SensorDetector
 * Calculates acceleration magnitude, angular velocity, jerk dynamics,
 * and detects physical shaking of IMU sensors in real-time.
 */
export class SensorDetector {
  constructor() {
    this.sensorStates = new Map(); // { [sensorName]: { accMag, gyroMag, intensity, isShaking, lastShakeTime, lastAcc } }
    this.shakeThresholdAcc = 3.5; // m/s^2 deviation from 1G (9.81)
    this.shakeThresholdGyro = 120; // deg/s
    this.cooldownMs = 1500; // Hold shake glow for 1.5 seconds

    this.onSensorUpdated = null;
    this.onSensorShaken = null;
    this.latestShakenSensor = null;
  }

  processSensorFrame(sensorName, data) {
    if (!data) return;

    // Extract acceleration components
    const ax = Number(data.ax ?? data.accX ?? (Array.isArray(data.acc) ? data.acc[0] : 0));
    const ay = Number(data.ay ?? data.accY ?? (Array.isArray(data.acc) ? data.acc[1] : 0));
    const az = Number(data.az ?? data.accZ ?? (Array.isArray(data.acc) ? data.acc[2] : 0));

    // Extract gyro components
    const gx = Number(data.gx ?? data.gyroX ?? (Array.isArray(data.gyro) ? data.gyro[0] : 0));
    const gy = Number(data.gy ?? data.gyroY ?? (Array.isArray(data.gyro) ? data.gyro[1] : 0));
    const gz = Number(data.gz ?? data.gyroZ ?? (Array.isArray(data.gyro) ? data.gyro[2] : 0));

    // Calculate magnitude
    const accMag = Math.sqrt(ax * ax + ay * ay + az * az);
    const gyroMag = Math.sqrt(gx * gx + gy * gy + gz * gz);

    // Deviation from gravity (9.81 m/s^2 or ~1.0 G)
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

    // Delta acceleration (jerk approximation)
    const deltaAcc = Math.abs(accMag - state.prevAccMag);
    state.prevAccMag = accMag;
    state.deltaAcc = deltaAcc;

    // Normalize intensity index [0..100%]
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
      // Cooldown timer: keep lit up for cooldownMs after shake stops
      if (now - state.lastShakeTime > this.cooldownMs) {
        state.isShaking = false;
      }
    }

    if (this.onSensorUpdated) {
      this.onSensorUpdated(this.sensorStates);
    }

    return state;
  }

  getSensorState(sensorName) {
    return this.sensorStates.get(sensorName);
  }

  getAllStates() {
    return Array.from(this.sensorStates.values());
  }
}
