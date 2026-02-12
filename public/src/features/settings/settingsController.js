import { state } from '../../core/state.js';
import { hasTauri, invoke } from '../../services/tauriClient.js';

export async function loadSettings() {
  try {
    if (hasTauri()) {
      state.savePath = await invoke('get_save_path');
      const savePathInput = document.getElementById('savePathInput');
      if (savePathInput) savePathInput.value = state.savePath;
    }

    const savedFormat = localStorage.getItem('defaultExportFormat');
    if (savedFormat) state.defaultExportFormat = savedFormat;

    const savedInterval = localStorage.getItem('autoSaveInterval');
    if (savedInterval) state.autoSaveIntervalSeconds = parseInt(savedInterval, 10);

    const savedMode = localStorage.getItem('displayMode');
    if (savedMode) state.displayMode = savedMode;
  } catch (e) {
    console.error('加载设置失败:', e);
  }
}

