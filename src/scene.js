/**
 * @file scene.js
 * @description Core Three.js WebGL Scene Manager for the BioMechanicalTwin visualizer.
 * @module SceneManager
 *
 * Configures the WebGLRenderer, PerspectiveCamera, OrbitControls, 3D Viewport Orientation Gizmo (ViewHelper),
 * studio environment grid, shadow plane, and requestAnimationFrame animation loop.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ViewHelper } from 'three/examples/jsm/helpers/ViewHelper.js';

/**
 * Manages the WebGL rendering context, camera projection, user controls, and animation loop.
 */
export class SceneManager {
  /**
   * Constructs the SceneManager instance.
   * @param {HTMLCanvasElement} canvas - Target HTML canvas element for WebGL rendering.
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.clock = new THREE.Clock();
    this.updateCallbacks = [];
    this.fps = 60;
    this.frameCount = 0;
    this.lastFpsTime = performance.now();
    this.onFpsUpdate = null;

    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initControls();
    this.initViewHelper();
    this.initListeners();

    // Start requestAnimationFrame render loop
    this.animate();
  }

  /**
   * Initializes WebGLRenderer with high-performance settings, ACES tone mapping, and PCF soft shadow maps.
   * @private
   */
  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });

    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.autoClear = false; // Required for rendering ViewHelper orientation gizmo overlay
  }

  /**
   * Initializes Three.js Scene, ground shadow floor plane, cybernetic grid, and global world axes.
   * @private
   */
  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x09090b);

    // Ground plane for realistic soft shadows
    const groundGeo = new THREE.PlaneGeometry(50, 50);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = 0;
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);

    // Modern cybernetic 3D viewport grid
    const gridHelper = new THREE.GridHelper(30, 30, 0x6366f1, 0x1e293b);
    gridHelper.position.y = -0.001;
    gridHelper.material.opacity = 0.25;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);

    // Global 3D World Axes Helper (+X = Red, +Y = Green, +Z = Blue)
    this.axesHelper = new THREE.AxesHelper(1.5);
    this.axesHelper.position.set(0, 0.005, 0);
    this.scene.add(this.axesHelper);
  }

  /**
   * Controls visibility of global world coordinate axes helper (+X Red, +Y Green, +Z Blue).
   * @param {boolean} visible - Whether the axes helper should be visible.
   */
  setWorldAxesVisible(visible) {
    if (this.axesHelper) {
      this.axesHelper.visible = visible;
    }
  }

  /**
   * Initializes perspective camera positioned for optimal biomechanical avatar viewing.
   * @private
   */
  initCamera() {
    this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 0.1, 100);
    this.camera.position.set(0, 2.5, 6.5);
  }

  /**
   * Configures interactive OrbitControls for pan, zoom, and rotation with smooth inertia damping.
   * @private
   */
  initControls() {
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.1;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 100;
    this.controls.target.set(0, 0.5, 0);
  }

  /**
   * Configures 3D Viewport Orientation Gizmo (ViewHelper) for snapping camera to X, Y, Z orthogonal views.
   * @private
   */
  initViewHelper() {
    this.viewHelper = new ViewHelper(this.camera, this.canvas);

    if (this.viewHelper.center) {
      this.viewHelper.center.set(0, 0, 0);
    }

    // Pointer event handler for clicking orientation gizmo handles
    this.canvas.addEventListener('pointerdown', (e) => {
      this.viewHelper.handleClick(e);
    });
  }

  /**
   * Binds browser event listeners (e.g. window resize).
   * @private
   */
  initListeners() {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  /**
   * Handles browser window resize by updating camera projection matrix and WebGL viewport dimensions.
   */
  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  /**
   * Registers a per-frame animation update callback function.
   * @param {Function} fn - Callback receiving (elapsedTime, delta).
   */
  addUpdateCallback(fn) {
    this.updateCallbacks.push(fn);
  }

  /**
   * Resets camera position and OrbitControls target to default orientation.
   */
  resetCamera() {
    this.camera.position.set(0, 2.5, 6.5);
    this.controls.target.set(0, 0.5, 0);
    this.controls.update();
  }

  /**
   * Main animation loop driven by requestAnimationFrame.
   * Updates controls, gizmo animations, registered callbacks, and executes WebGL rendering.
   * @private
   */
  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // Calculate real-time rendering FPS
    this.frameCount++;
    const now = performance.now();
    if (now >= this.lastFpsTime + 500) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
      this.frameCount = 0;
      this.lastFpsTime = now;
      if (this.onFpsUpdate) this.onFpsUpdate(this.fps);
    }

    // Update orbit controls damping
    this.controls.update();

    // Update ViewHelper camera transition animation if active
    if (this.viewHelper.animating) {
      this.viewHelper.update(delta);
    }

    // Invoke per-frame component update hooks
    for (const callback of this.updateCallbacks) {
      callback(elapsedTime, delta);
    }

    // Render WebGL scene and 3D ViewHelper gizmo overlay
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.viewHelper.render(this.renderer);
  }
}
