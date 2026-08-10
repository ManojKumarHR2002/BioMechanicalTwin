import GUI from 'lil-gui';

export class UIManager {
  constructor(sceneManager, imuManager, socketService) {
    this.sceneManager = sceneManager;
    this.imuManager = imuManager;
    this.socketService = socketService;

    this.initElements();
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
        this.frameTimeElement.textContent = frame.time || '-';
      }

      const sensorNames = Object.keys(sensors);
      const sCountStr = String(sensorNames.length);
      if (this.sensorCountElement) this.sensorCountElement.textContent = sCountStr;
      if (this.sensorCountMobile) this.sensorCountMobile.textContent = sCountStr;

      // Update 3D Cubes & Sensor Table
      this.updateSensorTable(sensors);

      for (const name of sensorNames) {
        this.imuManager.updateSensorData(name, sensors[name]);
      }

      // Show JSON if open
      if (this.jsonOutput && !this.jsonContainer.classList.contains('hidden')) {
        this.jsonOutput.textContent = JSON.stringify(frame, null, 4);
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

  updateSensorTable(sensors) {
    if (!this.sensorTable) return;
    const names = Object.keys(sensors);

    if (names.length === 0) {
      this.sensorTable.innerHTML = `
        <tr>
          <td colspan="11" class="py-3 text-center text-slate-500 font-sans italic">
            No sensor payload found in message...
          </td>
        </tr>`;
      return;
    }

    this.sensorTable.innerHTML = '';

    for (const name of names) {
      const s = sensors[name];
      const row = document.createElement('tr');
      row.className = 'hover:bg-white/5 transition-colors';

      row.innerHTML = `
        <td class="py-1.5 px-3 font-bold text-indigo-300">${name}</td>
        <td class="py-1.5 px-3">${this.formatValue(s.ax)}</td>
        <td class="py-1.5 px-3">${this.formatValue(s.ay)}</td>
        <td class="py-1.5 px-3">${this.formatValue(s.az)}</td>
        <td class="py-1.5 px-3">${this.formatValue(s.gx)}</td>
        <td class="py-1.5 px-3">${this.formatValue(s.gy)}</td>
        <td class="py-1.5 px-3">${this.formatValue(s.gz)}</td>
        <td class="py-1.5 px-3 font-semibold text-amber-300">${this.formatValue(s.qw)}</td>
        <td class="py-1.5 px-3">${this.formatValue(s.qx)}</td>
        <td class="py-1.5 px-3">${this.formatValue(s.qy)}</td>
        <td class="py-1.5 px-3">${this.formatValue(s.qz)}</td>
      `;

      this.sensorTable.appendChild(row);
    }
  }

  formatValue(val) {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'number') return val.toFixed(4);
    return val;
  }

  initLilGui() {
    this.gui = new GUI({ title: '⚙️ IMU Visualizer Controls', width: 260 });
    this.gui.domElement.style.position = 'fixed';
    this.gui.domElement.style.top = '80px';
    this.gui.domElement.style.right = '16px';
    this.gui.domElement.style.zIndex = '40';
    this.gui.close(); // Close by default so canvas is wide open

    const imuFolder = this.gui.addFolder('IMU Motion Settings');

    imuFolder.add(this.imuManager, 'slerpFactor', 0.05, 1.0, 0.05).name('Smoothing (Slerp)');
    imuFolder.add(this.imuManager, 'applyAccPosition').name('Acc Pos Bump');

    imuFolder.add({ calibrate: () => this.imuManager.calibrateZero() }, 'calibrate').name('🎯 Zero Reference');

    const sceneFolder = this.gui.addFolder('Camera & Lights');
    sceneFolder.add({ resetCam: () => this.sceneManager.resetCamera() }, 'resetCam').name('Reset Camera');
  }
}
