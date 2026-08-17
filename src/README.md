# 💻 Source Code Directory (`/src`)

This directory contains the primary JavaScript source code, core execution managers, WebSocket services, UI handlers, and component modules for the BioMechanicalTwin visualizer.

## 📁 Subdirectories

- 🧩 [**`components/`**](./components/README.md) - 3D scene elements, FBX human model manager, IMU cubes, lighting, and particles.
- 🖥️ [**`pages/`**](./pages/README.md) - Full-screen application views (Sensor-to-Bone Kinematic Mapping Hub).

## 📄 Core Scripts & Modules Summary

| File / Script | Purpose & Description |
|---|---|
| [`main.js`](./main.js) | Application entry point. Bootstraps `SceneManager`, `IMUSocketService`, `UIManager`, `LightsManager`, and handles window resize events and main render loop. |
| [`scene.js`](./scene.js) | **`SceneManager`**: Configures the core Three.js environment, WebGL renderer, perspective camera, OrbitControls, and animation loop callbacks. |
| [`imuSocket.js`](./imuSocket.js) | **`IMUSocketService`**: Handles WebSocket connections, auto-reconnection attempts, payload parsing, frame counters, and real-time FPS calculations. |
| [`sensorDetector.js`](./sensorDetector.js) | **`SensorDetector`**: Processes telemetry frames to compute acceleration magnitude ($m/s^2$), angular velocity ($deg/s$), jerk dynamics, and sensor motion intensity metrics. |
| [`ui.js`](./ui.js) | **`UIManager`**: Manages HUD elements, page navigation (3D Viewport ↔ Sensor Mapping Hub), visibility toggles, modal dialogs, and `lil-gui` controls. |
| [`axisConfig.js`](./axisConfig.js) | **`globalAxisConfig`**: Stores coordinate axis transformation definitions for mapping physical IMU sensor axes to standard Three.js world axes. |
| [`style.css`](./style.css) | Primary CSS styling file combining Tailwind CSS v4, custom glassmorphism utilities, glow effects, and typography overrides. |

---

⬅️ [Back to Root README](../README.md)
