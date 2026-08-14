import * as THREE from 'three';

export class AxisConfigManager {
  constructor() {
    this.preset = 'Standard (Three.js)';
    
    // Global Axis Mapping:
    // Controls how raw IMU (X, Y, Z) axes map to 3D World (X, Y, Z)
    this.axisX = '+X';
    this.axisY = '+Y';
    this.axisZ = '+Z';

    this.showWorldAxes = true;
    this.listeners = [];
  }

  onChange(fn) {
    this.listeners.push(fn);
  }

  notify() {
    for (const fn of this.listeners) {
      fn(this);
    }
  }

  setPreset(presetName) {
    this.preset = presetName;
    if (presetName === 'Standard (Three.js)') {
      this.axisX = '+X';
      this.axisY = '+Y';
      this.axisZ = '+Z';
    } else if (presetName === 'Z-Up (ROS/Unreal)') {
      this.axisX = '+X';
      this.axisY = '+Z';
      this.axisZ = '-Y';
    } else if (presetName === 'Unity (Inverted Z)') {
      this.axisX = '+X';
      this.axisY = '+Y';
      this.axisZ = '-Z';
    } else if (presetName === 'Aircraft (NED: North-East-Down)') {
      this.axisX = '+Y';
      this.axisY = '-Z';
      this.axisZ = '+X';
    }
    this.notify();
  }

  setCustomAxis(axis, targetVal) {
    this.preset = 'Custom';
    if (axis === 'X') this.axisX = targetVal;
    if (axis === 'Y') this.axisY = targetVal;
    if (axis === 'Z') this.axisZ = targetVal;
    this.notify();
  }

  transformQuaternion(qx, qy, qz, qw) {
    const rawMap = {
      X: qx,
      Y: qy,
      Z: qz,
    };

    const getVal = (axisStr) => {
      const sign = axisStr.startsWith('-') ? -1 : 1;
      const key = axisStr.replace(/^[+-]/, '');
      return (rawMap[key] !== undefined ? rawMap[key] : 0) * sign;
    };

    const outX = getVal(this.axisX);
    const outY = getVal(this.axisY);
    const outZ = getVal(this.axisZ);

    return new THREE.Quaternion(outX, outY, outZ, qw).normalize();
  }
}

export const globalAxisConfig = new AxisConfigManager();
