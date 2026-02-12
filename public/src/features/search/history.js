import { state } from '../../core/state.js';
import { MAX_SEARCH_HISTORY } from '../../core/constants.js';

export function loadSearchHistory() {
  try {
    state.searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
  } catch {
    state.searchHistory = [];
  }
}

export function saveSearchHistory() {
  localStorage.setItem('searchHistory', JSON.stringify(state.searchHistory));
}

export function addSearchToHistory(keyword) {
  if (!keyword?.trim()) return;
  const trimmed = keyword.trim();
  state.searchHistory = state.searchHistory.filter((item) => item !== trimmed);
  state.searchHistory.unshift(trimmed);
  if (state.searchHistory.length > MAX_SEARCH_HISTORY) {
    state.searchHistory = state.searchHistory.slice(0, MAX_SEARCH_HISTORY);
  }
  saveSearchHistory();
}

export function clearSearchHistory() {
  state.searchHistory = [];
  saveSearchHistory();
}

