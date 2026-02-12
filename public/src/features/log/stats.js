import { state } from '../../core/state.js';
import { updateTagList } from './tagFilter.js';

export function updateStats() {
  const counts = { VERBOSE: 0, DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, UNKNOWN: 0 };

  state.allEntries.forEach((e) => {
    counts[e.levelName] = (counts[e.levelName] || 0) + 1;
  });

  Object.keys(counts).forEach((level) => {
    const el = document.getElementById(`stat${level}`);
    if (el) el.textContent = counts[level];
  });

  const totalEl = document.getElementById('statTotal');
  if (totalEl) totalEl.textContent = state.allEntries.length;

  updateTagList();
}
