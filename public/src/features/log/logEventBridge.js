import { state } from '../../core/state.js';
import { hasTauri, listen } from '../../services/tauriClient.js';
import { parseLogLine } from './parser.js';
import { getElements } from '../../ui/dom.js';

export function initLogEventBridge() {
  if (!hasTauri()) return;

  listen('serial-data', (event) => {
    const entry = parseLogLine(
      event.payload,
      state.allEntries.length + state.pendingEntries.length
    );

    if (entry) {
      state.pendingEntries.push(entry);
      
      if (state.isViewLocked) {
        state.pendingMessageCount += 1;
        updatePendingUI();
      }
    }
  });
}

function updatePendingUI() {
  const el = getElements();
  if (el.pendingCountValue) {
    el.pendingCountValue.textContent = String(state.pendingMessageCount);
  }
  if (el.pendingCounter) {
    el.pendingCounter.style.display = state.pendingMessageCount > 0 ? 'flex' : 'none';
  }
  if (el.newDataToast) {
    el.newDataToast.style.display = 'flex';
  }
}
