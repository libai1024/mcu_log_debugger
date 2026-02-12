import { initDropdowns } from '../ui/dropdowns/initDropdowns.js';
import { setupEventListeners } from './events.js';
import { startBatchProcessing } from '../features/log/batchProcessing.js';
import { initLogEventBridge } from '../features/log/logEventBridge.js';
import { renderLogTable } from '../features/log/renderer.js';
import { updateStats } from '../features/log/stats.js';
import { setupToggleAllTags } from '../features/log/tagFilter.js';
import { loadSearchHistory } from '../features/search/history.js';
import { initSerial } from '../features/serial/serialController.js';
import { initTheme } from '../features/theme/theme.js';
import { initModeSwitcher } from '../features/displayMode/modeSwitcher.js';
import { loadSettings } from '../features/settings/settingsController.js';
import { setupSmartScroll } from '../features/scroll/smartScroll.js';
import { setupContextMenu } from '../features/contextMenu/contextMenu.js';
import { setupBookmarkPanel } from '../features/bookmarks/bookmarks.js';
import { setupSendPanel } from '../features/send/sendPanel.js';

export function bootstrap() {
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initDropdowns();
    loadSearchHistory();
    initModeSwitcher();

    initSerial();

    setupEventListeners();

    setupToggleAllTags();

    initLogEventBridge();

    setupSmartScroll();
    setupContextMenu();
    setupBookmarkPanel();
    setupSendPanel();

    startBatchProcessing({
      onFlush: () => {
        updateStats();
        renderLogTable();
      },
    });

    // Initial render
    updateStats();
    renderLogTable();

    // Async settings load
    loadSettings();
  });
}

