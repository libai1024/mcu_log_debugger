import { state } from '../../core/state.js';
import { getElements } from '../../ui/dom.js';
import { toggleBookmark } from '../bookmarks/bookmarks.js';
import { renderLogTable } from '../log/renderer.js';
import { showStatus } from '../../ui/toast.js';

let contextMenuTarget = null;

export function setupContextMenu() {
  const el = getElements();
  if (!el.logBody || !el.contextMenu) return;

  el.logBody.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const row = e.target.closest('.log-row');
    if (!row) return;

    contextMenuTarget = row;
    el.contextMenu.style.display = 'block';
    el.contextMenu.style.left = `${e.pageX}px`;
    el.contextMenu.style.top = `${e.pageY}px`;
  });

  document.addEventListener('click', () => {
    el.contextMenu.style.display = 'none';
  });

  el.ctxBookmark?.addEventListener('click', () => {
    if (!contextMenuTarget) return;
    toggleBookmark(contextMenuTarget.dataset.id);
    renderLogTable();
  });

  el.ctxCopy?.addEventListener('click', async () => {
    const entry = getTargetEntry();
    if (!entry) return;
    await navigator.clipboard.writeText(entry.message);
    showStatus('已复制消息内容', 'success');
  });

  el.ctxCopyRow?.addEventListener('click', async () => {
    const entry = getTargetEntry();
    if (!entry) return;
    await navigator.clipboard.writeText(entry.rawLine);
    showStatus('已复制整行', 'success');
  });

  el.ctxFilterTag?.addEventListener('click', () => {
    const entry = getTargetEntry();
    if (!entry) return;

    el.tagList?.querySelectorAll('input').forEach((cb) => {
      cb.checked = cb.value === entry.tag;
    });

    renderLogTable();
    showStatus(`已过滤 Tag: ${entry.tag}`, 'info');
  });

  el.ctxFilterLevel?.addEventListener('click', () => {
    const entry = getTargetEntry();
    if (!entry) return;

    if (el.levelVerbose) el.levelVerbose.checked = entry.level === 0;
    if (el.levelDebug) el.levelDebug.checked = entry.level === 1;
    if (el.levelInfo) el.levelInfo.checked = entry.level === 2;
    if (el.levelWarn) el.levelWarn.checked = entry.level === 3;
    if (el.levelError) el.levelError.checked = entry.level === 4;

    renderLogTable();
    showStatus(`已过滤级别: ${entry.levelName}`, 'info');
  });
}

function getTargetEntry() {
  if (!contextMenuTarget) return null;
  const id = contextMenuTarget.dataset.id;
  return state.allEntries.find((e) => e.id === id) || null;
}

