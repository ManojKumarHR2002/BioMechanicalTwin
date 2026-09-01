# BioMechanicalTwin

A real-time 3D motion-capture visualizer that runs entirely in the browser. Physical IMU (Inertial Measurement Unit) sensors attached to a person's body stream orientation and motion data over Wi-Fi, and the application mirrors those movements on a rigged 3D human avatar.

## Overview

BioMechanicalTwin acts as a **digital twin** of a human body:

1. IMU sensors measure acceleration and rotation.
2. Sensor fusion produces 3D orientation quaternions.
3. Sensor data is streamed over Wi-Fi to a WebSocket server.
4. The browser receives and normalizes the sensor frames.
5. Sensor orientations are mapped to Mixamo avatar bones.
6. Three.js smoothly interpolates the rotations and renders the animated avatar in real time.

Typical sensor streaming is approximately **30–100 frames/second**, while the 3D rendering loop runs at approximately **60 FPS**.

### Potential use cases

- Sports biomechanics and movement analysis
- Physical therapy and rehabilitation monitoring
- Motion capture for character animation
- Ergonomics and posture research
- Robotics and exoskeleton research

## Architecture

```text
┌──────────────────────────────┐
│       Physical IMU Sensors   │
│  Accelerometer + Gyroscope   │
│  Sensor Fusion → Quaternion  │
└──────────────┬───────────────┘
               │ Wi-Fi
               ▼
┌──────────────────────────────┐
│      WebSocket Server        │
│  Raspberry Pi / PC / Server  │
└──────────────┬───────────────┘
               │ JSON frames
               ▼
┌──────────────────────────────┐
│        imuSocket.js          │
│ WebSocket connection + FPS   │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│           ui.js              │
│ Normalize + distribute data  │
└───────┬────────┬─────────────┘
        │        │
        │        └─────────────────────┐
        ▼                              ▼
┌───────────────┐              ┌──────────────────┐
│   imuCube.js  │              │ humanModel.js    │
│ Sensor cubes  │              │ Avatar skeleton  │
└───────────────┘              └──────────────────┘
        │                              │
        └──────────────┬───────────────┘
                       ▼
              ┌──────────────────┐
              │    scene.js      │
              │  ~60 FPS render  │
              └────────┬─────────┘
                       ▼
                3D Avatar View
```

A parallel `sensorDetector.js` pipeline analyzes acceleration and gyroscope data and feeds live activity indicators to the calibration interface.

## Features

- Real-time IMU streaming over WebSocket
- 3D Mixamo/FBX human avatar
- Real-time bone rotation from sensor quaternions
- Visual 3D IMU sensor cubes
- Zero/reference calibration
- Sensor-to-bone mapping
- Interactive calibration page
- Automatic bone-mapping suggestions from sensor names
- Live acceleration/activity gauges
- Sensor telemetry HUD
- Raw JSON data viewer
- Upload support for custom FBX models
- Configurable IMU/world-axis mappings
- Smooth quaternion interpolation with Slerp
- Persistent settings using browser `localStorage`
- Three-point studio lighting
- Camera orbit controls and orientation gizmo
- Optional skeleton wireframe
- Automatic WebSocket reconnection

## Tech Stack

| Technology | Purpose |
|---|---|
| JavaScript | Application logic |
| Three.js `v0.173` | 3D rendering, scene graph, FBX loading |
| Vite | Development server and production bundling |
| Tailwind CSS | HUD/UI styling |
| lil-gui `v0.20` | Debug/control panel |
| WebGL | Browser GPU-accelerated rendering |
| WebSocket | Real-time sensor communication |
| localStorage | Persistent application settings |
| FBX / Mixamo | Rigged 3D human model |

## Project Structure

```text
BioMechanicalTwin/
├── index.html
├── package.json
├── vite.config.js
│
├── public/
│   ├── T-Pose.fbx
│   ├── boneMapping.json
│   ├── Explaining.txt
│   └── README.md
│
└── src/
    ├── main.js
    ├── scene.js
    ├── ui.js
    ├── imuSocket.js
    ├── sensorDetector.js
    ├── stateSaveManager.js
    ├── axisConfig.js
    ├── style.css
    │
    ├── components/
    │   ├── humanModel.js
    │   ├── imuCube.js
    │   ├── lights.js
    │   ├── heroObject.js
    │   └── particles.js
    │
    └── pages/
        └── calibrationPage.js
```

## Getting Started

### Prerequisites

You need:

- Node.js and npm
- A modern browser with WebGL support
- An available WebSocket sensor server
- IMU hardware capable of providing acceleration, gyroscope, and/or orientation data

### Install

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

Vite starts the application with hot reload.

### Build for production

```bash
npm run build
```

### Preview the production build

```bash
npm run preview
```

## Sensor WebSocket Connection

The default WebSocket endpoint is:

```text
ws://192.168.1.144:3000/ws
```

The application exposes the WebSocket URL in the UI, so the address can be changed without modifying the source.

When the connection closes, the application automatically attempts to reconnect after **2 seconds** and continues retrying until the server becomes available.

### Expected sensor data

The application accepts several JSON layouts and normalizes them internally.

Example:

```json
{
  "type": "frame",
  "data": {
    "sensors": {
      "Sensor1": {
        "qw": 0.99,
        "qx": 0.01,
        "qy": 0.05,
        "qz": 0.02,
        "ax": 0.1,
        "ay": 9.8,
        "az": 0.3,
        "gx": 0.5,
        "gy": 1.2,
        "gz": 0.3
      }
    }
  }
}
```

The receiver also supports:

```json
{
  "sensors": {
    "Sensor1": {
      "qw": 1,
      "qx": 0,
      "qy": 0,
      "qz": 0
    }
  }
}
```

and a single-sensor frame containing fields such as `qw`, `qx`, `qy`, `qz`, `ax`, `ay`, and `az`.

The UI also accepts common field aliases such as:

- `ax` / `accX` / `acc[0]`
- `gx` / `gyroX` / `gyro[0]`
- `qw` / `w` / `q0`
- `qx` / `x` / `q1`
- `qy` / `y` / `q2`
- `qz` / `z` / `q3`

## Default Sensor Mapping

The fallback `public/boneMapping.json` maps the default seven sensors as follows:

| Sensor | Avatar Bone | Body Part |
|---|---|---|
| Sensor1 | `RightForeArm` | Right forearm |
| Sensor2 | `RightArm` | Right upper arm |
| Sensor3 | `LeftForeArm` | Left forearm |
| Sensor4 | `LeftArm` | Left upper arm |
| Sensor5 | `Spine2` | Chest / upper spine |
| Sensor6 | `RightLeg` | Right shin |
| Sensor7 | `LeftLeg` | Left shin |

The saved mapping in browser `localStorage` takes priority once the user has customized the configuration.

## Calibration

### Zero Calibration

Zero calibration records the current orientation of each sensor as its reference pose.

The calibrated orientation is calculated as:

```text
targetQuat = inverse(zeroQuat) * currentRawQuat
```

A typical workflow is:

1. Attach the sensors to the body.
2. Put the person/model in a T-pose.
3. Press **Zero Calibration**.
4. Move normally.

This allows sensors to be physically attached in different orientations while still establishing the current pose as the reference.

### Sensor-to-Bone Calibration

The Calibration page provides:

- A live list of active sensors
- Sensor status indicators
- Bone-selection dropdowns
- Live acceleration gauges
- A sensor targeting system
- An interactive SVG body diagram
- A 20-bone quick selector
- Save, load, and reset controls

The calibration page can also suggest mappings when sensor names contain anatomical hints, for example:

```text
R_FA / RIGHTFOREARM → RightForeArm
L_ARM / LEFTARM     → LeftArm
CHEST / SPINE2      → Spine2
```

## Coordinate Systems

IMU hardware axes depend on how the sensor is mounted. `axisConfig.js` converts sensor coordinates into the application's Three.js world coordinates.

Built-in presets include:

| Preset | Mapping |
|---|---|
| Standard (Three.js) | `+X→+X`, `+Y→+Y`, `+Z→+Z` |
| Z-Up (ROS/Unreal Engine) | `+X→+X`, `+Y→+Z`, `+Z→-Y` |
| Unity (Inverted Z) | `+X→+X`, `+Y→+Y`, `+Z→-Z` |
| Aircraft (NED) | `+X→+Y`, `+Y→-Z`, `+Z→+X` |

Custom axis mappings are also supported.

## Core Components

### `src/main.js`

Application entry point.

It initializes the major systems in order:

1. `SceneManager`
2. `LightSetup`
3. `IMUCubeManager`
4. `HumanModelManager`
5. Per-frame update callbacks
6. `IMUSocketService`
7. `UIManager`

It also starts the WebSocket connection and loads saved state.

### `src/scene.js`

Owns the Three.js rendering engine:

- WebGL renderer
- Perspective camera
- OrbitControls
- ViewHelper orientation gizmo
- World axes
- Ground plane
- Grid
- Animation loop
- Resize handling

The animation loop runs at approximately 60 FPS.

### `src/ui.js`

Acts as the master UI controller.

Responsibilities include:

- HUD updates
- Connection status
- Sensor telemetry
- Button/event handling
- Page navigation
- Bone mapping modal
- JSON viewer
- Debug controls
- Calibration page integration
- State restoration

The `onFrameReceived` handler is the main data-distribution path. It normalizes incoming frames and forwards each sensor to the cube, avatar, and motion-analysis pipelines.

### `src/imuSocket.js`

Handles the persistent WebSocket connection.

Responsibilities:

- Connect/disconnect
- JSON parsing
- Frame counting
- FPS calculation
- Connection status
- Automatic reconnect
- Sensor extraction

### `src/sensorDetector.js`

Analyzes motion intensity and detects shaking.

It calculates:

```text
accMag  = sqrt(ax² + ay² + az²)
gyroMag = sqrt(gx² + gy² + gz²)
accDev  = |accMag - gravity_reference|
deltaAcc = |accMag - previousAccMag|
```

The activity intensity is calculated as:

```text
intensity = min(
  100,
  round(accDev * 12 + gyroMag * 0.3 + deltaAcc * 15)
)
```

A sensor is considered triggered when:

```text
accDev > 3.5
OR
gyroMag > 120
OR
deltaAcc > 2.2
```

A **1500 ms cooldown** keeps the shaking indicator from rapidly flickering after motion stops.

### `src/stateSaveManager.js`

Persists user settings in browser `localStorage`.

Saved values include:

- Sensor-to-bone mapping
- WebSocket URL
- Avatar visibility
- Sensor cube visibility
- Skeleton visibility

Current storage key:

```text
biomechanical_twin_app_state
```

Legacy key retained for compatibility:

```text
biomechanical_twin_bone_mapping
```

### `src/axisConfig.js`

Remaps sensor quaternion components to the active world coordinate system and returns a normalized Three.js quaternion.

### `src/components/humanModel.js`

Loads and manages the rigged FBX avatar.

Responsibilities:

- FBX loading
- Model scaling to approximately 1.8 m
- T-pose/rest-pose storage
- Mixamo bone lookup
- Sensor-to-bone mapping
- Zero calibration
- Bone interpolation
- Skeleton visualization
- Attached sensor indicators
- Custom FBX uploads

The avatar uses 20 friendly Mixamo bone names:

```text
Hips
Spine
Spine1
Spine2
Neck
Head
LeftShoulder
LeftArm
LeftForeArm
LeftHand
RightShoulder
RightArm
RightForeArm
RightHand
LeftUpLeg
LeftLeg
LeftFoot
RightUpLeg
RightLeg
RightFoot
```

### `src/components/imuCube.js`

Creates one 3D cube for each active sensor.

The cube visually communicates the sensor's coordinate axes:

```text
+X → Red
+Y → Green
+Z → Blue
```

The cube orientation is smoothed with Slerp, and position can optionally respond to Y-axis acceleration.

Invalid or zero-length quaternions are rejected before normalization to prevent `NaN` rotations.

### `src/components/lights.js`

Provides a three-point studio lighting system:

- Ambient/hemisphere light
- Key light
- Fill light
- Rim/kicker light

Available lighting presets:

- Studio Neutral
- Cyberpunk Neon
- Warm Sunset

The rim light continuously orbits the avatar to create dynamic edge highlights.

### `src/pages/calibrationPage.js`

Provides the full sensor mapping interface.

The page combines:

- Sensor cards
- Live motion gauges
- Body SVG
- Bone buttons
- Mapping controls
- Auto-detection
- Save/load/reset state

### `src/components/heroObject.js`

A decorative rotating 3D object component. It is **not part of the current main application flow** and is not instantiated by `main.js`.

### `src/components/particles.js`

A decorative particle constellation. It is also **not part of the current `main.js` flow**.

It creates 800 particles in a spherical shell around the scene and slowly rotates them.

## Real-Time Data Flow

The complete runtime pipeline is:

```text
1. IMU hardware
   │
   ├── Accelerometer
   ├── Gyroscope
   └── Sensor fusion → quaternion
   │
2. Wi-Fi
   │
3. WebSocket server
   │
4. IMUSocketService
   │
   └── Receives JSON frame
        │
5. UIManager.onFrameReceived()
   │
   ├── Normalize sensor format
   ├── Update HUD
   └── Fan out per sensor
        │
        ├───────────────┬─────────────────────┐
        ▼               ▼                     ▼
   IMUCubeManager  HumanModelManager   SensorDetector
        │               │                     │
        │               │                     └── Calibration UI
        │               │
        └───────┬───────┘
                ▼
        SceneManager.animate()
                │
                ├── Slerp rotations
                ├── Update bones
                ├── Update cubes
                └── Render Three.js scene
                │
                ▼
           Moving 3D avatar
```

## Avatar Rotation Pipeline

Sensor quaternions are first transformed into the configured world coordinate system.

Then zero calibration is applied:

```text
calibrated = inverse(zero) * raw
```

The current quaternion is smoothly interpolated toward the target:

```text
currentQuat.slerp(targetQuat, slerpFactor)
```

The avatar stores bones in a hierarchy, so bones require **local-space** rotations while sensors provide **world-space** rotations.

The conversion is:

```text
localQuat = inverse(parentWorldQuat) * worldQuat
```

For a root bone without a parent, the world and local rotations are equivalent.

Before applying mapped sensor rotations, the avatar bones are reset to their stored T-pose quaternions. This keeps unmapped bones in their natural rest positions.

## Rendering

The Three.js scene includes:

- Perspective camera
- Orbit controls with damping
- Ground plane
- Grid
- World axes helper
- View orientation helper
- Soft shadows
- ACES Filmic tone mapping
- Pixel ratio capped at 2x
- Three-point lighting

The camera starts at approximately:

```text
(0, 2.5, 6.5)
```

with a 50° field of view.

## Persistent State

The application stores user configuration locally in the browser, including:

```json
{
  "version": "...",
  "timestamp": "...",
  "sensorBoneMap": {},
  "wsUrl": "ws://192.168.1.144:3000/ws",
  "isModelVisible": true,
  "isCubesVisible": true,
  "showSkeleton": false
}
```

Resetting the application state removes the current and legacy storage keys and clears sensor-to-bone assignments.

## Key Concepts

### IMU

An **Inertial Measurement Unit** combines a 3-axis accelerometer and a 3-axis gyroscope.

### Quaternion

A quaternion uses four values (`qw`, `qx`, `qy`, `qz`) to represent 3D rotation without the gimbal-lock problems associated with Euler angles.

The identity quaternion is:

```text
qw = 1
qx = 0
qy = 0
qz = 0
```

### Slerp

**Spherical Linear Interpolation** smoothly interpolates between quaternion orientations.

With a factor of `0.25`, the current orientation moves 25% of the remaining distance toward the target on each frame.

### T-Pose

The avatar's standard rest pose: standing upright with the arms extended horizontally.

### WebSocket

A persistent, full-duplex connection that allows the sensor server to continuously push real-time data to the browser.

### localStorage

Browser storage used to preserve mappings and UI settings between sessions.

### Three.js

The core 3D rendering library used to manage the scene, camera, meshes, materials, bones, lighting, and GPU rendering.

### WebGL

The browser API used by Three.js for GPU-accelerated 3D rendering.

### Lerp / Slerp

- **Lerp:** Linear interpolation for scalar/vector values.
- **Slerp:** Spherical interpolation for rotations represented by quaternions.

### PBR

**Physically Based Rendering** simulates how light interacts with real materials using parameters such as metalness and roughness.

## Notes

- The default WebSocket address is a local-network address and should be changed to match the actual sensor server.
- `public/boneMapping.json` is a fallback mapping; saved browser state takes priority.
- The default avatar is a Mixamo-rigged FBX T-pose model.
- `heroObject.js` and `particles.js` are currently decorative/legacy components and are not instantiated by `main.js`.
- Sensor input can be supplied in multiple JSON formats; the application normalizes them before processing.

## Available Commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Project Status

BioMechanicalTwin is a browser-based real-time biomechanics visualization system combining physical IMU sensors, WebSocket streaming, quaternion-based orientation tracking, and Three.js skeletal animation.
