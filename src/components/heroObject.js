/**
 * @file heroObject.js
 * @description Showcase Hero Object Mesh & Environment Floor plane manager.
 * @module HeroObject
 *
 * Renders procedural 3D centerpiece geometry (TorusKnot, Icosahedron, Dodecahedron) with
 * PBR physical materials, wireframe cages, floating bobbing animation, and ground shadow planes.
 */

import * as THREE from 'three';

/**
 * Manages showcase hero object meshes and environment backdrop geometry.
 */
export class HeroObject {
  /**
   * Constructs the HeroObject instance.
   * @param {THREE.Scene} scene - Parent Three.js Scene object.
   */
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.params = {
      geometryType: 'TorusKnot',
      wireframe: false,
      autoRotate: true,
      rotateSpeed: 1.0,
      metalness: 0.8,
      roughness: 0.15,
      clearcoat: 1.0,
      transmission: 0.2,
      color: '#6366f1',
    };

    this.createGeometries();
    this.createMaterial();
    this.createMesh();
    this.createOuterCage();
    this.createGroundGrid();
  }

  /**
   * Initializes procedural 3D geometries.
   * @private
   */
  createGeometries() {
    this.geometries = {
      TorusKnot: new THREE.TorusKnotGeometry(1.2, 0.38, 128, 32, 2, 3),
      Icosahedron: new THREE.IcosahedronGeometry(1.5, 3),
      Dodecahedron: new THREE.DodecahedronGeometry(1.5, 1),
      Torus: new THREE.TorusGeometry(1.3, 0.4, 32, 100),
    };
  }

  /**
   * Initializes physical PBR glass/metal material.
   * @private
   */
  createMaterial() {
    this.material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(this.params.color),
      metalness: this.params.metalness,
      roughness: this.params.roughness,
      clearcoat: this.params.clearcoat,
      clearcoatRoughness: 0.1,
      transmission: this.params.transmission,
      ior: 1.5,
      thickness: 1.2,
      wireframe: this.params.wireframe,
      flatShading: false,
    });
  }

  /**
   * Creates centerpiece mesh and adds to scene group.
   * @private
   */
  createMesh() {
    const geo = this.geometries[this.params.geometryType];
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.position.y = 0.5;
    this.group.add(this.mesh);
  }

  /**
   * Creates surrounding wireframe outer cage.
   * @private
   */
  createOuterCage() {
    const cageGeo = new THREE.IcosahedronGeometry(2.2, 1);
    const cageMat = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    this.cageMesh = new THREE.Mesh(cageGeo, cageMat);
    this.cageMesh.position.y = 0.5;
    this.group.add(this.cageMesh);
  }

  /**
   * Creates shadow-receiving ground plane and helper grid.
   * @private
   */
  createGroundGrid() {
    // Shadow receiving ground plane
    const planeGeo = new THREE.PlaneGeometry(30, 30);
    const planeMat = new THREE.ShadowMaterial({
      opacity: 0.4,
    });
    this.groundMesh = new THREE.Mesh(planeGeo, planeMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.y = -2.2;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    // Subtle helper grid
    this.gridHelper = new THREE.GridHelper(30, 30, 0x6366f1, 0x1e293b);
    this.gridHelper.position.y = -2.201;
    this.gridHelper.material.opacity = 0.25;
    this.gridHelper.material.transparent = true;
    this.scene.add(this.gridHelper);
  }

  /**
   * Switches active geometry type.
   * @param {'TorusKnot' | 'Icosahedron' | 'Dodecahedron' | 'Torus'} type - Geometry key.
   */
  setGeometry(type) {
    if (this.geometries[type]) {
      this.params.geometryType = type;
      this.mesh.geometry = this.geometries[type];
    }
  }

  /**
   * Re-applies physical material parameters.
   */
  updateMaterial() {
    this.material.color.set(this.params.color);
    this.material.metalness = this.params.metalness;
    this.material.roughness = this.params.roughness;
    this.material.clearcoat = this.params.clearcoat;
    this.material.transmission = this.params.transmission;
    this.material.wireframe = this.params.wireframe;
    this.material.needsUpdate = true;
  }

  /**
   * Per-frame animation update for rotation and floating bobbing motion.
   * @param {number} time - Total elapsed execution time in seconds.
   * @param {number} delta - Time elapsed since last frame in seconds.
   */
  update(time, delta) {
    if (this.params.autoRotate) {
      const speed = this.params.rotateSpeed;
      this.mesh.rotation.x += delta * 0.4 * speed;
      this.mesh.rotation.y += delta * 0.6 * speed;

      // Outer cage counter-rotation
      this.cageMesh.rotation.x -= delta * 0.2 * speed;
      this.cageMesh.rotation.y -= delta * 0.3 * speed;
    }

    // Sine wave floating bobbing animation
    const bobHeight = Math.sin(time * 1.5) * 0.15;
    this.mesh.position.y = 0.5 + bobHeight;
    this.cageMesh.position.y = 0.5 + bobHeight;
  }
}
