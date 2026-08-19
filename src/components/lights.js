/**
 * @file lights.js
 * @description Professional Studio 3-Point Lighting Rig for Three.js.
 * @module LightSetup
 *
 * Configures Hemisphere Light (ambient contrast), Directional Key Light (shadow caster),
 * Directional Fill Light (shadow softener), Point Rim Light (silhouette kicker), and lighting presets.
 */

import * as THREE from 'three';

/**
 * Manages studio 3-point lighting environment, shadows, and dynamic rim movement.
 */
export class LightSetup {
  /**
   * Constructs the LightSetup instance.
   * @param {THREE.Scene} scene - Parent Three.js Scene object.
   */
  constructor(scene) {
    this.scene = scene;

    // Ambient / Hemisphere Light (Soft sky/ground baseline contrast)
    this.ambientLight = new THREE.HemisphereLight(0xffffff, 0x1e1e2e, 0.6);
    this.scene.add(this.ambientLight);

    // 1. KEY LIGHT: Primary High-Intensity Directional Light (Front Right Shadow Caster)
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

    // 2. FILL LIGHT: Secondary Soft Cool Directional Fill Light (Front Left)
    this.fillLight = new THREE.DirectionalLight(0x818cf8, 1.2);
    this.fillLight.position.set(-6, 4, 4);
    this.scene.add(this.fillLight);

    // 3. RIM LIGHT: High-Back Point Kicker Light (Silhouette Highlights)
    this.rimLight = new THREE.PointLight(0x38bdf8, 4.0, 20);
    this.rimLight.position.set(0, 6, -5);
    this.scene.add(this.rimLight);

    // Helper group
    this.lightGroup = new THREE.Group();
    this.scene.add(this.lightGroup);
  }

  /**
   * Applies a lighting environment preset configuration.
   * @param {'Studio Neutral' | 'Cyberpunk Neon' | 'Warm Sunset'} presetName - Preset identifier.
   */
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

  /**
   * Per-frame dynamic light animation update.
   * @param {number} time - Elapsed time in seconds.
   */
  update(time) {
    // Animated orbital motion for rim light to produce dynamic specular highlights
    this.rimLight.position.x = Math.sin(time * 0.4) * 4;
    this.rimLight.position.z = Math.cos(time * 0.4) * 4 - 4;
  }
}
