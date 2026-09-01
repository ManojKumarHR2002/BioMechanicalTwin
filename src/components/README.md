# 🧩 3D Components Directory (`/src/components`)

This directory contains modular 3D visual components, mesh managers, lighting setups, and visual effects used within the Three.js viewport.

## 📄 Scripts & Components Summary

| Script / Component | Purpose & Responsibility |
|---|---|
| [`humanModel.js`](./humanModel.js) | **`HumanModelManager`**: Loads the Mixamo FBX rigged mannequin (`public/T-Pose.fbx`), parses skeletal bone hierarchies (`MIXAMO_BONES`), and applies incoming IMU sensor quaternion rotations to mapped bones with zero-tare offsets. |
| [`imuCube.js`](./imuCube.js) | **`IMUCubeManager`**: Builds 3D IMU sensor chassis meshes (+X Red, +Y Green, +Z Blue axis indicators, status microchip & LED) and handles Quaternion Slerp (Spherical Linear Interpolation) for smooth orientation updates. |
| [`heroObject.js`](./heroObject.js) | **`HeroObjectManager`**: Renders environmental geometry, decorative backdrop structures, and shadow-receiving floor planes for the 3D viewport scene. |
| [`lights.js`](./lights.js) | **`LightsManager`**: Configures a studio 3-point lighting setup (Ambient, Directional, Key light, Fill light) for realistic PBR materials, shadows, and metallic reflections. |
| [`particles.js`](./particles.js) | **`ParticleSystem`**: Generates a procedural 3D floating particle constellation background to provide spatial depth in the viewport. |

---

⬅️ [Back to src/ README](../README.md) \| 🏠 [Back to Root README](../../README.md)
