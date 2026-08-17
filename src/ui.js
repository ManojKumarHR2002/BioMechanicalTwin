import GUI from 'lil-gui';
import { MIXAMO_BONES } from './components/humanModel.js';
import { SensorDetector } from './sensorDetector.js';
import { CalibrationPage } from './pages/calibrationPage.js';
import { globalAxisConfig } from './axisConfig.js';

export class UIManager {
  constructor(sceneManager, imuManager, humanModelManager, socketService, lights) {
    this.sceneManager = sceneManager;
    this.imuManager = imuManager;
    this.humanModelManager = humanModelManager;
    this.socketService = socketService;
    this.lights = lights;

    this.sensorDetector = new SensorDetector();

    this.initElements();
    this.initCalibrationPage();
    this.bindSocketEvents();
    this.bindUIEvents();
    this.initLilGui();
  }

  initElements() {
    this.statusElement = document.getElementById('status');
    this.connectionElement = document.getElementById('connection');
    this.connectionMobile = document.getElementById('connection-mobile');

    this.frameCountElement = document.getElementById('frameCount');
    this.frameCountMobile = document.getElementById('frameCount-mobile');

    this.fpsElement = document.getElementById('fps');
    this.fpsMobile = document.getElementById('fps-mobile');

    this.frameTimeElement = document.getElementById('frameTime');

    this.sensorCountElement = document.getElementById('sensorCount');
    this.sensorCountMobile = document.getElementById('sensorCount-mobile');

    this.sensorTable = document.getElementById('sensorTable');
    this.jsonOutput = document.getElementById('jsonOutput');
    this.jsonContainer = document.getElementById('jsonContainer');

    this.wsUrlInput = document.getElementById('wsUrlInput');
    this.btnConnect = document.getElementById('btnConnect');
    this.btnZero = document.getElementById('btnZero');
    this.btnToggleJson = document.getElementById('btnToggleJson');

    this.trayContent = document.getElementById('trayContent');
    this.trayToggleLabel = document.getElementById('trayToggleLabel');
    this.trayToggleIcon = document.getElementById('trayToggleIcon');
    this.btnToggleTray = document.getElementById('btnToggleTray');
    this.trayHeader = document.getElementById('trayHeader');

    // Avatar & Cubes Visibility Toggle Buttons
    this.btnToggleModel = document.getElementById('btnToggleModel');
    this.btnToggleCubes = document.getElementById('btnToggleCubes');

    this.btnSkeletonToggle = document.getElementById('btnSkeletonToggle');
    this.btnUploadFbx = document.getElementById('btnUploadFbx');
    this.fbxFileInput = document.getElementById('fbxFileInput');

    this.btnBoneMapping = document.getElementById('btnBoneMapping');
    this.boneMappingModal = document.getElementById('boneMappingModal');
    this.btnCloseBoneMapping = document.getElementById('btnCloseBoneMapping');
    this.boneMappingList = document.getElementById('boneMappingList');
    this.btnSaveBoneMapping = document.getElementById('btnSaveBoneMapping');
    this.btnModalExportJson = document.getElementById('btnModalExportJson');
    this.btnModalImportJson = document.getElementById('btnModalImportJson');
    this.modalJsonFileInput = document.getElementById('modalJsonFileInput');
    // Navigation elements
    this.btnNav3D = document.getElementById('btnNav3D');
    this.btnNavCalibration = document.getElementById('btnNavCalibration');
    this.calibrationPageContainer = document.getElementById('calibrationPageContainer');
  }

  initCalibrationPage() {
    if (!this.calibrationPageContainer) return;
    this.calibrationPage = new CalibrationPage(
      this.calibrationPageContainer,
      this.humanModelManager,
      this.sensorDetector
    );
  }

  switchPage(page) {
    const nav3DActive = 'px-3 py-1.5 rounded-xl font-semibold transition-all bg-indigo-600/90 text-white shadow-lg shadow-indigo-500/20 flex items-center gap-1.5';
    const navCalibActive = 'px-3 py-1.5 rounded-xl font-semibold transition-all bg-cyan-600/90 text-white shadow-lg shadow-cyan-500/20 flex items-center gap-1.5';
    const navInactive = 'px-3 py-1.5 rounded-xl font-medium transition-all text-slate-300 hover:text-white hover:bg-white/10 flex items-center gap-1.5';

    if (page === 'calibration') {
      if (this.calibrationPageContainer) this.calibrationPageContainer.classList.remove('hidden');
      const canvas = document.getElementById('webgl');
      if (canvas) canvas.style.display = 'none';
      if (this.btnNav3D) this.btnNav3D.className = navInactive;
      if (this.btnNavCalibration) this.btnNavCalibration.className = navCalibActive;
      if (this.calibrationPage) this.calibrationPage.updateView();
    } else {
      if (this.calibrationPageContainer) this.calibrationPageContainer.classList.add('hidden');
      const canvas = document.getElementById('webgl');
      if (canvas) canvas.style.display = '';
      if (this.btnNav3D) this.btnNav3D.className = nav3DActive;
      if (this.btnNavCalibration) this.btnNavCalibration.className = navInactive;
    }
  }

  bindSocketEvents() {
    // Status Change listener
    this.socketService.onStatusChange = (status) => {
      if (this.statusElement) {
        this.statusElement.textContent = status;
        if (status === 'CONNECTED') {
          this.statusElement.className = 'status text-[11px] px-2.5 py-0.5 rounded-full font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
          if (this.connectionElement) {
            this.connectionElement.textContent = 'Connected';
            this.connectionElement.className = 'font-bold text-emerald-400';
          }
          if (this.connectionMobile) {
            this.connectionMobile.textContent = 'Connected';
            this.connectionMobile.className = 'font-bold text-emerald-400';
          }
        } else if (status === 'CONNECTING') {
          this.statusElement.className = 'status text-[11px] px-2.5 py-0.5 rounded-full font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40';
          if (this.connectionElement) {
            this.connectionElement.textContent = 'Connecting';
            this.connectionElement.className = 'font-bold text-amber-400';
          }
          if (this.connectionMobile) {
            this.connectionMobile.textContent = 'Connecting';
            this.connectionMobile.className = 'font-bold text-amber-400';
          }
        } else {
          this.statusElement.className = 'status text-[11px] px-2.5 py-0.5 rounded-full font-mono font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40';
          if (this.connectionElement) {
            this.connectionElement.textContent = 'Disconnected';
            this.connectionElement.className = 'font-bold text-rose-400';
          }
          if (this.connectionMobile) {
            this.connectionMobile.textContent = 'Disconnected';
            this.connectionMobile.className = 'font-bold text-rose-400';
          }
        }
      }
    };

    // FPS update
    this.socketService.onFpsUpdate = (fps) => {
      const text = `${fps} FPS`;
      if (this.fpsElement) this.fpsElement.textContent = text;
      if (this.fpsMobile) this.fpsMobile.textContent = text;
    };

    // Frame received listener
    this.socketService.onFrameReceived = (frame, sensors) => {
      const countStr = String(this.socketService.frameCount);
      if (this.frameCountElement) this.frameCountElement.textContent = countStr;
      if (this.frameCountMobile) this.frameCountMobile.textContent = countStr;

      if (this.frameTimeElement) {
        this.frameTimeElement.textContent = frame.time || frame.timestamp || new Date().toLocaleTimeString();
      }

      // Normalize sensors payload to standard object map: { [sensorName]: sensorData }
      const normalizedSensors = {};

      if (Array.isArray(sensors)) {
        sensors.forEach((s, idx) => {
          const sName = s.name || s.id || s.sensorId || `Sensor${idx + 1}`;
          normalizedSensors[sName] = s;
        });
      } else if (typeof sensors === 'object' && sensors !== null) {
        for (const [key, val] of Object.entries(sensors)) {
          if (typeof val === 'object' && val !== null) {
            normalizedSensors[key] = val;
          }
        }
      }

      // Fallback if normalizedSensors is empty but frame has telemetry fields
      if (Object.keys(normalizedSensors).length === 0 && frame) {
        if (frame.qw !== undefined || frame.w !== undefined || frame.ax !== undefined || frame.accX !== undefined) {
          normalizedSensors['Sensor1'] = frame;
        }
      }

      const sensorNames = Object.keys(normalizedSensors);
      const sCountStr = String(sensorNames.length);
      if (this.sensorCountElement) this.sensorCountElement.textContent = sCountStr;
      if (this.sensorCountMobile) this.sensorCountMobile.textContent = sCountStr;

      // Update Live Telemetry Table
      this.updateSensorTable(normalizedSensors);

      // Update 3D IMU Cubes & Rigged FBX Human Model
      for (const name of sensorNames) {
        const data = normalizedSensors[name];
        this.imuManager.updateSensorData(name, data);
        this.humanModelManager.updateSensorData(name, data);
        // Feed into shake detector for calibration page
        this.sensorDetector.processSensorFrame(name, data);
      }

      // Show JSON if open
      if (this.jsonOutput && !this.jsonContainer.classList.contains('hidden')) {
        this.jsonOutput.textContent = JSON.stringify(frame, null, 2);
      }
    };
  }

  bindUIEvents() {
    // Reconnect Button
    if (this.btnConnect && this.wsUrlInput) {
      this.btnConnect.addEventListener('click', () => {
        const url = this.wsUrlInput.value.trim();
        if (url) {
          this.socketService.setUrl(url);
        }
      });
    }

    // Zero Calibration Button
    if (this.btnZero) {
      this.btnZero.addEventListener('click', () => {
        this.imuManager.calibrateZero();
        this.humanModelManager.calibrateZero();
      });
    }

    // Page Navigation Buttons
    if (this.btnNav3D) {
      this.btnNav3D.addEventListener('click', () => this.switchPage('3d'));
    }
    if (this.btnNavCalibration) {
      this.btnNavCalibration.addEventListener('click', () => this.switchPage('calibration'));
    }

    // Independent Visibility Toggle Buttons
    const modelActiveStyle = 'px-3 py-1.5 rounded-xl font-semibold transition-all bg-indigo-600/90 text-white shadow-lg shadow-indigo-500/20 flex items-center gap-1.5 border border-indigo-500/50';
    const modelInactiveStyle = 'px-3 py-1.5 rounded-xl font-medium transition-all bg-slate-900/60 text-slate-400 hover:text-white flex items-center gap-1.5 border border-white/10 opacity-60';

    const cubesActiveStyle = 'px-3 py-1.5 rounded-xl font-semibold transition-all bg-cyan-600/90 text-white shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 border border-cyan-500/50';
    const cubesInactiveStyle = 'px-3 py-1.5 rounded-xl font-medium transition-all bg-slate-900/60 text-slate-400 hover:text-white flex items-center gap-1.5 border border-white/10 opacity-60';

    const updateToggleUI = () => {
      const isModelVisible = this.humanModelManager.containerGroup.visible;
      const isCubesVisible = this.imuManager.containerGroup.visible;

      if (this.btnToggleModel) {
        this.btnToggleModel.className = isModelVisible ? modelActiveStyle : modelInactiveStyle;
      }
      if (this.btnToggleCubes) {
        this.btnToggleCubes.className = isCubesVisible ? cubesActiveStyle : cubesInactiveStyle;
      }
    };

    if (this.btnToggleModel) {
      this.btnToggleModel.addEventListener('click', () => {
        const nextVisible = !this.humanModelManager.containerGroup.visible;
        this.humanModelManager.setVisible(nextVisible);
        updateToggleUI();
      });
    }

    if (this.btnToggleCubes) {
      this.btnToggleCubes.addEventListener('click', () => {
        const nextVisible = !this.imuManager.containerGroup.visible;
        this.imuManager.setVisible(nextVisible);
        updateToggleUI();
      });
    }

    // Skeleton Visualizer Toggle Button
    if (this.btnSkeletonToggle) {
      this.btnSkeletonToggle.addEventListener('click', () => {
        const newVisible = !this.humanModelManager.showSkeleton;
        this.humanModelManager.setSkeletonVisible(newVisible);
        if (newVisible) {
          this.btnSkeletonToggle.classList.add('bg-purple-600/80', 'text-white');
        } else {
          this.btnSkeletonToggle.classList.remove('bg-purple-600/80', 'text-white');
        }
      });
    }

    // Custom FBX Upload Trigger
    if (this.btnUploadFbx && this.fbxFileInput) {
      this.btnUploadFbx.addEventListener('click', () => {
        this.fbxFileInput.click();
      });

      this.fbxFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.humanModelManager.loadFBXFromFile(file);
        }
      });
    }

    // Bone Mapping Modal Controls
    if (this.btnBoneMapping && this.boneMappingModal) {
      this.btnBoneMapping.addEventListener('click', () => {
        this.openBoneMappingModal();
      });
    }

    if (this.btnCloseBoneMapping && this.boneMappingModal) {
      this.btnCloseBoneMapping.addEventListener('click', () => {
        this.boneMappingModal.classList.add('hidden');
      });
    }

    if (this.btnSaveBoneMapping && this.boneMappingModal) {
      this.btnSaveBoneMapping.addEventListener('click', () => {
        this.saveBoneMappingFromModal();
        this.boneMappingModal.classList.add('hidden');
      });
    }

    if (this.btnModalExportJson) {
      this.btnModalExportJson.addEventListener('click', () => {
        this.humanModelManager.downloadMappingJson();
      });
    }

    if (this.btnModalImportJson && this.modalJsonFileInput) {
      this.btnModalImportJson.addEventListener('click', () => {
        this.modalJsonFileInput.click();
      });

      this.modalJsonFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            await this.humanModelManager.loadMappingFromFile(file);
            this.openBoneMappingModal();
          } catch (err) {
            console.error('[UIManager] Error importing modal JSON mapping:', err);
          }
          this.modalJsonFileInput.value = '';
        }
      });
    }

    // Toggle JSON Output visibility
    if (this.btnToggleJson && this.jsonContainer) {
      this.btnToggleJson.addEventListener('click', (e) => {
        e.stopPropagation();
        this.jsonContainer.classList.toggle('hidden');
      });
    }

    // Collapse/Expand Tray
    const toggleTray = () => {
      if (!this.trayContent) return;
      const isHidden = this.trayContent.classList.contains('hidden');
      if (isHidden) {
        this.trayContent.classList.remove('hidden');
        if (this.trayToggleLabel) this.trayToggleLabel.textContent = 'Collapse';
        if (this.trayToggleIcon) this.trayToggleIcon.classList.add('rotate-180');
      } else {
        this.trayContent.classList.add('hidden');
        if (this.trayToggleLabel) this.trayToggleLabel.textContent = 'Expand';
        if (this.trayToggleIcon) this.trayToggleIcon.classList.remove('rotate-180');
      }
    };

    if (this.btnToggleTray) {
      this.btnToggleTray.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleTray();
      });
    }

    if (this.trayHeader) {
      this.trayHeader.addEventListener('click', () => {
        toggleTray();
      });
    }
  }

  openBoneMappingModal() {
    if (!this.boneMappingModal || !this.boneMappingList) return;

    this.boneMappingList.innerHTML = '';
    const activeSensors = Object.keys(this.socketService.sensors);
    if (activeSensors.length === 0) {
      activeSensors.push('Sensor1', 'Sensor2', 'Sensor3', 'Sensor4', 'Sensor5', 'Sensor6', 'Sensor7');
    }

    const availableBones = Object.keys(MIXAMO_BONES);

    for (const sensorName of activeSensors) {
      const currentBone = this.humanModelManager.sensorBoneMap[sensorName] || '';

      const row = document.createElement('div');
      row.className = 'flex items-center justify-between gap-3 p-3 bg-slate-900/60 rounded-xl border border-white/5';

      let optionsHtml = '<option value="">-- Unmapped --</option>';
      for (const boneKey of availableBones) {
        const selected = currentBone === boneKey ? 'selected' : '';
        optionsHtml += `<option value="${boneKey}" ${selected}>${boneKey} (${MIXAMO_BONES[boneKey]})</option>`;
      }

      row.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
          <span class="font-mono text-xs font-bold text-indigo-300">${sensorName}</span>
        </div>
        <select data-sensor="${sensorName}" class="sensor-bone-select bg-slate-950 text-xs font-mono text-slate-200 px-3 py-1.5 rounded-xl border border-white/10 focus:outline-none focus:border-indigo-500">
          ${optionsHtml}
        </select>
      `;

      this.boneMappingList.appendChild(row);
    }

    this.boneMappingModal.classList.remove('hidden');
  }

  saveBoneMappingFromModal() {
    if (!this.boneMappingList) return;
    const selects = this.boneMappingList.querySelectorAll('.sensor-bone-select');

    selects.forEach((select) => {
      const sensorName = select.getAttribute('data-sensor');
      const boneKey = select.value;
      this.humanModelManager.setSensorBoneMapping(sensorName, boneKey);
    });
  }

  updateSensorTable(sensors) {
    if (!this.sensorTable) return;
    const names = Object.keys(sensors);

    if (names.length === 0) {
      this.sensorTable.innerHTML = `
        <tr>
          <td colspan="12" class="py-3 text-center text-slate-500 font-sans italic">
            No sensor payload found in message...
          </td>
        </tr>`;
      return;
    }

    this.sensorTable.innerHTML = '';

    for (const name of names) {
      const s = sensors[name] || {};
      const mappedBone = this.humanModelManager.sensorBoneMap[name] || 'Unmapped';

      const ax = s.ax ?? s.accX ?? (Array.isArray(s.acc) ? s.acc[0] : null);
      const ay = s.ay ?? s.accY ?? (Array.isArray(s.acc) ? s.acc[1] : null);
      const az = s.az ?? s.accZ ?? (Array.isArray(s.acc) ? s.acc[2] : null);

      const gx = s.gx ?? s.gyroX ?? (Array.isArray(s.gyro) ? s.gyro[0] : null);
      const gy = s.gy ?? s.gyroY ?? (Array.isArray(s.gyro) ? s.gyro[1] : null);
      const gz = s.gz ?? s.gyroZ ?? (Array.isArray(s.gyro) ? s.gyro[2] : null);

      const qw = s.qw ?? s.w ?? s.q0 ?? (Array.isArray(s.quat) ? s.quat[0] : null);
      const qx = s.qx ?? s.x ?? s.q1 ?? (Array.isArray(s.quat) ? s.quat[1] : null);
      const qy = s.qy ?? s.y ?? s.q2 ?? (Array.isArray(s.quat) ? s.quat[2] : null);
      const qz = s.qz ?? s.z ?? s.q3 ?? (Array.isArray(s.quat) ? s.quat[3] : null);

      const row = document.createElement('tr');
      row.className = 'hover:bg-white/5 transition-colors';

      row.innerHTML = `
        <td class="py-1.5 px-3 font-bold text-indigo-300">${name}</td>
        <td class="py-1.5 px-3 text-cyan-400 font-semibold">${mappedBone}</td>
        <td class="py-1.5 px-3">${this.formatValue(ax)}</td>
        <td class="py-1.5 px-3">${this.formatValue(ay)}</td>
        <td class="py-1.5 px-3">${this.formatValue(az)}</td>
        <td class="py-1.5 px-3">${this.formatValue(gx)}</td>
        <td class="py-1.5 px-3">${this.formatValue(gy)}</td>
        <td class="py-1.5 px-3">${this.formatValue(gz)}</td>
        <td class="py-1.5 px-3 font-semibold text-amber-300">${this.formatValue(qw)}</td>
        <td class="py-1.5 px-3">${this.formatValue(qx)}</td>
        <td class="py-1.5 px-3">${this.formatValue(qy)}</td>
        <td class="py-1.5 px-3">${this.formatValue(qz)}</td>
      `;

      this.sensorTable.appendChild(row);
    }
  }

  formatValue(val) {
    if (val === null || val === undefined || val === '') return '-';
    const num = Number(val);
    if (!isNaN(num)) return num.toFixed(4);
    return String(val);
  }

  initLilGui() {
    this.gui = new GUI({ title: '⚙️ BioMechanical Controls', width: 270 });
    this.gui.domElement.style.position = 'fixed';
    this.gui.domElement.style.top = '80px';
    this.gui.domElement.style.right = '16px';
    this.gui.domElement.style.zIndex = '40';
    this.gui.close();

    const humanFolder = this.gui.addFolder('Mixamo Human Rig');
    humanFolder.add({ showModel: true }, 'showModel').name('Show Human Model').onChange((v) => {
      this.humanModelManager.setVisible(v);
    });

    humanFolder.add(this.humanModelManager, 'showSkeleton').name('3D Skeleton Helper').onChange((v) => {
      this.humanModelManager.setSkeletonVisible(v);
    });

    humanFolder.add(this.humanModelManager, 'slerpFactor', 0.05, 1.0, 0.05).name('Smoothing (Slerp)');
    humanFolder.add({ calibrate: () => {
      this.imuManager.calibrateZero();
      this.humanModelManager.calibrateZero();
    }}, 'calibrate').name('🎯 Zero Reference');

    const imuFolder = this.gui.addFolder('IMU Motion Settings');
    imuFolder.add({ showCubes: true }, 'showCubes').name('Show 3D Cubes').onChange((v) => {
      this.imuManager.setVisible(v);
    });
    imuFolder.add(this.imuManager, 'slerpFactor', 0.05, 1.0, 0.05).name('Smoothing (Slerp)');
    imuFolder.add(this.imuManager, 'applyAccPosition').name('Acc Pos Bump');

    const axesFolder = this.gui.addFolder('🌍 Global Axes & Orientation');
    const presetOptions = [
      'Standard (Three.js)',
      'Z-Up (ROS/Unreal)',
      'Unity (Inverted Z)',
      'Aircraft (NED: North-East-Down)',
      'Custom'
    ];
    const axisChoiceOptions = ['+X', '-X', '+Y', '-Y', '+Z', '-Z'];

    const axesObj = {
      preset: globalAxisConfig.preset,
      axisX: globalAxisConfig.axisX,
      axisY: globalAxisConfig.axisY,
      axisZ: globalAxisConfig.axisZ,
      showWorldAxes: true,
    };

    const presetCtrl = axesFolder.add(axesObj, 'preset', presetOptions).name('Axis Preset').onChange((val) => {
      globalAxisConfig.setPreset(val);
      axesObj.axisX = globalAxisConfig.axisX;
      axesObj.axisY = globalAxisConfig.axisY;
      axesObj.axisZ = globalAxisConfig.axisZ;
      axisXCtrl.updateDisplay();
      axisYCtrl.updateDisplay();
      axisZCtrl.updateDisplay();
      this.humanModelManager.resetToTPose();
    });

    const axisXCtrl = axesFolder.add(axesObj, 'axisX', axisChoiceOptions).name('IMU X → World').onChange((val) => {
      globalAxisConfig.setCustomAxis('X', val);
      axesObj.preset = 'Custom';
      presetCtrl.updateDisplay();
    });

    const axisYCtrl = axesFolder.add(axesObj, 'axisY', axisChoiceOptions).name('IMU Y → World').onChange((val) => {
      globalAxisConfig.setCustomAxis('Y', val);
      axesObj.preset = 'Custom';
      presetCtrl.updateDisplay();
    });

    const axisZCtrl = axesFolder.add(axesObj, 'axisZ', axisChoiceOptions).name('IMU Z → World').onChange((val) => {
      globalAxisConfig.setCustomAxis('Z', val);
      axesObj.preset = 'Custom';
      presetCtrl.updateDisplay();
    });

    axesFolder.add(axesObj, 'showWorldAxes').name('Show Origin Axes Helper').onChange((v) => {
      if (this.sceneManager) {
        this.sceneManager.setWorldAxesVisible(v);
      }
    });

    const sceneFolder = this.gui.addFolder('Camera & 3-Point Lighting');
    sceneFolder.add({ resetCam: () => this.sceneManager.resetCamera() }, 'resetCam').name('Reset Camera');

    if (this.lights) {
      const presets = ['Studio Neutral', 'Cyberpunk Neon', 'Warm Sunset'];
      sceneFolder.add({ preset: 'Studio Neutral' }, 'preset', presets).name('3-Point Preset').onChange((p) => {
        this.lights.setPreset(p);
      });

      sceneFolder.add(this.lights.keyLight, 'intensity', 0, 8, 0.1).name('Key Light (Spot)');
      sceneFolder.add(this.lights.fillLight, 'intensity', 0, 5, 0.1).name('Fill Light (Soft)');
      sceneFolder.add(this.lights.rimLight, 'intensity', 0, 8, 0.1).name('Rim Light (Kicker)');
    }
  }
}
