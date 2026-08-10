# 🚀 Modern Three.js + Vite + Tailwind CSS v4 Template

A production-ready, interactive Three.js starter template designed for building modern 3D web applications, visualizers, interactive portfolio hero scenes, and WebGL experiences.

![Three.js Studio](https://threejs.org/files/favicon.ico)

## ✨ Features

- **⚡ Fast Development**: Built on [Vite](https://vitejs.dev/) for instant HMR and quick build outputs.
- **🎨 Tailwind CSS v4 Integration**: Uses `@tailwindcss/vite` for native Tailwind CSS v4 support with modern glassmorphism UI overlay.
- **💎 PBR Material System**: Dynamic `MeshPhysicalMaterial` featuring glass transmission, metalness, roughness, clearcoat, and shadow rendering.
- **💡 Studio 3-Point Lighting Rig**: Configured with Key SpotLight, Fill PointLight, Rim Light, shadow maps, and 4 pre-built lighting presets.
- **🌌 Particle Constellation Engine**: Procedural additive 3D particle background with gentle orbital animation.
- **🎥 OrbitControls**: Smooth camera navigation with damping and distance constraints.
- **⚙️ Real-time Inspector**: [lil-gui](https://lil-gui.georgealways.com/) integration for live tweaking of scene parameters.
- **📊 Performance Monitor**: Real-time FPS monitoring badge.

---

## 🛠️ Getting Started

### 1. Installation

Install all required dependencies:

```bash
npm install
```

### 2. Run Local Development Server

Start the local development server with instant live reloads:

```bash
npm run dev
```

Open your browser at `http://localhost:3000`.

### 3. Build for Production

Bundle the project into optimized static assets in `dist/`:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

---

## 📁 Project Structure

```
.
├── index.html                   # Main HTML entry with Tailwind CSS v4 HUD overlay
├── package.json                 # Project dependencies and npm scripts
├── vite.config.js               # Vite configuration with @tailwindcss/vite plugin
├── src/
│   ├── main.js                  # Application entry point
│   ├── scene.js                 # Core SceneManager class (Renderer, Camera, Loop)
│   ├── style.css                # Tailwind CSS v4 styles & glassmorphism utilities
│   ├── ui.js                    # HUD event listeners & lil-gui inspector setup
│   └── components/
│       ├── heroObject.js        # Dynamic 3D centerpiece mesh & shadow floor plane
│       ├── lights.js            # 3-point studio lighting setup & presets
│       └── particles.js         # 3D particle constellation background
└── README.md                    # Project documentation
```

---

## 💡 How to Customize & Extend

1. **Add Custom 3D Models (GLTF/GLB)**:
   Use Three.js `GLTFLoader` inside a new component in `src/components/` to load your 3D assets:
   ```javascript
   import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
   const loader = new GLTFLoader();
   loader.load('/path/to/model.glb', (gltf) => {
     scene.add(gltf.scene);
   });
   ```

2. **Customize UI Overlay**:
   Edit `index.html` using Tailwind CSS v4 utility classes to fit your project theme or branding.

3. **Add Custom Post-Processing Shaders**:
   Import `EffectComposer`, `RenderPass`, and `UnrealBloomPass` from `three/examples/jsm/postprocessing/` in `src/scene.js`.

---

## 📄 License

MIT License. Free for commercial and personal projects.
