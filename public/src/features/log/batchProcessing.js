import { state } from '../../core/state.js';
import { MAX_LOG_ENTRIES, BATCH_INTERVAL } from '../../core/constants.js';

export function startBatchProcessing({ onFlush } = {}) {
  setInterval(() => {
    if (state.pendingEntries.length === 0) return;

    const toAdd = state.pendingEntries.splice(0, state.pendingEntries.length);
    toAdd.forEach((entry, i) => {
      entry.index = state.allEntries.length + i;
      entry.isNew = true;
    });

    state.allEntries.push(...toAdd);

    if (state.allEntries.length > MAX_LOG_ENTRIES) {
      state.allEntries = state.allEntries.slice(-MAX_LOG_ENTRIES);
    }

    if (typeof onFlush === 'function') onFlush(toAdd);

    setTimeout(() => {
      toAdd.forEach((entry) => {
        entry.isNew = false;
      });
    }, 400);
  }, BATCH_INTERVAL);
}
