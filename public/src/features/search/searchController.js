import { state } from '../../core/state.js';
import { getElements } from '../../ui/dom.js';
import { showStatus } from '../../ui/toast.js';

export function updateSearchDisplay() {
  const el = getElements();
  const text = state.searchMatches.length > 0
    ? `${state.currentSearchIndex + 1}/${state.searchMatches.length}`
    : '0/0';

  if (el.searchCount) el.searchCount.textContent = text;
  if (el.statSearchCount) el.statSearchCount.textContent = text;
}

export function performSearch(filteredEntries) {
  const el = getElements();
  const keyword = el.keywordFilter?.value || '';

  if (!keyword) {
    state.searchMatches = [];
    state.currentSearchIndex = -1;
    updateSearchDisplay();
    return;
  }

  const useRegex = !!el.useRegex?.checked;
  const caseSensitive = !!el.caseSensitive?.checked;
  const wholeWord = !!el.wholeWord?.checked;

  const matches = [];

  filteredEntries.forEach((entry, index) => {
    let matched = false;
    const text = entry.rawLine;

    if (useRegex) {
      try {
        const flags = caseSensitive ? 'g' : 'gi';
        matched = new RegExp(keyword, flags).test(text);
      } catch (e) {
        showStatus(`正则表达式错误: ${e.message}`, 'error');
        matched = caseSensitive
          ? text.includes(keyword)
          : text.toLowerCase().includes(keyword.toLowerCase());
      }
    } else {
      if (wholeWord) {
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = `\\b${escaped}\\b`;
        const flags = caseSensitive ? 'g' : 'gi';
        try {
          matched = new RegExp(pattern, flags).test(text);
        } catch {
          matched = caseSensitive
            ? text.includes(keyword)
            : text.toLowerCase().includes(keyword.toLowerCase());
        }
      } else {
        matched = caseSensitive
          ? text.includes(keyword)
          : text.toLowerCase().includes(keyword.toLowerCase());
      }
    }

    if (matched) matches.push(index);
  });

  state.searchMatches = matches;
  state.currentSearchIndex = matches.length > 0 ? 0 : -1;

  updateSearchDisplay();

  if (matches.length > 0) {
    jumpToMatch('set', 0);
  }
}

export function jumpToMatch(direction, index) {
  if (state.searchMatches.length === 0) return;

  if (direction === 'next') {
    state.currentSearchIndex = (state.currentSearchIndex + 1) % state.searchMatches.length;
  } else if (direction === 'prev') {
    state.currentSearchIndex = (state.currentSearchIndex - 1 + state.searchMatches.length) % state.searchMatches.length;
  } else if (direction === 'set' && typeof index === 'number') {
    state.currentSearchIndex = index;
  }

  updateSearchDisplay();

  const rowIndex = state.searchMatches[state.currentSearchIndex];
  const el = getElements();
  const row = el.logBody?.children?.[rowIndex];
  if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function highlightSearch(text, entryIndex) {
  const el = getElements();
  const keyword = el.keywordFilter?.value || '';
  if (!keyword) return text;

  const useRegex = !!el.useRegex?.checked;
  const caseSensitive = !!el.caseSensitive?.checked;
  const wholeWord = !!el.wholeWord?.checked;

  const isCurrentMatch =
    state.searchMatches.length > 0 &&
    state.currentSearchIndex >= 0 &&
    state.searchMatches[state.currentSearchIndex] === entryIndex;

  try {
    let regex;
    if (useRegex) {
      regex = new RegExp(`(${keyword})`, caseSensitive ? 'g' : 'gi');
    } else {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = wholeWord ? `(\\b${escaped}\\b)` : `(${escaped})`;
      regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
    }

    if (isCurrentMatch) {
      let matchCount = 0;
      return text.replace(regex, (match) => {
        matchCount++;
        if (matchCount === 1) return `<mark class="search-highlight-current">${match}</mark>`;
        return `<mark class="search-highlight">${match}</mark>`;
      });
    }

    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
  } catch {
    return text;
  }
}

