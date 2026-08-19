import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { globalAxisConfig } from '../axisConfig.js';

/**
 * Standard Mixamo Rig Bone Mapping Reference
 */
export const MIXAMO_BONES = {
  Hips: 'mixamorigHips',
  Spine: 'mixamorigSpine',
  Spine1: 'mixamorigSpine1',
  Spine2: 'mixamorigSpine2',
  Neck: 'mixamorigNeck',
  Head: 'mixamorigHead',
  LeftShoulder: 'mixamorigLeftShoulder',
  LeftArm: 'mixamorigLeftArm',
  LeftForeArm: 'mixamorigLeftForeArm',
  LeftHand: 'mixamorigLeftHand',
  RightShoulder: 'mixamorigRightShoulder',
  RightArm: 'mixamorigRightArm',
  RightForeArm: 'mixamorigRightForeArm',
  RightHand: 'mixamorigRightHand',
  LeftUpLeg: 'mixamorigLeftUpLeg',
  LeftLeg: 'mixamorigLeftLeg',
  LeftFoot: 'mixamorigLeftFoot',
  RightUpLeg: 'mixamorigRightUpLeg',
  RightLeg: 'mixamorigRightLeg',
  RightFoot: 'mixamorigRightFoot',
};

export class HumanModelManager {
  constructor(scene) {
    this.scene = scene;
    this.containerGroup = new THREE.Group();
    this.scene.add(this.containerGroup);

    this.loader = new FBXLoader();
    this.model = null;
    this.skeletonHelper = null;
    this.showSkeleton = false;
    this.enabled = true;
    this.viewMode = 'avatar'; // 'avatar' | 'attached' | 'cubes'

    // Bone mapping structure: { [friendlyName or boneName]: boneObject }
    this.bones = new Map();
    this.boneRestQuaternions = new Map();

    // Sensor to Bone Mappings: { [sensorName]: boneName }
    this.sensorBoneMap = {
      Sensor1: 'RightForeArm',
      Sensor2: 'RightArm',
      Sensor3: 'LeftForeArm',
      Sensor4: 'LeftArm',
      Sensor5: 'Spine2',
      Sensor6: 'RightLeg',
      Sensor7: 'LeftLeg',
    };

    // Live sensor state tracking
    this.sensorStates = new Map();
    this.slerpFactor = 0.25;

    // Mini attached IMU indicator meshes
    this.attachedImuGroup = new THREE.Group();
    this.containerGroup.add(this.attachedImuGroup);
    this.attachedIndicators = new Map();

    // Default status callbacks
    this.onModelLoaded = null;
    this.onLoadError = null;

    // Load saved mapping JSON from localStorage or /boneMapping.json
    this.loadSavedMapping();

    // Load default T-Pose.fbx
    this.loadDefaultModel();
  }

  async loadSavedMapping() {
    try {
      const stored = localStorage.getItem('biomechanical_twin_bone_mapping');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          this.sensorBoneMap = parsed;
          console.log('[HumanModelManager] Loaded bone mapping from localStorage:', this.sensorBoneMap);
          this.rebuildAttachedIndicators();
          return;
        }
      }
    } catch (err) {
      console.warn('[HumanModelManager] Could not parse localStorage mapping:', err);
    }

    // Fallback: fetch from public/boneMapping.json
    try {
      const res = await fetch('/boneMapping.json');
      if (res.ok) {
        const json = await res.json();
        if (json && typeof json === 'object') {
          this.sensorBoneMap = json;
          this.saveMapping();
          console.log('[HumanModelManager] Loaded default bone mapping from /boneMapping.json:', json);
          this.rebuildAttachedIndicators();
        }
      }
    } catch (err) {
      console.error('[HumanModelManager] Failed to load /boneMapping.json:', err);
    }
  }

  saveMapping() {
    try {
      localStorage.setItem('biomechanical_twin_bone_mapping', JSON.stringify(this.sensorBoneMap, null, 2));
      console.log('[HumanModelManager] Bone mapping updated & saved.');
    } catch (err) {
      console.error('[HumanModelManager] Error saving bone mapping:', err);
    }
  }

  loadDefaultModel() {
    this.loadFBXFromUrl('/T-Pose.fbx');
  }

  loadFBXFromUrl(url) {
    console.log('[HumanModelManager] Loading FBX model from URL:', url);
    this.loader.load(
      url,
      (fbx) => {
        this.setupModel(fbx);
      },
      (xhr) => {
        if (xhr.lengthComputable) {
          const percent = (xhr.loaded / xhr.total) * 100;
          console.log(`[HumanModelManager] Loading: ${percent.toFixed(1)}%`);
        }
      },
      (error) => {
        console.error('[HumanModelManager] FBX Load Error:', error);
        if (this.onLoadError) this.onLoadError(error);
      }
    );
  }

  loadFBXFromFile(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    console.log('[HumanModelManager] Loading custom FBX file:', file.name);

    this.loader.load(
      url,
      (fbx) => {
        this.setupModel(fbx);
        URL.revokeObjectURL(url);
      },
      undefined,
      (error) => {
        console.error('[HumanModelManager] Custom FBX Error:', error);
        URL.revokeObjectURL(url);
        if (this.onLoadError) this.onLoadError(error);
      }
    );
  }

  setupModel(fbx) {
    // Remove existing model if present
    if (this.model) {
      this.containerGroup.remove(this.model);
    }
    if (this.skeletonHelper) {
      this.scene.remove(this.skeletonHelper);
      this.skeletonHelper = null;
    }

    this.model = fbx;
    this.bones.clear();
    this.boneRestQuaternions.clear();

    // Calculate bounding box for auto-scaling & grounding
    const bbox = new THREE.Box3().setFromObject(this.model);
    const size = bbox.getSize(new THREE.Vector3());
    const height = size.y;

    if (height > 0) {
      const targetHeight = 1.8; // Target ~1.8m human height
      const scale = targetHeight / height;
      this.model.scale.set(scale, scale, scale);
    } else {
      this.model.scale.set(0.015, 0.015, 0.015);
    }

    // Recompute bounding box after scaling to align feet to ground (y = 0)
    bbox.setFromObject(this.model);
    const minY = bbox.min.y;
    this.model.position.set(0, -minY, 0);

    // Traversal to configure shadows, materials, and extract bones
    this.model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        // Ensure materials have smooth rendering and standard metal/roughness
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => this.enhanceMaterial(m));
          } else {
            this.enhanceMaterial(child.material);
          }
        }
      }

      if (child.isBone || child.type === 'Bone') {
        const boneName = child.name;
        this.bones.set(boneName, child);

        // Store initial T-pose rest quaternion
        this.boneRestQuaternions.set(boneName, child.quaternion.clone());

        // Also index by friendly Mixamo key if available
        for (const [friendlyKey, mixamoName] of Object.entries(MIXAMO_BONES)) {
          if (boneName === mixamoName || boneName.endsWith(mixamoName) || boneName.toLowerCase().includes(friendlyKey.toLowerCase())) {
            if (!this.bones.has(friendlyKey)) {
              this.bones.set(friendlyKey, child);
              this.boneRestQuaternions.set(friendlyKey, child.quaternion.clone());
            }
          }
        }
      }
    });

    this.containerGroup.add(this.model);

    // Setup SkeletonHelper visualizer
    this.skeletonHelper = new THREE.SkeletonHelper(this.model);
    this.skeletonHelper.material.linewidth = 2;
    this.skeletonHelper.visible = this.showSkeleton;
    this.scene.add(this.skeletonHelper);

    // Build attached mini IMU sensor chassis indicators
    this.rebuildAttachedIndicators();

    console.log('[HumanModelManager] FBX model setup complete. Found bones:', this.bones.size);
    if (this.onModelLoaded) {
      this.onModelLoaded(Array.from(this.bones.keys()));
    }

    this.applyViewMode(this.viewMode);
  }

  enhanceMaterial(mat) {
    if (!mat) return;
    mat.roughness = 0.5;
    mat.metalness = 0.2;
    mat.shadowSide = THREE.DoubleSide;
  }

  setSkeletonVisible(visible) {
    this.showSkeleton = visible;
    if (this.skeletonHelper) {
      this.skeletonHelper.visible = visible && this.containerGroup.visible;
    }
  }

  setVisible(visible) {
    this.enabled = visible;
    this.containerGroup.visible = visible;
    if (this.skeletonHelper) {
      this.skeletonHelper.visible = visible && this.showSkeleton;
    }
  }

  setViewMode(mode) {
    this.viewMode = mode; // 'avatar' | 'attached' | 'cubes'
    this.applyViewMode(mode);
  }

  applyViewMode(mode) {
    if (mode === 'cubes') {
      this.containerGroup.visible = false;
    } else {
      this.containerGroup.visible = true;
      if (mode === 'attached') {
        this.attachedImuGroup.visible = true;
      } else {
        this.attachedImuGroup.visible = false;
      }
    }
  }

  setSensorBoneMapping(sensorName, boneKey) {
    if (boneKey) {
      this.sensorBoneMap[sensorName] = boneKey;
    } else {
      delete this.sensorBoneMap[sensorName];
    }
    this.saveMapping();
    this.rebuildAttachedIndicators();
  }

  setSensorBoneMapBatch(mappingObj) {
    this.sensorBoneMap = { ...mappingObj };
    this.saveMapping();
    this.rebuildAttachedIndicators();
  }

  resetMapping() {
    this.sensorBoneMap = {};
    this.saveMapping();
    this.rebuildAttachedIndicators();
  }

  downloadMappingJson() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.sensorBoneMap, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'boneMapping.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  loadMappingFromFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('No file provided'));
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target.result);
          if (json && typeof json === 'object') {
            this.setSensorBoneMapBatch(json);
            resolve(json);
          } else {
            reject(new Error('Invalid JSON format'));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    });
  }

  getBone(boneKey) {
    if (!boneKey) return null;
    if (this.bones.has(boneKey)) return this.bones.get(boneKey);
    const mixamoName = MIXAMO_BONES[boneKey];
    if (mixamoName && this.bones.has(mixamoName)) return this.bones.get(mixamoName);
    return null;
  }

  rebuildAttachedIndicators() {
    // Clear old attached indicators
    while (this.attachedImuGroup.children.length > 0) {
      const obj = this.attachedImuGroup.children[0];
      this.attachedImuGroup.remove(obj);
    }
    this.attachedIndicators.clear();

    const indicatorGeo = new THREE.BoxGeometry(0.8, 0.4, 0.8); // 1/10th scale for bone hierarchy
    const indicatorMat = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0x312e81,
      emissiveIntensity: 0.3,
    });

    for (const [sensorName, boneKey] of Object.entries(this.sensorBoneMap)) {
      const bone = this.getBone(boneKey);
      if (bone) {
        const mesh = new THREE.Mesh(indicatorGeo, indicatorMat.clone());
        mesh.castShadow = true;
        bone.add(mesh); // Attach directly to bone object so it follows skeletal transformations
        mesh.position.set(0, 0, 0);
        this.attachedIndicators.set(sensorName, mesh);
      }
    }
  }

  updateSensorData(sensorName, data) {
    if (!data) return;

    let targetQuat = new THREE.Quaternion();

    // Extract Quaternion from sensor payload
    let qw, qx, qy, qz;
    if (Array.isArray(data.quat) || Array.isArray(data.quaternion)) {
      const qArr = data.quat || data.quaternion;
      if (qArr.length >= 4) {
        qw = Number(qArr[0]);
        qx = Number(qArr[1]);
        qy = Number(qArr[2]);
        qz = Number(qArr[3]);
      }
    } else {
      qw = data.qw ?? data.w ?? data.q0;
      qx = data.qx ?? data.x ?? data.q1;
      qy = data.qy ?? data.y ?? data.q2;
      qz = data.qz ?? data.z ?? data.q3;
    }

    if (qw !== undefined && qx !== undefined && qy !== undefined && qz !== undefined) {
      targetQuat = globalAxisConfig.transformQuaternion(Number(qx), Number(qy), Number(qz), Number(qw));
    }

    if (!this.sensorStates.has(sensorName)) {
      this.sensorStates.set(sensorName, {
        targetQuat: new THREE.Quaternion(),
        currentQuat: new THREE.Quaternion(),
        zeroQuat: new THREE.Quaternion(),
        lastRawQuat: new THREE.Quaternion(),
      });
    }

    const state = this.sensorStates.get(sensorName);
    state.lastRawQuat.copy(targetQuat);

    // Delta relative to zero-tare calibration
    const invZero = state.zeroQuat.clone().invert();
    state.targetQuat.copy(invZero.multiply(targetQuat));
  }

  resetToTPose() {
    if (!this.model) return;

    // Force all bones back to their initial rest T-pose quaternions
    for (const [boneName, bone] of this.bones) {
      const restQuat = this.boneRestQuaternions.get(boneName);
      if (restQuat) {
        bone.quaternion.copy(restQuat);
      }
    }

    // Reset sensor relative quaternions to identity
    for (const [_, state] of this.sensorStates) {
      if (state.lastRawQuat && state.lastRawQuat.lengthSq() > 0) {
        state.zeroQuat.copy(state.lastRawQuat);
      }
      state.targetQuat.set(0, 0, 0, 1);
      state.currentQuat.set(0, 0, 0, 1);
    }

    if (this.skeletonHelper && this.showSkeleton) {
      this.skeletonHelper.update();
    }
  }

  calibrateZero(sensorName) {
    if (sensorName) {
      const state = this.sensorStates.get(sensorName);
      if (state && state.lastRawQuat) {
        state.zeroQuat.copy(state.lastRawQuat);
        state.targetQuat.set(0, 0, 0, 1);
        state.currentQuat.set(0, 0, 0, 1);
      }
    } else {
      for (const [_, state] of this.sensorStates) {
        if (state.lastRawQuat) {
          state.zeroQuat.copy(state.lastRawQuat);
          state.targetQuat.set(0, 0, 0, 1);
          state.currentQuat.set(0, 0, 0, 1);
        }
      }
    }
    this.resetToTPose();
  }

  update(time, delta) {
    if (!this.model) return;

    // Reset all bones to rest T-pose first
    for (const [boneName, bone] of this.bones) {
      const restQuat = this.boneRestQuaternions.get(boneName);
      if (restQuat) {
        bone.quaternion.copy(restQuat);
      }
    }

    // Apply sensor world rotations
    for (const [sensorName, boneKey] of Object.entries(this.sensorBoneMap)) {
      const state = this.sensorStates.get(sensorName);
      const bone = this.getBone(boneKey);

      if (!state || !bone) continue;

      // Smooth the sensor WORLD rotation
      state.currentQuat.slerp(state.targetQuat, this.slerpFactor);

      // Make sure parent's world transform is current
      if (bone.parent) {
        bone.parent.updateWorldMatrix(true, false);

        // Parent's GLOBAL/WORLD rotation
        const parentWorldQuat = new THREE.Quaternion();
        bone.parent.getWorldQuaternion(parentWorldQuat);

        // Sensor gives GLOBAL/WORLD rotation
        const sensorWorldQuat = state.currentQuat.clone();

        // Convert world rotation -> bone local rotation
        //
        // local = inverse(parentWorld) * world
        const localQuat = parentWorldQuat
          .clone()
          .invert()
          .multiply(sensorWorldQuat);

        bone.quaternion.copy(localQuat);
      } else {
        // Root bone has no parent, so world == local
        bone.quaternion.copy(state.currentQuat);
      }
    }

    if (this.skeletonHelper && this.showSkeleton) {
      this.skeletonHelper.update();
    }
  }
}
