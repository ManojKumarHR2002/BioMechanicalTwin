# 🦾 BioMechanicalTwin - 3D Real-time IMU Sensor Visualizer

A modern, high-performance **3D WebGL Real-time Visualizer and Telemetry Dashboard** for **Inertial Measurement Unit (IMU)** sensors and biomechanical twins. Built with **Three.js**, **Vite**, **Tailwind CSS v4**, and **WebSockets**.

It streams orientation quaternions and sensor dynamics from hardware IMU devices over WebSocket, rendering color-coded 3D sensor orientation models with real-time telemetry HUD overlays.

---

## ✨ Features

- 🧊 **Dynamic 3D IMU Representation**:
  - Color-coded sensor chassis (+X Red, +Y Green, +Z Blue) with microchip and LED status indicators.
  - Coordinate axis helper arrows for instant spatial visual identification.
  - Smooth orientation interpolation using Quaternion **Spherical Linear Interpolation (Slerp)**.
  - Multi-sensor auto-spacing support (renders and aligns multiple IMU nodes side-by-side).

- ⚡ **Real-Time WebSocket Engine**:
  - High-throughput JSON telemetry payload parsing.
  - Automatic reconnection handling with live status indicators.
  - Configurable server WebSocket URL directly from the header UI.
  - Live FPS counter, total frame count, active sensor count, and latency timestamps.

- 🎯 **Zero-Reference Calibration**:
  - One-click Tare/Zero Calibration to set reference zero orientation for single or multiple IMU sensors.

- 📊 **Glassmorphism HUD & Telemetry Dashboard**:
  - Built with **Tailwind CSS v4** and modern frosted glass visual design.
  - Live structured data table displaying Accelerometer ($a_x, a_y, a_z$), Gyroscope ($g_x, g_y, g_z$), and Quaternion ($q_w, q_x, q_y, q_z$) telemetry.
  - Collapsible bottom tray with raw JSON payload inspector.
  - Responsive layout optimized for desktop, tablet, and mobile viewing.

- ⚙️ **Interactive Control Panel (`lil-gui`)**:
  - Tweak Slerp smoothing factor in real-time.
  - Toggle accelerometer displacement position response.
  - Reset camera view and perform zero calibration.

---

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| **Build & Dev Tooling** | [Vite 6](https://vitejs.dev/) |
| **3D Rendering Engine** | [Three.js](https://threejs.org/) (WebGL, OrbitControls, Standard Materials) |
| **Styling System** | [Tailwind CSS v4](https://tailwindcss.com/) (`@tailwindcss/vite`) |
| **GUI Controls** | [lil-gui](https://lil-gui.georgealways.com/) |
| **Network Protocol** | Native WebSockets API (`IMUSocketService`) |

---

## 📡 WebSocket Telemetry Data Format

The application expects WebSocket JSON messages formatted as follows:

```json
{
  "type": "frame",
  "data": {
    "time": "2026-08-10T10:17:32.000Z",
    "sensors": {
      "Sensor1": {
        "ax": 0.02,
        "ay": 9.81,
        "az": 0.15,
        "gx": 0.01,
        "gy": -0.03,
        "gz": 0.00,
        "qw": 0.998,
        "qx": 0.012,
        "qy": -0.045,
        "qz": 0.030
      }
    }
  }
}
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` or `pnpm` / `yarn`

### 1. Installation

Install project dependencies:

```bash
npm install
```

### 2. Run Local Development Server

Start the Vite development server:

```bash
npm run dev
```

Open your browser at `http://localhost:3000`.

### 3. Connect to IMU WebSocket Server

1. Enter your WebSocket URL in the top-right header input field (e.g., `ws://192.168.1.144:3000/ws`).
2. Click **Connect**.
3. Observe the 3D IMU models update rotation and position in real-time as telemetry streams in.

### 4. Production Build

Bundle optimized static assets into `dist/`:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

---

## 📁 Project Structure & Directory Documentation

Detailed documentation for each project directory and script can be found in their respective README files:

| Directory | Description | Documentation Link |
|---|---|---|
| 💻 [**`src/`**](./src/README.md) | Application entry scripts, WebGL scene managers, WebSocket service, UI manager, axis config, and CSS styling. | 📄 [`src/README.md`](./src/README.md) |
| 🧩 [**`src/components/`**](./src/components/README.md) | Modular 3D scene elements including Mixamo FBX rigged mannequin, 3D IMU cubes, lighting rig, floor plane, and particle background. | 📄 [`src/components/README.md`](./src/components/README.md) |
| 🖥️ [**`src/pages/`**](./src/pages/README.md) | Application page views including the Sensor-to-Bone Kinematic Mapping Hub UI. | 📄 [`src/pages/README.md`](./src/pages/README.md) |
| 📂 [**`public/`**](./public/README.md) | Static assets including the Mixamo `T-Pose.fbx` 3D model and `boneMapping.json` configuration file. | 📄 [`public/README.md`](./public/README.md) |

```text
BioMechanicalTwin/
├── index.html                   # Main HTML entry with Tailwind CSS v4 HUD overlay
├── package.json                 # Dependencies & scripts
├── vite.config.js               # Vite configuration
├── README.md                    # Root documentation
├── public/                      # 📂 Static assets & models
│   ├── README.md                # 📄 Public directory documentation
│   ├── T-Pose.fbx               # 3D Mixamo mannequin model
│   └── boneMapping.json         # Default sensor-to-bone JSON mapping file
└── src/                         # 💻 Source application code
    ├── README.md                # 📄 Source directory documentation
    ├── main.js                  # Main application bootstrap script
    ├── scene.js                 # Three.js WebGL scene & camera manager
    ├── imuSocket.js             # WebSocket streaming service & FPS stats
    ├── sensorDetector.js        # IMU dynamics & motion intensity calculator
    ├── ui.js                    # UI Manager & lil-gui controls
    ├── axisConfig.js            # IMU axis transformation mapping
    ├── style.css                # Tailwind CSS v4 & custom glassmorphism styles
    ├── components/              # 🧩 3D scene components & mesh managers
    │   ├── README.md            # 📄 Components directory documentation
    │   ├── humanModel.js        # FBX mannequin bone kinematics manager
    │   ├── imuCube.js           # 3D IMU sensor cube mesh manager
    │   ├── heroObject.js        # Environment floor plane & showcase mesh
    │   ├── lights.js            # Studio 3-Point lighting rig
    │   └── particles.js         # 3D particle constellation background
    └── pages/                   # 🖥️ View pages
        ├── README.md            # 📄 Pages directory documentation
        └── calibrationPage.js   # Sensor-to-Bone Kinematic Mapping Hub UI
```

---

## 📄 License

MIT License - feel free to use and adapt for research, educational, and commercial projects.


