/**
 * @file main.js
 * @description Main application entry point for the BioMechanicalTwin 3D IMU & Kinematic Visualizer.
 * @module Main
 *
 * Bootstraps the WebGL SceneManager, studio lighting, IMUCubeManager, HumanModelManager,
 * WebSocket telemetry stream service (IMUSocketService), and UIManager controller.
 */

import './style.css';
import { SceneManager } from './scene.js';
import { LightSetup } from './components/lights.js';
import { IMUCubeManager } from './components/imuCube.js';
import { HumanModelManager } from './components/humanModel.js';
import { IMUSocketService } from './imuSocket.js';
import { UIManager } from './ui.js';

/**
 * Executes application initialization once the DOM content is fully loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.querySelector('#webgl');
  if (!canvas) {
    console.error('[main.js] WebGL canvas element (#webgl) not found in DOM.');
    return;
  }

  // 1. Initialize Core 3D Scene Engine (Renderer, Camera, OrbitControls, Resize Listener)
  const sceneManager = new SceneManager(canvas);

  // 2. Initialize Studio 3-Point Lighting Rig
  const lights = new LightSetup(sceneManager.scene);

  // 3. Initialize 3D IMU Sensor Cube Mesh Manager
  const imuManager = new IMUCubeManager(sceneManager.scene);

  // 4. Initialize 3D Rigged Mixamo FBX Human Model Manager
  const humanModelManager = new HumanModelManager(sceneManager.scene);

  // 5. Register per-frame update callbacks with SceneManager animation loop
  sceneManager.addUpdateCallback((time, delta) => {
    imuManager.update(time, delta);
    humanModelManager.update(time, delta);
    lights.update(time);
  });

  // 6. Initialize Real-Time IMU WebSocket Telemetry Service
  const socketService = new IMUSocketService('ws://192.168.1.144:3000/ws');
  socketService.connect();

  // 7. Initialize UI Controller (HUD, Navigation, Kinematic Mapping Hub, State Preservation)
  new UIManager(sceneManager, imuManager, humanModelManager, socketService, lights);

  console.log('🚀 BioMechanicalTwin - 3D Visualizer & Kinematic Mapping Engine Initialized!');
});
