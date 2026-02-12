import { getElements } from '../../ui/dom.js';
import { state } from '../../core/state.js';
import { addSearchToHistory, clearSearchHistory } from './history.js';

export function renderSearchHistory() {
  const el = getElements();
  if (!el.historyList) return;

  if (!state.searchHistory || state.searchHistory.length === 0) {
    el.historyList.innerHTML = '<div class="history-empty">暂无搜索历史</div>';
    return;
  }

  el.historyList.innerHTML = state.searchHistory
    .map(
      (kw) => `
      <div class="history-item" data-keyword="${escapeHtml(kw)}">
        <i class="fas fa-clock history-icon"></i>
        <span class="history-text">${escapeHtml(kw)}</span>
        <button class="history-delete" data-keyword="${escapeHtml(kw)}" title="删除"><i class="fas fa-times"></i></button>
      </div>
    `
    )
    .join('');
}

export function showSearchHistory() {
  const el = getElements();
  renderSearchHistory();
  el.searchHistoryDropdown?.classList.add('show');
}

export function hideSearchHistory() {
  const el = getElements();
  el.searchHistoryDropdown?.classList.remove('show');
}

export function renderStatSearchHistory() {
  const el = getElements();
  if (!el.statHistoryList) return;

  if (!state.searchHistory || state.searchHistory.length === 0) {
    el.statHistoryList.innerHTML = '<div class="history-empty">暂无搜索历史</div>';
    return;
  }

  el.statHistoryList.innerHTML = state.searchHistory
    .map(
      (kw) => `
      <div class="history-item" data-keyword="${escapeHtml(kw)}">
        <i class="fas fa-clock history-icon"></i>
        <span class="history-text">${escapeHtml(kw)}</span>
        <button class="history-delete" data-keyword="${escapeHtml(kw)}" title="删除"><i class="fas fa-times"></i></button>
      </div>
    `
    )
    .join('');
}

export function showStatSearchHistory() {
  const el = getElements();
  renderStatSearchHistory();
  el.statSearchHistoryDropdown?.classList.add('show');
}

export function hideStatSearchHistory() {
  const el = getElements();
  el.statSearchHistoryDropdown?.classList.remove('show');
}

export function wireSearchHistoryUI({
  onKeywordSelected,
  onHistoryChanged,
} = {}) {
  const el = getElements();

  // Sidebar click handlers
  el.historyList?.addEventListener('click', (e) => {
    const del = e.target.closest('.history-delete');
    if (del) {
      e.stopPropagation();
      const kw = del.dataset.keyword;
      state.searchHistory = state.searchHistory.filter((x) => x !== kw);
      localStorage.setItem('searchHistory', JSON.stringify(state.searchHistory));
      renderSearchHistory();
      renderStatSearchHistory();
      onHistoryChanged?.();
      return;
    }

    const item = e.target.closest('.history-item');
    if (!item) return;
    const kw = item.dataset.keyword;
    onKeywordSelected?.(kw);
    hideSearchHistory();
  });

  el.historyClearBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    clearSearchHistory();
    renderSearchHistory();
    renderStatSearchHistory();
    onHistoryChanged?.();
  });

  // Stats bar click handlers
  el.statHistoryList?.addEventListener('click', (e) => {
    const del = e.target.closest('.history-delete');
    if (del) {
      e.stopPropagation();
      const kw = del.dataset.keyword;
      state.searchHistory = state.searchHistory.filter((x) => x !== kw);
      localStorage.setItem('searchHistory', JSON.stringify(state.searchHistory));
      renderSearchHistory();
      renderStatSearchHistory();
      onHistoryChanged?.();
      return;
    }

    const item = e.target.closest('.history-item');
    if (!item) return;
    const kw = item.dataset.keyword;
    onKeywordSelected?.(kw);
    hideStatSearchHistory();
  });

  el.statHistoryClearBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    clearSearchHistory();
    renderSearchHistory();
    renderStatSearchHistory();
    onHistoryChanged?.();
  });
}

export function commitKeywordToHistory(keyword) {
  addSearchToHistory(keyword);
  renderSearchHistory();
  renderStatSearchHistory();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

