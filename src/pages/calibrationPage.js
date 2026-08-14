import { MIXAMO_BONES } from '../components/humanModel.js';
import { globalAxisConfig } from '../axisConfig.js';

export const BONE_FRIENDLY_NAMES = {
  Head: 'Head',
  Neck: 'Neck',
  Spine2: 'Chest (Spine2)',
  Spine1: 'Mid Back (Spine1)',
  Spine: 'Lower Back (Spine)',
  Hips: 'Pelvis / Hips (Hips)',
  LeftShoulder: 'Left Shoulder',
  LeftArm: 'Left Upper Arm',
  LeftForeArm: 'Left Forearm',
  LeftHand: 'Left Hand',
  RightShoulder: 'Right Shoulder',
  RightArm: 'Right Upper Arm',
  RightForeArm: 'Right Forearm',
  RightHand: 'Right Hand',
  LeftUpLeg: 'Left Thigh (LeftUpLeg)',
  LeftLeg: 'Left Shin (LeftLeg)',
  LeftFoot: 'Left Foot',
  RightUpLeg: 'Right Thigh (RightUpLeg)',
  RightLeg: 'Right Shin (RightLeg)',
  RightFoot: 'Right Foot',
};

export class CalibrationPage {
  constructor(containerElement, humanModelManager, sensorDetector) {
    this.container = containerElement;
    this.humanModelManager = humanModelManager;
    this.sensorDetector = sensorDetector;

    this.selectedSensor = null;
    this.autoMapOnShake = true;
    this._toastTimer = null;

    this.initLayout();
    this.bindEvents();
  }

  initLayout() {
    this.container.innerHTML = `
      <div class="w-full max-w-7xl mx-auto p-4 sm:p-6 flex flex-col gap-6 animate-fade-in text-slate-100">
        
        <!-- Header Banner -->
        <div class="glass-panel p-5 rounded-3xl glow-indigo flex flex-wrap items-center justify-between gap-4 border border-indigo-500/20">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/30">
              ⚡
            </div>
            <div>
              <h2 class="text-lg sm:text-xl font-bold font-['Space_Grotesk'] text-white">
                Sensor Shake-to-Map Calibration Hub
              </h2>
              <p class="text-xs text-slate-400 font-light">
                Physically shake an IMU sensor to light it up, then map it to any body part on the avatar.
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2.5 flex-wrap">
            <label class="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-mono cursor-pointer select-none">
              <input type="checkbox" id="chkAutoMap" ${this.autoMapOnShake ? 'checked' : ''} class="accent-indigo-500 rounded w-4 h-4 cursor-pointer" />
              <span>Auto-Select Shaken</span>
            </label>

            <button id="btnExportJson" class="px-3 py-1.5 rounded-xl text-xs font-semibold text-cyan-300 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/30 border border-cyan-500/30 transition-all flex items-center gap-1" title="Export mapping to JSON file">
              <span>📥 Export JSON</span>
            </button>

            <button id="btnImportJson" class="px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-300 hover:text-white bg-purple-500/10 hover:bg-purple-500/30 border border-purple-500/30 transition-all flex items-center gap-1" title="Import mapping from JSON file">
              <span>📤 Import JSON</span>
            </button>
            <input type="file" id="jsonFileInput" accept=".json" class="hidden" />

            <button id="btnResetMappings" class="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/30 border border-rose-500/30 transition-all">
              Reset
            </button>
          </div>
        </div>

        <!-- Main Split Workspace -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <!-- LEFT: Active Sensor Cards Grid (5 Cols) -->
          <div class="lg:col-span-5 flex flex-col gap-4">
            <div class="flex items-center justify-between px-1">
              <h3 class="text-sm font-semibold font-['Space_Grotesk'] text-slate-300 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                Active IMU Sensors (<span id="activeSensorCount">0</span>)
              </h3>
              <span class="text-[11px] text-slate-400 font-mono">Shake to select</span>
            </div>

            <!-- Scrollable Window Panel for Sensors -->
            <div class="glass-panel p-3.5 rounded-3xl border border-white/10 shadow-2xl flex flex-col gap-2 min-h-[580px]">
              <div class="flex items-center justify-between px-2 pb-2 border-b border-white/10 text-[11px] font-mono text-slate-400">
                <span>Sensor ID & Status</span>
                <span>Mapped Bone Target</span>
              </div>

              <div id="sensorGridContainer" class="flex flex-col gap-3 max-h-[520px] overflow-y-auto no-scrollbar pr-1">
                <p class="text-xs text-slate-500 italic text-center py-10">
                  Waiting for WebSocket IMU telemetry stream...
                </p>
              </div>
            </div>
          </div>

          <!-- RIGHT: Interactive 2D Human Mannequin & Bone Picker (7 Cols) -->
          <div class="lg:col-span-7 flex flex-col gap-4">
            <div class="flex items-center justify-between px-1">
              <h3 class="text-sm font-semibold font-['Space_Grotesk'] text-slate-300 flex items-center gap-2">
                <span>🧍 Target Body Rig Mapping</span>
              </h3>
              <span id="selectedSensorBadge" class="text-xs font-mono font-bold px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                No Sensor Selected
              </span>
            </div>

            <div class="glass-panel p-5 rounded-3xl border border-white/10 flex flex-col md:flex-row gap-6 items-center justify-between min-h-[580px]">
              
              <!-- 2D Interactive Anatomical Vector Body -->
              <div class="relative w-full max-w-[320px] h-[520px] flex items-center justify-center select-none">
                <svg id="bodyDiagramSvg" viewBox="0 0 340 560" class="w-full h-full drop-shadow-2xl">
                  <defs>
                    <linearGradient id="bodyBaseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#1e293b" />
                      <stop offset="100%" stop-color="#0f172a" />
                    </linearGradient>
                    <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  <!-- Body Silhouette / Contour -->
                  <g fill="none" stroke="rgba(148, 163, 184, 0.25)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <!-- Head & Neck -->
                    <path d="M170,18 C150,18 140,32 140,50 C140,68 152,78 160,82 L160,94 L180,94 L180,82 C188,78 200,68 200,50 C200,32 190,18 170,18 Z" />
                    
                    <!-- Torso -->
                    <path d="M140,96 L110,108 L95,125 L92,160 L120,165 L125,230 L115,255 L225,255 L215,230 L220,165 L248,160 L245,125 L230,108 L200,96 Z" />
                    
                    <!-- Left Arm Line -->
                    <path d="M92,160 L78,215 L62,275" />
                    <!-- Right Arm Line -->
                    <path d="M248,160 L262,215 L278,275" />

                    <!-- Left Leg Line -->
                    <path d="M135,255 L130,370 L125,480 L108,505" />
                    <!-- Right Leg Line -->
                    <path d="M205,255 L210,370 L215,480 L232,505" />
                  </g>

                  <!-- Clickable Anatomical Bone Target Regions -->
                  
                  <!-- HEAD -->
                  <g class="bone-zone group cursor-pointer" data-bone="Head">
                    <circle cx="170" cy="48" r="26" class="zone-bg fill-slate-900/90 stroke-slate-600 stroke-2 transition-all group-hover:fill-indigo-600/40 group-hover:stroke-indigo-400" />
                    <text x="170" y="52" text-anchor="middle" class="zone-text text-[11px] font-mono font-bold fill-slate-300 group-hover:fill-white pointer-events-none">Head</text>
                  </g>

                  <!-- CHEST (Spine2) -->
                  <g class="bone-zone group cursor-pointer" data-bone="Spine2">
                    <rect x="135" y="112" width="70" height="42" rx="10" class="zone-bg fill-slate-900/90 stroke-slate-600 stroke-2 transition-all group-hover:fill-indigo-600/40 group-hover:stroke-indigo-400" />
                    <text x="170" y="130" text-anchor="middle" class="zone-text text-[11px] font-mono font-bold fill-slate-300 group-hover:fill-white pointer-events-none">Chest</text>
                    <text x="170" y="144" text-anchor="middle" class="text-[9px] font-mono fill-slate-500 pointer-events-none">Spine2</text>
                  </g>

                  <!-- SPINE (Lower Back) -->
                  <g class="bone-zone group cursor-pointer" data-bone="Spine">
                    <rect x="145" y="162" width="50" height="34" rx="8" class="zone-bg fill-slate-900/90 stroke-slate-600 stroke-2 transition-all group-hover:fill-indigo-600/40 group-hover:stroke-indigo-400" />
                    <text x="170" y="183" text-anchor="middle" class="zone-text text-[10px] font-mono font-bold fill-slate-300 group-hover:fill-white pointer-events-none">Spine</text>
                  </g>

                  <!-- HIPS / PELVIS -->
                  <g class="bone-zone group cursor-pointer" data-bone="Hips">
                    <rect x="135" y="204" width="70" height="40" rx="10" class="zone-bg fill-slate-900/90 stroke-slate-600 stroke-2 transition-all group-hover:fill-indigo-600/40 group-hover:stroke-indigo-400" />
                    <text x="170" y="222" text-anchor="middle" class="zone-text text-[11px] font-mono font-bold fill-slate-300 group-hover:fill-white pointer-events-none">Hips</text>
                    <text x="170" y="235" text-anchor="middle" class="text-[9px] font-mono fill-slate-500 pointer-events-none">Pelvis</text>
                  </g>

                  <!-- LEFT UPPER ARM -->
                  <g class="bone-zone group cursor-pointer" data-bone="LeftArm">
                    <rect x="68" y="125" width="46" height="46" rx="10" class="zone-bg fill-slate-900/90 stroke-slate-600 stroke-2 transition-all group-hover:fill-indigo-600/40 group-hover:stroke-indigo-400" />
                    <text x="91" y="146" text-anchor="middle" class="zone-text text-[10px] font-mono font-bold fill-slate-300 group-hover:fill-white pointer-events-none">L Arm</text>
                    <text x="91" y="158" text-anchor="middle" class="text-[8px] font-mono fill-slate-500 pointer-events-none">Upper</text>
                  </g>

                  <!-- LEFT FOREARM -->
                  <g class="bone-zone group cursor-pointer" data-bone="LeftForeArm">
                    <rect x="52" y="186" width="48" height="48" rx="10" class="zone-bg fill-slate-900/90 stroke-slate-600 stroke-2 transition-all group-hover:fill-indigo-600/40 group-hover:stroke-indigo-400" />
                    <text x="76" y="208" text-anchor="middle" class="zone-text text-[10px] font-mono font-bold fill-slate-300 group-hover:fill-white pointer-events-none">L Forearm</text>
                  </g>

                  <!-- LEFT HAND -->
                  <g class="bone-zone group cursor-pointer" data-bone="LeftHand">
                    <circle cx="56" cy="265" r="18" class="zone-bg fill-slate-900/90 stroke-slate-600 stroke-2 transition-all group-hover:fill-indigo-600/40 group-hover:stroke-indigo-400" />
                    <text x="56" y="269" text-anchor="middle" class="zone-text text-[9px] font-mono font-bold fill-slate-300 group-hover:fill-white pointer-events-none">L Hand</text>
                  </g>

                  <!-- RIGHT UPPER ARM -->
                  <g class="bone-zone group cursor-pointer" data-bone="RightArm">
                    <rect x="226" y="125" width="46" height="46" rx="10" class="zone-bg fill-slate-900/90 stroke-slate-600 stroke-2 transition-all group-hover:fill-indigo-600/40 group-hover:stroke-indigo-400" />
                    <text x="249" y="146" text-anchor="middle" class="zone-text text-[10px] font-mono font-bold fill-slate-300 group-hover:fill-white pointer-events-none">R Arm</text>
                    <text x="249" y="158" text-anchor="middle" class="text-[8px] font-mono fill-slate-500 pointer-events-none">Upper</text>
                  </g>

                  <!-- RIGHT FOREARM -->
                  <g class="bone-zone group cursor-pointer" data-bone="RightForeArm">
                    <rect x="240" y="186" width="48" height="48" rx="10" class="zone-bg fill-slate-900/90 stroke-slate-600 stroke-2 transition-all group-hover:fill-indigo-600/40 group-hover:stroke-indigo-400" />
                    <text x="264" y="208" text-anchor="middle" class="zone-text text-[10px] font-mono font-bold fill-slate-300 group-hover:fill-white pointer-events-none">R Forearm</text>
                  </g>

                  <!-- RIGHT HAND -->
                  <g class="bone-zone group cursor-pointer" data-bone="RightHand">
                    <circle cx="284" cy="265" r="18" class="zone-bg fill-slate-900/90 stroke-slate-600 stroke-2 transition-all group-hover:fill-indigo-600/40 group-hover:stroke-indigo-400" />
                    <text x="284" y="269" text-anchor="middle" class="zone-text text-[9px] font-mono font-bold fill-slate-300 group-hover:fill-white pointer-events-none">R Hand</text>
                  </g>

                  <!-- LEFT THIGH (LeftUpLeg) -->
                  <g class="bone-zone group cursor-pointer" data-bone="LeftUpLeg">
                    <rect x="108" y="270" width="50" height="60" rx="12" class="zone-bg fill-slate-900/90 stroke-slate-600 stroke-2 transition-all group-hover:fill-indigo-600/40 group-hover:stroke-indigo-400" />
                    <text x="133" y="298" text-anchor="middle" class="zone-text text-[10px] font-mono font-bold fill-slate-300 group-hover:fill-white pointer-events-none">L Thigh</text>
                    <text x="133" y="310" text-anchor="middle" class="text-[8px] font-mono fill-slate-500 pointer-events-none">UpLeg</text>
                  </g>

                  <!-- LEFT SHIN (LeftLeg) -->
                  <g class="bone-zone group cursor-pointer" data-bone="LeftLeg">
                    <rect x="105" y="360" width="48" height="65" rx="12" class="zone-bg fill-slate-900/90 stroke-slate-600 stroke-2 transition-all group-hover:fill-indigo-600/40 group-hover:stroke-indigo-400" />
                    <text x="129" y="390" text-anchor="middle" class="zone-text text-[10px] font-mono font-bold fill-slate-300 group-hover:fill-white pointer-events-none">L Shin</text>
                    <text x="129" y="402" text-anchor="middle" class="text-[8px] font-mono fill-slate-500 pointer-events-none">Leg</text>
                  </g>

                  <!-- LEFT FOOT -->
                  <g class="bone-zone group cursor-pointer" data-bone="LeftFoot">
                    <rect x="88" y="465" width="50" height="34" rx="8" class="zone-bg fill-slate-900/90 stroke-slate-600 stroke-2 transition-all group-hover:fill-indigo-600/40 group-hover:stroke-indigo-400" />
                    <text x="113" y="486" text-anchor="middle" class="zone-text text-[9px] font-mono font-bold fill-slate-300 group-hover:fill-white pointer-events-none">L Foot</text>
                  </g>

                  <!-- RIGHT THIGH (RightUpLeg) -->
                  <g class="bone-zone group cursor-pointer" data-bone="RightUpLeg">
                    <rect x="182" y="270" width="50" height="60" rx="12" class="zone-bg fill-slate-900/90 stroke-slate-600 stroke-2 transition-all group-hover:fill-indigo-600/40 group-hover:stroke-indigo-400" />
                    <text x="207" y="298" text-anchor="middle" class="zone-text text-[10px] font-mono font-bold fill-slate-300 group-hover:fill-white pointer-events-none">R Thigh</text>
                    <text x="207" y="310" text-anchor="middle" class="text-[8px] font-mono fill-slate-500 pointer-events-none">UpLeg</text>
                  </g>

                  <!-- RIGHT SHIN (RightLeg) -->
                  <g class="bone-zone group cursor-pointer" data-bone="RightLeg">
                    <rect x="187" y="360" width="48" height="65" rx="12" class="zone-bg fill-slate-900/90 stroke-slate-600 stroke-2 transition-all group-hover:fill-indigo-600/40 group-hover:stroke-indigo-400" />
                    <text x="211" y="390" text-anchor="middle" class="zone-text text-[10px] font-mono font-bold fill-slate-300 group-hover:fill-white pointer-events-none">R Shin</text>
                    <text x="211" y="402" text-anchor="middle" class="text-[8px] font-mono fill-slate-500 pointer-events-none">Leg</text>
                  </g>

                  <!-- RIGHT FOOT -->
                  <g class="bone-zone group cursor-pointer" data-bone="RightFoot">
                    <rect x="202" y="465" width="50" height="34" rx="8" class="zone-bg fill-slate-900/90 stroke-slate-600 stroke-2 transition-all group-hover:fill-indigo-600/40 group-hover:stroke-indigo-400" />
                    <text x="227" y="486" text-anchor="middle" class="zone-text text-[9px] font-mono font-bold fill-slate-300 group-hover:fill-white pointer-events-none">R Foot</text>
                  </g>
                </svg>
              </div>

              <!-- Quick List Selection / Bone Matrix Grid -->
              <div class="flex-1 w-full flex flex-col gap-3">
                <div class="flex items-center justify-between pb-2 border-b border-white/10">
                  <span class="text-xs font-semibold text-slate-300">Quick Bone Selector</span>
                  <span class="text-[10px] text-slate-500 font-mono">Mixamo Standard Rig</span>
                </div>

                <div id="boneButtonsList" class="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[460px] overflow-y-auto no-scrollbar pr-1">
                  <!-- Injected dynamically based on MIXAMO_BONES -->
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    `;

    this.gridContainer = this.container.querySelector('#sensorGridContainer');
    this.sensorCountEl = this.container.querySelector('#activeSensorCount');
    this.selectedBadge = this.container.querySelector('#selectedSensorBadge');
    this.bodyDiagramSvg = this.container.querySelector('#bodyDiagramSvg');
    this.boneButtonsList = this.container.querySelector('#boneButtonsList');

    this.initBoneButtons();
  }

  assignBoneToTarget(boneKey) {
    let sensorToAssign = this.selectedSensor;

    if (!sensorToAssign) {
      const states = this.sensorDetector.getAllStates();
      if (states.length > 0) {
        const shaking = states.find((s) => s.isShaking);
        const unmapped = states.find((s) => !this.humanModelManager.sensorBoneMap[s.name]);
        sensorToAssign = shaking ? shaking.name : unmapped ? unmapped.name : states[0].name;
      } else {
        const keys = Object.keys(this.humanModelManager.sensorBoneMap);
        sensorToAssign = keys.length > 0 ? keys[0] : 'Sensor1';
      }
      this.selectedSensor = sensorToAssign;
    }

    if (sensorToAssign && boneKey) {
      this.humanModelManager.setSensorBoneMapping(sensorToAssign, boneKey);
      const friendlyName = BONE_FRIENDLY_NAMES[boneKey] || boneKey;
      this.showToast(`Mapped ${sensorToAssign} → ${friendlyName}`);
      this.updateView();
    }
  }

  showToast(msg) {
    let toast = document.getElementById('calibrationToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'calibrationToast';
      toast.className = 'fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-2xl bg-indigo-600/90 text-white font-mono text-xs font-bold border border-indigo-400 shadow-2xl shadow-indigo-500/50 backdrop-blur-md animate-fade-in flex items-center gap-2 pointer-events-none';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span><span>${msg}</span>`;
    toast.classList.remove('hidden');

    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 2500);
  }

  initBoneButtons() {
    if (!this.boneButtonsList) return;
    this.boneButtonsList.innerHTML = '';

    for (const [boneKey, mixamoName] of Object.entries(MIXAMO_BONES)) {
      const friendlyLabel = BONE_FRIENDLY_NAMES[boneKey] || boneKey;
      const btn = document.createElement('button');
      btn.className = 'bone-select-btn px-2.5 py-2 rounded-xl text-[11px] font-mono font-medium text-left transition-all bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/5 hover:border-indigo-500/40 flex flex-col gap-0.5';
      btn.setAttribute('data-bone', boneKey);
      btn.innerHTML = `
        <span class="font-bold text-white">${boneKey}</span>
        <span class="text-[9px] text-slate-400 truncate">${friendlyLabel}</span>
        <span class="text-[9px] text-slate-500 truncate mapped-indicator">Unmapped</span>
      `;

      btn.addEventListener('click', () => {
        this.assignBoneToTarget(boneKey);
      });

      this.boneButtonsList.appendChild(btn);
    }
  }

  bindEvents() {
    const chkAutoMap = this.container.querySelector('#chkAutoMap');
    if (chkAutoMap) {
      chkAutoMap.addEventListener('change', (e) => {
        this.autoMapOnShake = e.target.checked;
      });
    }

    const btnReset = this.container.querySelector('#btnResetMappings');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.humanModelManager.resetMapping();
        this.updateView();
      });
    }

    const btnExportJson = this.container.querySelector('#btnExportJson');
    if (btnExportJson) {
      btnExportJson.addEventListener('click', () => {
        this.humanModelManager.downloadMappingJson();
      });
    }

    const btnImportJson = this.container.querySelector('#btnImportJson');
    const jsonFileInput = this.container.querySelector('#jsonFileInput');
    if (btnImportJson && jsonFileInput) {
      btnImportJson.addEventListener('click', () => jsonFileInput.click());
      jsonFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            await this.humanModelManager.loadMappingFromFile(file);
            this.updateView();
          } catch (err) {
            console.error('[CalibrationPage] Error reading JSON mapping file:', err);
          }
          jsonFileInput.value = '';
        }
      });
    }

    // SVG bone zones click listener
    if (this.bodyDiagramSvg) {
      this.bodyDiagramSvg.addEventListener('click', (e) => {
        const zone = e.target.closest('.bone-zone');
        if (!zone) return;
        const boneKey = zone.getAttribute('data-bone');
        if (boneKey) {
          this.assignBoneToTarget(boneKey);
        }
      });
    }

    // Sensor Shake listener hook
    this.sensorDetector.onSensorShaken = (sensorName, intensity) => {
      if (this.autoMapOnShake) {
        this.selectedSensor = sensorName;
      }
      this.updateView();
    };

    // Sensor update frame hook
    this.sensorDetector.onSensorUpdated = () => {
      this.updateSensorGauges();
    };
  }

  setSelectedSensor(sensorName) {
    this.selectedSensor = sensorName;
    this.updateView();
  }

  _autoDetectBoneMapping(sensorName) {
    if (!sensorName) return '';
    const nameUpper = String(sensorName).toUpperCase();
    if (nameUpper.includes('R_FA') || nameUpper.includes('RIGHTFOREARM')) return 'RightForeArm';
    if (nameUpper.includes('L_FA') || nameUpper.includes('LEFTFOREARM')) return 'LeftForeArm';
    if (nameUpper.includes('R_UA') || nameUpper.includes('R_ARM') || nameUpper.includes('RIGHTARM')) return 'RightArm';
    if (nameUpper.includes('L_UA') || nameUpper.includes('L_ARM') || nameUpper.includes('LEFTARM')) return 'LeftArm';
    if (nameUpper.includes('R_SH') || nameUpper.includes('RIGHTSHOULDER')) return 'RightShoulder';
    if (nameUpper.includes('L_SH') || nameUpper.includes('LEFTSHOULDER')) return 'LeftShoulder';
    if (nameUpper.includes('R_TH') || nameUpper.includes('RIGHTTHIGH') || nameUpper.includes('RIGHTUPLEG')) return 'RightUpLeg';
    if (nameUpper.includes('L_TH') || nameUpper.includes('LEFTTHIGH') || nameUpper.includes('LEFTUPLEG')) return 'LeftUpLeg';
    if (nameUpper.includes('R_LEG') || nameUpper.includes('R_SHIN') || nameUpper.includes('RIGHTLEG')) return 'RightLeg';
    if (nameUpper.includes('L_LEG') || nameUpper.includes('L_SHIN') || nameUpper.includes('LEFTLEG')) return 'LeftLeg';
    if (nameUpper.includes('HEAD')) return 'Head';
    if (nameUpper.includes('CHEST') || nameUpper.includes('SPINE2')) return 'Spine2';
    if (nameUpper.includes('HIPS') || nameUpper.includes('PELVIS')) return 'Hips';
    return '';
  }

  updateView() {
    if (!this.gridContainer) return;

    let sensorStates = this.sensorDetector.getAllStates();
    let finalSensorList = [];

    if (sensorStates.length > 0) {
      // Live stream active: Show ONLY the active live telemetry sensors
      finalSensorList = sensorStates.map((s) => ({
        ...s,
        isLive: true,
      }));
    } else {
      // Offline / Waiting for stream: Show placeholder sensors from saved mapping or defaults
      const mappedSensorNames = Object.keys(this.humanModelManager.sensorBoneMap);
      const sensorNames = mappedSensorNames.length > 0
        ? mappedSensorNames
        : ['Sensor1', 'Sensor2', 'Sensor3', 'Sensor4', 'Sensor5', 'Sensor6', 'Sensor7'];

      finalSensorList = sensorNames.map((sName) => ({
        name: sName,
        accMag: 0,
        gyroMag: 0,
        intensity: 0,
        isShaking: false,
        isLive: false,
      }));
    }

    if (this.sensorCountEl) {
      this.sensorCountEl.textContent = String(finalSensorList.length);
    }

    // Update selected sensor badge
    if (this.selectedBadge) {
      if (this.selectedSensor) {
        const mappedBone = this.humanModelManager.sensorBoneMap[this.selectedSensor] || 'Unmapped';
        this.selectedBadge.textContent = `Targeting: ${this.selectedSensor} (${mappedBone})`;
        this.selectedBadge.className = 'text-xs font-mono font-bold px-3 py-1 rounded-full bg-indigo-600 text-white border border-indigo-400 shadow-md shadow-indigo-500/30';
      } else {
        this.selectedBadge.textContent = 'No Sensor Selected';
        this.selectedBadge.className = 'text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700';
      }
    }

    // Render scrollable sensor cards list
    this.gridContainer.innerHTML = '';
    const availableBones = Object.keys(MIXAMO_BONES);

    for (const state of finalSensorList) {
      const isSelected = this.selectedSensor === state.name;
      const isShaking = state.isShaking;
      let mappedBone = this.humanModelManager.sensorBoneMap[state.name] || '';

      if (!mappedBone && state.isLive) {
        mappedBone = this._autoDetectBoneMapping(state.name);
        if (mappedBone) {
          this.humanModelManager.setSensorBoneMapping(state.name, mappedBone);
        }
      }

      const card = document.createElement('div');
      let baseClass = 'glass-panel p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col gap-2 relative shrink-0 ';
      if (isShaking) {
        baseClass += 'border-pink-500 bg-pink-950/40 shadow-xl shadow-pink-500/30 ring-2 ring-pink-500 animate-pulse ';
      } else if (isSelected) {
        baseClass += 'border-indigo-500 bg-indigo-950/40 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-400 ';
      } else {
        baseClass += 'border-white/10 hover:border-indigo-500/40 hover:bg-slate-900/60 ';
      }

      card.className = baseClass;

      let boneOptionsHtml = '<option value="">-- Unmapped --</option>';
      for (const [bKey, friendlyName] of Object.entries(BONE_FRIENDLY_NAMES)) {
        const sel = mappedBone === bKey ? 'selected' : '';
        boneOptionsHtml += `<option value="${bKey}" ${sel}>${friendlyName}</option>`;
      }

      card.innerHTML = `
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="w-2.5 h-2.5 rounded-full shrink-0 ${isShaking ? 'bg-pink-400 animate-ping' : state.isLive ? 'bg-emerald-400' : 'bg-cyan-500'}"></span>
            <span class="font-mono text-xs font-bold text-white truncate">${state.name}</span>
            ${isShaking ? '<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-pink-600 text-white animate-bounce shrink-0">SHAKING</span>' : ''}
          </div>

          <select data-sensor="${state.name}" class="card-bone-select bg-slate-950 text-[11px] font-mono text-cyan-300 px-2 py-1 rounded-xl border border-white/10 focus:outline-none focus:border-indigo-500 shrink-0 max-w-[160px] truncate">
            ${boneOptionsHtml}
          </select>
        </div>

        <div class="flex items-center justify-between gap-2 font-mono text-[10px]">
          <div class="flex-1 min-w-0">
            <div class="flex justify-between mb-0.5 text-slate-400">
              <span>Accel G-Force:</span>
              <span id="accVal-${state.name}" class="font-bold text-amber-300">${state.accMag ? state.accMag.toFixed(2) : '0.00'} m/s²</span>
            </div>
            <div class="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
              <div id="accBar-${state.name}" class="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-pink-500 transition-all duration-150" style="width: ${Math.min(100, (state.accMag / 20) * 100)}%"></div>
            </div>
          </div>

          <button class="btn-select-for-map shrink-0 px-2.5 py-1 rounded-xl text-[10px] font-mono font-semibold ${isSelected ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/15'} border border-white/10 transition-all">
            ${isSelected ? '✓ Selected' : 'Target'}
          </button>
        </div>
      `;

      // Select dropdown handler inside scrollable list card
      const selectEl = card.querySelector('.card-bone-select');
      if (selectEl) {
        selectEl.addEventListener('change', (e) => {
          e.stopPropagation();
          const selectedBone = e.target.value;
          this.humanModelManager.setSensorBoneMapping(state.name, selectedBone);
          this.updateView();
        });
        selectEl.addEventListener('click', (e) => e.stopPropagation());
      }

      // Card select handler
      card.addEventListener('click', () => {
        this.setSelectedSensor(state.name);
      });

      this.gridContainer.appendChild(card);
    }

    // Update SVG & Button Highlighting
    this.updateHighlighting();
  }

  updateHighlighting() {
    const reverseMap = {};
    for (const [sName, bKey] of Object.entries(this.humanModelManager.sensorBoneMap)) {
      if (bKey) reverseMap[bKey] = sName;
    }

    const currentSelectedBone = this.selectedSensor ? this.humanModelManager.sensorBoneMap[this.selectedSensor] : null;

    // SVG Zones
    if (this.bodyDiagramSvg) {
      const zones = this.bodyDiagramSvg.querySelectorAll('.bone-zone');
      zones.forEach((zone) => {
        const boneKey = zone.getAttribute('data-bone');
        const bg = zone.querySelector('.zone-bg');
        const text = zone.querySelector('.zone-text');
        const mappedSensor = reverseMap[boneKey];
        const isCurrentSelected = boneKey === currentSelectedBone;

        if (isCurrentSelected) {
          bg.setAttribute('class', 'zone-bg fill-indigo-600 stroke-indigo-300 stroke-2 transition-all');
          text.setAttribute('class', 'zone-text text-[11px] font-mono font-bold fill-white pointer-events-none');
        } else if (mappedSensor) {
          bg.setAttribute('class', 'zone-bg fill-emerald-600/60 stroke-emerald-400 stroke-2 transition-all');
          text.setAttribute('class', 'zone-text text-[11px] font-mono font-bold fill-emerald-100 pointer-events-none');
        } else {
          bg.setAttribute('class', 'zone-bg fill-slate-900/90 stroke-slate-600 stroke-2 transition-all group-hover:fill-indigo-600/40 group-hover:stroke-indigo-400');
          text.setAttribute('class', 'zone-text text-[10px] font-mono font-bold fill-slate-300 group-hover:fill-white pointer-events-none');
        }
      });
    }

    // Quick Select Buttons
    if (this.boneButtonsList) {
      const buttons = this.boneButtonsList.querySelectorAll('.bone-select-btn');
      buttons.forEach((btn) => {
        const boneKey = btn.getAttribute('data-bone');
        const mappedSensor = reverseMap[boneKey];
        const indicator = btn.querySelector('.mapped-indicator');
        const isCurrentSelected = boneKey === currentSelectedBone;

        if (isCurrentSelected) {
          btn.className = 'bone-select-btn px-2.5 py-2 rounded-xl text-[11px] font-mono font-medium text-left transition-all bg-indigo-600 text-white border border-indigo-400 shadow-md shadow-indigo-500/30 flex flex-col gap-0.5';
          if (indicator) {
            indicator.textContent = `🎯 ${this.selectedSensor}`;
            indicator.className = 'text-[9px] text-indigo-200 truncate mapped-indicator font-bold';
          }
        } else if (mappedSensor) {
          btn.className = 'bone-select-btn px-2.5 py-2 rounded-xl text-[11px] font-mono font-medium text-left transition-all bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 flex flex-col gap-0.5';
          if (indicator) {
            indicator.textContent = `✓ ${mappedSensor}`;
            indicator.className = 'text-[9px] text-emerald-400 truncate mapped-indicator';
          }
        } else {
          btn.className = 'bone-select-btn px-2.5 py-2 rounded-xl text-[11px] font-mono font-medium text-left transition-all bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/5 hover:border-indigo-500/40 flex flex-col gap-0.5';
          if (indicator) {
            indicator.textContent = 'Unmapped';
            indicator.className = 'text-[9px] text-slate-500 truncate mapped-indicator';
          }
        }
      });
    }
  }

  updateSensorGauges() {
    const states = this.sensorDetector.getAllStates();
    for (const state of states) {
      const accVal = this.container.querySelector(`#accVal-${state.name}`);
      const accBar = this.container.querySelector(`#accBar-${state.name}`);

      if (accVal) accVal.textContent = `${state.accMag.toFixed(2)} m/s²`;
      if (accBar) accBar.style.width = `${Math.min(100, (state.accMag / 20) * 100)}%`;
    }
  }
}
