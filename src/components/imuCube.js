import * as THREE from 'three';
import { globalAxisConfig } from '../axisConfig.js';

export class IMUCubeManager {
  constructor(scene) {
    this.scene = scene;
    this.cubes = new Map();
    this.containerGroup = new THREE.Group();
    this.scene.add(this.containerGroup);

    this.slerpFactor = 0.25;
    this.applyAccPosition = false;
    this.enabled = true;

    this.getOrCreateCube('Sensor1');
  }

  setVisible(visible) {
    this.enabled = visible;
    this.containerGroup.visible = visible;
  }

  getOrCreateCube(sensorName) {
    if (this.cubes.has(sensorName)) {
      return this.cubes.get(sensorName);
    }

    // Remove untouched initial placeholder 'Sensor1' if a real sensor with a different name arrives
    if (sensorName !== 'Sensor1' && this.cubes.has('Sensor1')) {
      const dummy = this.cubes.get('Sensor1');
      if (!dummy.hasReceivedData) {
        this.containerGroup.remove(dummy.group);
        this.cubes.delete('Sensor1');
      }
    }

    const cubeGroup = new THREE.Group();

    // Box Geometry (Width 0.22, Height 0.12, Depth 0.22) - 1/10th scale
    const boxGeo = new THREE.BoxGeometry(0.22, 0.12, 0.22);

    // Three.js BoxGeometry Material Order:
    // [0]: +X (Right)  -> RED
    // [1]: -X (Left)   -> Dark Red Neutral
    // [2]: +Y (Top)    -> GREEN
    // [3]: -Y (Bottom) -> Dark Green Neutral
    // [4]: +Z (Front)  -> BLUE
    // [5]: -Z (Back)   -> Dark Blue Neutral
    const materials = [
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.2, metalness: 0.3 }), // +X: RED
      new THREE.MeshStandardMaterial({ color: 0x450a0a, roughness: 0.5, metalness: 0.1 }), // -X: Dark Red
      new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.2, metalness: 0.3 }), // +Y: GREEN
      new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.5, metalness: 0.1 }), // -Y: Dark Green
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.2, metalness: 0.3 }), // +Z: BLUE
      new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.5, metalness: 0.1 }), // -Z: Dark Blue
    ];

    const chassisMesh = new THREE.Mesh(boxGeo, materials);
    chassisMesh.castShadow = true;
    chassisMesh.receiveShadow = true;
    cubeGroup.add(chassisMesh);

    // Solid Microchip Detail on Top (+Y) Face (1/10th scale)
    const chipGeo = new THREE.BoxGeometry(0.08, 0.01, 0.08);
    const chipMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.2, metalness: 0.8 });
    const chipMesh = new THREE.Mesh(chipGeo, chipMat);
    chipMesh.position.set(0, 0.065, 0);
    cubeGroup.add(chipMesh);

    // Status LED (1/10th scale)
    const ledGeo = new THREE.SphereGeometry(0.01, 16, 16);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const ledMesh = new THREE.Mesh(ledGeo, ledMat);
    ledMesh.position.set(0.07, 0.066, -0.07);
    cubeGroup.add(ledMesh);

    // X, Y, Z Axis Helpers (+X = Red, +Y = Green, +Z = Blue) (1/10th scale)
    const arrowLen = 0.24;
    const arrowHeadLen = 0.045;
    const arrowHeadWidth = 0.022;

    const arrowX = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), arrowLen, 0xef4444, arrowHeadLen, arrowHeadWidth);
    const arrowY = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), arrowLen, 0x10b981, arrowHeadLen, arrowHeadWidth);
    const arrowZ = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), arrowLen, 0x3b82f6, arrowHeadLen, arrowHeadWidth);

    cubeGroup.add(arrowX);
    cubeGroup.add(arrowY);
    cubeGroup.add(arrowZ);

    // Crisp white border outlines
    const edgesGeo = new THREE.EdgesGeometry(boxGeo);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    const edgeLines = new THREE.LineSegments(edgesGeo, edgesMat);
    cubeGroup.add(edgeLines);

    this.containerGroup.add(cubeGroup);

    const cubeData = {
      name: sensorName,
      group: cubeGroup,
      chassisMesh,
      targetQuaternion: new THREE.Quaternion(),
      currentQuaternion: new THREE.Quaternion(),
      zeroQuaternion: new THREE.Quaternion(),
      lastRawQuaternion: new THREE.Quaternion(),
      targetPos: new THREE.Vector3(0, 0.5, 0),
      currentPos: new THREE.Vector3(0, 0.5, 0),
      hasReceivedData: false,
    };

    this.cubes.set(sensorName, cubeData);
    this.repositionCubes();

    return cubeData;
  }

  repositionCubes() {
    const total = this.cubes.size;
    let index = 0;
    const spacing = 0.45;
    const startX = -((total - 1) * spacing) / 2;

    for (const [_, cubeData] of this.cubes) {
      const posX = startX + index * spacing;
      cubeData.targetPos.x = posX;
      if (!cubeData.hasReceivedData) {
        cubeData.currentPos.x = posX;
        cubeData.group.position.x = posX;
      }
      index++;
    }
  }

  updateSensorData(sensorName, data) {
    if (!data) return;

    const cube = this.getOrCreateCube(sensorName);
    cube.hasReceivedData = true;

    // Extract acceleration for bump movement
    const ayVal = data.ay ?? data.accY ?? (Array.isArray(data.acc) ? data.acc[1] : null);
    if (this.applyAccPosition && ayVal !== null && ayVal !== undefined) {
      const ayNum = Number(ayVal);
      if (!isNaN(ayNum)) {
        cube.targetPos.y = 0.5 + ayNum * 0.05;
      }
    }

    // Extract Quaternion values (supporting qw/qx/qy/qz, w/x/y/z, q0/q1/q2/q3, or array)
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
      const rawQw = data.qw ?? data.w ?? data.q0;
      const rawQx = data.qx ?? data.x ?? data.q1;
      const rawQy = data.qy ?? data.y ?? data.q2;
      const rawQz = data.qz ?? data.z ?? data.q3;

      if (rawQw !== undefined && rawQx !== undefined && rawQy !== undefined && rawQz !== undefined) {
        qw = Number(rawQw);
        qx = Number(rawQx);
        qy = Number(rawQy);
        qz = Number(rawQz);
      }
    }

    if (qw !== undefined && qx !== undefined && qy !== undefined && qz !== undefined) {
      const lengthSq = qx * qx + qy * qy + qz * qz + qw * qw;

      // CRITICAL BUG FIX: Validate quaternion length before normalizing!
      // If qw=0, qx=0, qy=0, qz=0 or NaN, normalizing will produce NaN and cause 3D cube to disappear.
      if (!isNaN(lengthSq) && lengthSq > 1e-6) {
        const rawQ = globalAxisConfig.transformQuaternion(qx, qy, qz, qw);
        cube.lastRawQuaternion.copy(rawQ);

        const invZero = cube.zeroQuaternion.clone().invert();
        cube.targetQuaternion.copy(invZero.multiply(rawQ));
      }
    } else if (data.roll !== undefined || data.pitch !== undefined || data.yaw !== undefined || data.rx !== undefined) {
      // Fallback for Euler angles
      const r = THREE.MathUtils.degToRad(Number(data.roll ?? data.rx ?? 0));
      const p = THREE.MathUtils.degToRad(Number(data.pitch ?? data.ry ?? 0));
      const y = THREE.MathUtils.degToRad(Number(data.yaw ?? data.rz ?? 0));

      if (!isNaN(r) && !isNaN(p) && !isNaN(y)) {
        const euler = new THREE.Euler(p, y, r, 'YXZ');
        const rawQ = new THREE.Quaternion().setFromEuler(euler);
        cube.lastRawQuaternion.copy(rawQ);

        const invZero = cube.zeroQuaternion.clone().invert();
        cube.targetQuaternion.copy(invZero.multiply(rawQ));
      }
    }
  }

  calibrateZero(sensorName) {
    if (sensorName) {
      const cube = this.cubes.get(sensorName);
      if (cube && cube.lastRawQuaternion) {
        cube.zeroQuaternion.copy(cube.lastRawQuaternion);
      }
    } else {
      for (const [_, cube] of this.cubes) {
        if (cube.lastRawQuaternion) {
          cube.zeroQuaternion.copy(cube.lastRawQuaternion);
        }
      }
    }
  }

  update(time, delta) {
    for (const [_, cube] of this.cubes) {
      // Check if quaternion components are valid before slerping
      if (!isNaN(cube.targetQuaternion.x) && !isNaN(cube.targetQuaternion.w)) {
        cube.currentQuaternion.slerp(cube.targetQuaternion, this.slerpFactor);
        cube.group.quaternion.copy(cube.currentQuaternion);
      }

      cube.currentPos.lerp(cube.targetPos, 0.1);
      cube.group.position.copy(cube.currentPos);
    }
  }
}
