import * as THREE from 'three';

export class IMUCubeManager {
  constructor(scene) {
    this.scene = scene;
    this.cubes = new Map();
    this.containerGroup = new THREE.Group();
    this.scene.add(this.containerGroup);

    this.slerpFactor = 0.25;
    this.applyAccPosition = false;

    this.getOrCreateCube('Sensor1');
  }

  getOrCreateCube(sensorName) {
    if (this.cubes.has(sensorName)) {
      return this.cubes.get(sensorName);
    }

    const cubeGroup = new THREE.Group();

    // Box Geometry (Width 2.2, Height 1.2, Depth 2.2)
    const boxGeo = new THREE.BoxGeometry(2.2, 1.2, 2.2);

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

    // Solid Microchip Detail on Top (+Y) Face
    const chipGeo = new THREE.BoxGeometry(0.8, 0.1, 0.8);
    const chipMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.2, metalness: 0.8 });
    const chipMesh = new THREE.Mesh(chipGeo, chipMat);
    chipMesh.position.set(0, 0.65, 0);
    cubeGroup.add(chipMesh);

    // Status LED
    const ledGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const ledMesh = new THREE.Mesh(ledGeo, ledMat);
    ledMesh.position.set(0.7, 0.66, -0.7);
    cubeGroup.add(ledMesh);

    // X, Y, Z Axis Helpers (+X = Red, +Y = Green, +Z = Blue)
    const arrowLen = 2.4;
    const arrowHeadLen = 0.45;
    const arrowHeadWidth = 0.22;

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
      targetPos: new THREE.Vector3(0, 0.5, 0),
      currentPos: new THREE.Vector3(0, 0.5, 0),
    };

    this.cubes.set(sensorName, cubeData);
    this.repositionCubes();

    return cubeData;
  }

  repositionCubes() {
    const total = this.cubes.size;
    let index = 0;
    const spacing = 4.5;
    const startX = -((total - 1) * spacing) / 2;

    for (const [_, cubeData] of this.cubes) {
      const posX = startX + index * spacing;
      cubeData.targetPos.x = posX;
      cubeData.currentPos.x = posX;
      cubeData.group.position.x = posX;
      index++;
    }
  }

  updateSensorData(sensorName, data) {
    const cube = this.getOrCreateCube(sensorName);

    if (data.qw !== undefined && data.qx !== undefined && data.qy !== undefined && data.qz !== undefined) {
      const rawQ = new THREE.Quaternion(data.qx, data.qy, data.qz, data.qw).normalize();
      const invZero = cube.zeroQuaternion.clone().invert();
      cube.targetQuaternion.copy(invZero.multiply(rawQ));
    }

    if (this.applyAccPosition && data.ax !== undefined && data.ay !== undefined && data.az !== undefined) {
      cube.targetPos.y = 0.5 + data.ay * 0.05;
    }
  }

  calibrateZero(sensorName) {
    if (sensorName) {
      const cube = this.cubes.get(sensorName);
      if (cube) {
        cube.zeroQuaternion.copy(cube.targetQuaternion.clone().multiply(cube.zeroQuaternion));
        cube.targetQuaternion.identity();
      }
    } else {
      for (const [_, cube] of this.cubes) {
        cube.zeroQuaternion.copy(cube.targetQuaternion.clone().multiply(cube.zeroQuaternion));
        cube.targetQuaternion.identity();
      }
    }
  }

  update(time, delta) {
    for (const [_, cube] of this.cubes) {
      cube.currentQuaternion.slerp(cube.targetQuaternion, this.slerpFactor);
      cube.group.quaternion.copy(cube.currentQuaternion);

      cube.currentPos.lerp(cube.targetPos, 0.1);
      cube.group.position.y = cube.currentPos.y;
    }
  }
}
