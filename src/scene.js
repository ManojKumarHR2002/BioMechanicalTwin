import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ViewHelper } from 'three/examples/jsm/helpers/ViewHelper.js';

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.clock = new THREE.Clock();
    this.updateCallbacks = [];
    this.fps = 60;
    this.frameCount = 0;
    this.lastFpsTime = performance.now();

    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initControls();
    this.initViewHelper();
    this.initListeners();

    // Start loop
    this.animate();
  }

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
    this.renderer.autoClear = false; // Required for ViewHelper overlay rendering
  }

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

  setWorldAxesVisible(visible) {
    if (this.axesHelper) {
      this.axesHelper.visible = visible;
    }
  }

  initCamera() {
    this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 0.1, 100);
    this.camera.position.set(0, 2.5, 6.5);
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.1;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 100;
    this.controls.target.set(0, 0.5, 0);
  }

  initViewHelper() {
    // Unity / Blender style 3D Viewport Orientation Gizmo
    this.viewHelper = new ViewHelper(this.camera, this.canvas);

    // Position ViewHelper overlay container at top-right
    if (this.viewHelper.center) {
      this.viewHelper.center.set(0, 0, 0);
    }

    // Pointer event for interactive axis handle clicks (snaps camera to X, Y, Z view)
    this.canvas.addEventListener('pointerdown', (e) => {
      this.viewHelper.handleClick(e);
    });
  }

  initListeners() {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  addUpdateCallback(fn) {
    this.updateCallbacks.push(fn);
  }

  resetCamera() {
    this.camera.position.set(0, 2.5, 6.5);
    this.controls.target.set(0, 0.5, 0);
    this.controls.update();
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // FPS calculation
    this.frameCount++;
    const now = performance.now();
    if (now >= this.lastFpsTime + 500) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
      this.frameCount = 0;
      this.lastFpsTime = now;
      if (this.onFpsUpdate) this.onFpsUpdate(this.fps);
    }

    // Update OrbitControls
    this.controls.update();

    // Update ViewHelper animation if user clicked an axis handle
    if (this.viewHelper.animating) {
      this.viewHelper.update(delta);
    }

    // Update component animation hooks
    for (const callback of this.updateCallbacks) {
      callback(elapsedTime, delta);
    }

    // Render Scene & Unity-style ViewHelper Overlay
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.viewHelper.render(this.renderer);
  }
}
