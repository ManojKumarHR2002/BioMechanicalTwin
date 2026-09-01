/**
 * StateSaveManager
 * Handles persistent state saving, auto-saving, and state restoration
 * for sensor bone mappings, WebSocket connection settings, UI visibility toggles,
 * and view states across browser sessions.
 */
export class StateSaveManager {
  constructor(humanModelManager, imuManager, socketService) {
    this.humanModelManager = humanModelManager;
    this.imuManager = imuManager;
    this.socketService = socketService;

    this.STORAGE_KEY = 'biomechanical_twin_app_state';
    this.LEGACY_MAPPING_KEY = 'biomechanical_twin_bone_mapping';
  }

  saveState(additionalData = {}) {
    try {
      const state = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        sensorBoneMap: this.humanModelManager ? this.humanModelManager.sensorBoneMap : {},
        wsUrl: this.socketService ? this.socketService.url : '',
        isModelVisible: this.humanModelManager && this.humanModelManager.containerGroup ? this.humanModelManager.containerGroup.visible : true,
        isCubesVisible: this.imuManager && this.imuManager.containerGroup ? this.imuManager.containerGroup.visible : true,
        showSkeleton: this.humanModelManager ? Boolean(this.humanModelManager.showSkeleton) : false,
        ...additionalData,
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state, null, 2));
      // Also write to legacy key for backwards compatibility
      if (this.humanModelManager && this.humanModelManager.sensorBoneMap) {
        localStorage.setItem(this.LEGACY_MAPPING_KEY, JSON.stringify(this.humanModelManager.sensorBoneMap, null, 2));
      }

      console.log('[StateSaveManager] Application state saved to localStorage:', state);
      return true;
    } catch (err) {
      console.error('[StateSaveManager] Error saving state to localStorage:', err);
      return false;
    }
  }

  loadState() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        // Fallback to legacy key if main state doesn't exist yet
        const legacyMapping = localStorage.getItem(this.LEGACY_MAPPING_KEY);
        if (legacyMapping && this.humanModelManager) {
          try {
            const parsed = JSON.parse(legacyMapping);
            if (parsed && typeof parsed === 'object') {
              this.humanModelManager.sensorBoneMap = parsed;
              if (typeof this.humanModelManager.rebuildAttachedIndicators === 'function') {
                this.humanModelManager.rebuildAttachedIndicators();
              }
            }
          } catch (e) {
            console.warn('[StateSaveManager] Legacy mapping parse error:', e);
          }
        }
        return false;
      }

      const state = JSON.parse(stored);
      if (!state || typeof state !== 'object') return false;

      // 1. Restore Sensor Bone Mappings
      if (state.sensorBoneMap && typeof state.sensorBoneMap === 'object' && this.humanModelManager) {
        this.humanModelManager.sensorBoneMap = { ...state.sensorBoneMap };
        if (typeof this.humanModelManager.rebuildAttachedIndicators === 'function') {
          this.humanModelManager.rebuildAttachedIndicators();
        }
      }

      // 2. Restore WebSocket Connection URL
      if (state.wsUrl && this.socketService) {
        this.socketService.url = state.wsUrl;
        const wsInput = document.getElementById('wsUrlInput');
        if (wsInput) wsInput.value = state.wsUrl;
      }

      // 3. Restore 3D Model Visibility
      if (typeof state.isModelVisible === 'boolean' && this.humanModelManager) {
        this.humanModelManager.setVisible(state.isModelVisible);
      }

      // 4. Restore IMU Cubes Visibility
      if (typeof state.isCubesVisible === 'boolean' && this.imuManager) {
        this.imuManager.setVisible(state.isCubesVisible);
      }

      // 5. Restore Skeleton Visualizer Visibility
      if (typeof state.showSkeleton === 'boolean' && this.humanModelManager) {
        this.humanModelManager.setSkeletonVisible(state.showSkeleton);
        const btnSkeleton = document.getElementById('btnSkeletonToggle');
        if (btnSkeleton) {
          if (state.showSkeleton) {
            btnSkeleton.classList.add('bg-purple-600/80', 'text-white');
          } else {
            btnSkeleton.classList.remove('bg-purple-600/80', 'text-white');
          }
        }
      }

      console.log('[StateSaveManager] State successfully loaded and restored from localStorage:', state);
      return state;
    } catch (err) {
      console.error('[StateSaveManager] Error loading state from localStorage:', err);
      return false;
    }
  }

  resetToDefaults() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.LEGACY_MAPPING_KEY);

      if (this.humanModelManager) {
        this.humanModelManager.resetMapping();
      }

      console.log('[StateSaveManager] Application state reset to defaults.');
      return true;
    } catch (err) {
      console.error('[StateSaveManager] Error resetting state:', err);
      return false;
    }
  }
}
