/**
 * @file particles.js
 * @description Procedural 3D Particle Constellation Background.
 * @module ParticleConstellation
 *
 * Generates a spherical particle field with additive color blending, variable sizes,
 * and slow orbital motion to create ambient depth in the 3D viewport.
 */

import * as THREE from 'three';

/**
 * Manages procedural 3D particle background field.
 */
export class ParticleConstellation {
  /**
   * Constructs the ParticleConstellation instance.
   * @param {THREE.Scene} scene - Parent Three.js Scene object.
   * @param {number} [count=800] - Total particle count.
   */
  constructor(scene, count = 800) {
    this.scene = scene;
    this.count = count;

    this.init();
  }

  /**
   * Initializes particle BufferGeometry, color palette, and PointsMaterial.
   * @private
   */
  init() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.count * 3);
    const colors = new Float32Array(this.count * 3);
    const scales = new Float32Array(this.count);

    const palette = [
      new THREE.Color(0x6366f1), // Indigo
      new THREE.Color(0x06b6d4), // Cyan
      new THREE.Color(0xe879f9), // Pink
      new THREE.Color(0xffffff), // White
    ];

    for (let i = 0; i < this.count; i++) {
      // Random position in spherical distribution
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 8 + Math.random() * 18;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Random color assignment
      const col = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      scales[i] = Math.random() * 1.5 + 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

    // Particle Material
    const material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(geometry, material);
    this.scene.add(this.points);
  }

  /**
   * Per-frame update for gentle orbital rotation.
   * @param {number} time - Elapsed time in seconds.
   */
  update(time) {
    if (this.points) {
      // Gentle orbital rotation
      this.points.rotation.y = time * 0.03;
      this.points.rotation.x = Math.sin(time * 0.02) * 0.05;
    }
  }
}
