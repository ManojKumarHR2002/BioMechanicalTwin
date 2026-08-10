import * as THREE from 'three';

export class LightSetup {
  constructor(scene) {
    this.scene = scene;

    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    // Main Key SpotLight (casts shadows)
    this.keyLight = new THREE.SpotLight(0x6366f1, 5.0);
    this.keyLight.position.set(5, 8, 5);
    this.keyLight.angle = Math.PI / 4;
    this.keyLight.penumbra = 0.8;
    this.keyLight.decay = 1.5;
    this.keyLight.distance = 30;
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 2048;
    this.keyLight.shadow.mapSize.height = 2048;
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 25;
    this.keyLight.shadow.bias = -0.0001;
    this.scene.add(this.keyLight);

    // Secondary Fill Light (Cyan PointLight)
    this.fillLight = new THREE.PointLight(0x06b6d4, 3.5, 20);
    this.fillLight.position.set(-6, -2, -4);
    this.scene.add(this.fillLight);

    // Accent Rim Light (Pink/Purple)
    this.rimLight = new THREE.PointLight(0xe879f9, 4.0, 20);
    this.rimLight.position.set(0, 6, -6);
    this.scene.add(this.rimLight);
  }

  setPreset(presetName) {
    switch (presetName) {
      case 'Cyberpunk':
        this.ambientLight.color.setHex(0x0f172a);
        this.keyLight.color.setHex(0x6366f1);
        this.fillLight.color.setHex(0x06b6d4);
        this.rimLight.color.setHex(0xf43f5e);
        this.keyLight.intensity = 6.0;
        this.fillLight.intensity = 4.0;
        this.rimLight.intensity = 5.0;
        break;

      case 'Emerald Sky':
        this.ambientLight.color.setHex(0x064e3b);
        this.keyLight.color.setHex(0x10b981);
        this.fillLight.color.setHex(0x38bdf8);
        this.rimLight.color.setHex(0xa855f7);
        this.keyLight.intensity = 5.0;
        this.fillLight.intensity = 3.5;
        this.rimLight.intensity = 4.0;
        break;

      case 'Sunset Gold':
        this.ambientLight.color.setHex(0x451a03);
        this.keyLight.color.setHex(0xf59e0b);
        this.fillLight.color.setHex(0xef4444);
        this.rimLight.color.setHex(0x8b5cf6);
        this.keyLight.intensity = 5.5;
        this.fillLight.intensity = 4.0;
        this.rimLight.intensity = 4.5;
        break;

      case 'Minimal Studio':
        this.ambientLight.color.setHex(0xffffff);
        this.ambientLight.intensity = 0.8;
        this.keyLight.color.setHex(0xffffff);
        this.fillLight.color.setHex(0xe2e8f0);
        this.rimLight.color.setHex(0x94a3b8);
        this.keyLight.intensity = 3.0;
        this.fillLight.intensity = 1.5;
        this.rimLight.intensity = 2.0;
        break;
    }
  }

  update(time) {
    // Subtle dynamic orbit movement of rim light
    this.rimLight.position.x = Math.sin(time * 0.5) * 6;
    this.rimLight.position.z = Math.cos(time * 0.5) * 6 - 2;
  }
}
