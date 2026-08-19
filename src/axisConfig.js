/**
 * @file axisConfig.js
 * @description Global Axis Mapping & Coordinate Transformation Configuration.
 * @module AxisConfigManager
 *
 * Configures how incoming physical hardware IMU axis channels (+X, -X, +Y, -Y, +Z, -Z)
 * map to standard Three.js WebGL world coordinate axes (+X Right, +Y Up, +Z Forward).
 * Includes coordinate presets for Three.js, ROS/Unreal (Z-Up), Unity (Inverted Z), and Aircraft (NED).
 */

import * as THREE from 'three';

/**
 * Manages coordinate system axis transformations and preset configurations.
 */
export class AxisConfigManager {
  /**
   * Constructs the AxisConfigManager instance.
   */
  constructor() {
    this.preset = 'Standard (Three.js)';
    
    // Global Axis Mapping Definition:
    // Determines how raw IMU (X, Y, Z) channels map to Three.js 3D World (X, Y, Z)
    this.axisX = '+X';
    this.axisY = '+Y';
    this.axisZ = '+Z';

    this.showWorldAxes = true;
    this.listeners = [];
  }

  /**
   * Registers a listener callback function triggered on axis configuration change.
   * @param {Function} fn - Callback function receiving (axisConfigInstance).
   */
  onChange(fn) {
    this.listeners.push(fn);
  }

  /**
   * Notifies all registered listener callbacks of configuration updates.
   * @private
   */
  notify() {
    for (const fn of this.listeners) {
      fn(this);
    }
  }

  /**
   * Sets a predefined coordinate system axis mapping preset.
   * @param {'Standard (Three.js)' | 'Z-Up (ROS/Unreal)' | 'Unity (Inverted Z)' | 'Aircraft (NED: North-East-Down)'} presetName - Preset name string.
   */
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

  /**
   * Configures a custom axis channel mapping for X, Y, or Z.
   * @param {'X' | 'Y' | 'Z'} axis - Target coordinate axis.
   * @param {string} targetVal - Channel string (e.g. '+X', '-Z').
   */
  setCustomAxis(axis, targetVal) {
    this.preset = 'Custom';
    if (axis === 'X') this.axisX = targetVal;
    if (axis === 'Y') this.axisY = targetVal;
    if (axis === 'Z') this.axisZ = targetVal;
    this.notify();
  }

  /**
   * Transforms raw IMU quaternion components based on active axis mapping configuration.
   * @param {number} qx - Raw quaternion X.
   * @param {number} qy - Raw quaternion Y.
   * @param {number} qz - Raw quaternion Z.
   * @param {number} qw - Raw quaternion W scalar.
   * @returns {THREE.Quaternion} Transformed & normalized Three.js Quaternion object.
   */
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

/** Global singleton instance of AxisConfigManager */
export const globalAxisConfig = new AxisConfigManager();
