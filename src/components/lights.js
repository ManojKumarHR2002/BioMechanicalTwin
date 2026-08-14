import * as THREE from 'three';

/**
 * Professional Studio 3-Point Lighting Rig
 * Includes:
 * 1. Key Light (Main dominant directional/spot light with soft shadows)
 * 2. Fill Light (Opposite side fill light to soften dark shadows)
 * 3. Rim / Kicker Light (High back light to separate character silhouette from background)
 * 4. Ambient / Hemisphere Light (Soft environment baseline illumination)
 */
export class LightSetup {
  constructor(scene) {
    this.scene = scene;

    // Ambient / Hemisphere Light (Soft sky/ground baseline contrast)
    this.ambientLight = new THREE.HemisphereLight(0xffffff, 0x1e1e2e, 0.6);
    this.scene.add(this.ambientLight);

    // 1. KEY LIGHT: Primary High-Intensity Directional Spot (Front Right)
    this.keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    this.keyLight.position.set(5, 8, 5);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 2048;
    this.keyLight.shadow.mapSize.height = 2048;
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 25;
    this.keyLight.shadow.camera.left = -6;
    this.keyLight.shadow.camera.right = 6;
    this.keyLight.shadow.camera.top = 8;
    this.keyLight.shadow.camera.bottom = -2;
    this.keyLight.shadow.bias = -0.0005;
    this.scene.add(this.keyLight);

    // 2. FILL LIGHT: Secondary Soft Cool Fill (Front Left)
    this.fillLight = new THREE.DirectionalLight(0x818cf8, 1.2);
    this.fillLight.position.set(-6, 4, 4);
    this.scene.add(this.fillLight);

    // 3. RIM LIGHT: High-Back Kicker Light (Silhouette Highlights)
    this.rimLight = new THREE.PointLight(0x38bdf8, 4.0, 20);
    this.rimLight.position.set(0, 6, -5);
    this.scene.add(this.rimLight);

    // Helper lights group
    this.lightGroup = new THREE.Group();
    this.scene.add(this.lightGroup);
  }

  setPreset(presetName) {
    switch (presetName) {
      case 'Studio Neutral':
        this.ambientLight.color.setHex(0xffffff);
        this.ambientLight.groundColor.setHex(0x1e1e2e);
        this.ambientLight.intensity = 0.6;

        this.keyLight.color.setHex(0xffffff);
        this.keyLight.intensity = 2.5;

        this.fillLight.color.setHex(0x94a3b8);
        this.fillLight.intensity = 1.2;

        this.rimLight.color.setHex(0x38bdf8);
        this.rimLight.intensity = 3.5;
        break;

      case 'Cyberpunk Neon':
        this.ambientLight.color.setHex(0x0f172a);
        this.ambientLight.groundColor.setHex(0x020617);
        this.ambientLight.intensity = 0.4;

        this.keyLight.color.setHex(0x6366f1);
        this.keyLight.intensity = 3.2;

        this.fillLight.color.setHex(0x06b6d4);
        this.fillLight.intensity = 2.0;

        this.rimLight.color.setHex(0xf43f5e);
        this.rimLight.intensity = 5.0;
        break;

      case 'Warm Sunset':
        this.ambientLight.color.setHex(0x451a03);
        this.ambientLight.groundColor.setHex(0x1e1b4b);
        this.ambientLight.intensity = 0.5;

        this.keyLight.color.setHex(0xf59e0b);
        this.keyLight.intensity = 3.0;

        this.fillLight.color.setHex(0xef4444);
        this.fillLight.intensity = 1.5;

        this.rimLight.color.setHex(0xa855f7);
        this.rimLight.intensity = 4.0;
        break;
    }
  }

  update(time) {
    // Subtle animated movement of rim light to give dynamic depth
    this.rimLight.position.x = Math.sin(time * 0.4) * 4;
    this.rimLight.position.z = Math.cos(time * 0.4) * 4 - 4;
  }
}
