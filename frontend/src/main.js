import './style.css';
import { SceneManager } from './scene.js';
import { LightSetup } from './components/lights.js';
import { IMUCubeManager } from './components/imuCube.js';
import { IMUSocketService } from './imuSocket.js';
import { UIManager } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.querySelector('#webgl');
  if (!canvas) return;

  // Initialize Core 3D Scene Engine
  const sceneManager = new SceneManager(canvas);

  // Initialize Studio Lighting
  const lights = new LightSetup(sceneManager.scene);

  // Initialize 3D IMU Sensor Cube Manager
  const imuManager = new IMUCubeManager(sceneManager.scene);

  // Register animation hooks
  sceneManager.addUpdateCallback((time, delta) => {
    imuManager.update(time, delta);
    lights.update(time);
  });

  // Initialize IMU WebSocket Service
  const socketService = new IMUSocketService('ws://192.168.1.144:3000/ws');
  socketService.connect();

  // Initialize UI Controller
  new UIManager(sceneManager, imuManager, socketService);

  console.log('🚀 IMU 3D Realtime Visualizer Initialized!');
});
