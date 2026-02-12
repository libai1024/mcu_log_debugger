import { state } from '../../core/state.js';
import { getElements } from '../../ui/dom.js';

export function toggleBookmark(entryId) {
  const entry = state.allEntries.find((e) => e.id === entryId);
  if (!entry) return;

  entry.bookmarked = !entry.bookmarked;
  if (entry.bookmarked) {
    state.bookmarks.set(entryId, entry);
  } else {
    state.bookmarks.delete(entryId);
  }

  updateBookmarkPanel();
}

export function updateBookmarkPanel() {
  const el = getElements();
  if (el.bookmarkCount) el.bookmarkCount.textContent = String(state.bookmarks.size);

  if (!el.bookmarkList) return;

  if (state.bookmarks.size === 0) {
    el.bookmarkList.innerHTML = '<div class="empty-state" style="height:auto;padding:24px;"><p>暂无固定日志</p></div>';
    return;
  }

  const sorted = Array.from(state.bookmarks.values()).sort((a, b) => a.index - b.index);
  el.bookmarkList.innerHTML = sorted
    .map(
      (entry) => `
      <div class="bookmark-item" data-id="${escapeHtml(entry.id)}">
        <div class="bookmark-time">#${entry.index + 1} ${escapeHtml(entry.timestamp)}</div>
        <span class="bookmark-tag">${escapeHtml(entry.tag)}</span>
        <div class="bookmark-msg">${escapeHtml(entry.message.substring(0, 60))}${
          entry.message.length > 60 ? '...' : ''
        }</div>
      </div>
    `
    )
    .join('');

  el.bookmarkList.querySelectorAll('.bookmark-item').forEach((item) => {
    item.addEventListener('click', () => {
      const row = el.logBody?.querySelector(`[data-id="${item.dataset.id}"]`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('selected');
        setTimeout(() => row.classList.remove('selected'), 1500);
      }
    });
  });
}

export function setupBookmarkPanel() {
  const el = getElements();

  el.toggleBookmarkPanel?.addEventListener('click', () => {
    const visible = el.bookmarkPanel?.style.display !== 'none';
    if (el.bookmarkPanel) el.bookmarkPanel.style.display = visible ? 'none' : 'flex';
  });

  el.closeBookmarkPanel?.addEventListener('click', () => {
    if (el.bookmarkPanel) el.bookmarkPanel.style.display = 'none';
  });

  updateBookmarkPanel();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

