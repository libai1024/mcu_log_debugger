import { state } from '../../core/state.js';
import { levelConfig } from '../../core/constants.js';
import { getElements } from '../../ui/dom.js';
import { performSearch, highlightSearch } from '../search/searchController.js';

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getSelectedLevels(el) {
  const selected = new Set();
  if (el.levelVerbose?.checked) selected.add(0);
  if (el.levelDebug?.checked) selected.add(1);
  if (el.levelInfo?.checked) selected.add(2);
  if (el.levelWarn?.checked) selected.add(3);
  if (el.levelError?.checked) selected.add(4);
  return selected;
}

function getSelectedTags(el) {
  const checked = el.tagList?.querySelectorAll('input:checked') || [];
  return new Set(Array.from(checked).map((cb) => cb.value));
}

export function renderLogTable() {
  const el = getElements();
  if (!el.logBody) return;

  const keyword = (el.keywordFilter?.value || '').toLowerCase();
  const selectedLevels = getSelectedLevels(el);
  const selectedTags = getSelectedTags(el);

  // Filter pipeline
  state.filteredEntries = state.allEntries.filter((entry) => {
    if (selectedLevels.size > 0 && !selectedLevels.has(entry.level)) return false;
    if (selectedTags.size > 0 && !selectedTags.has(entry.tag)) return false;
    if (keyword && !entry.rawLine.toLowerCase().includes(keyword)) return false;
    return true;
  });

  // Search matches are computed against filteredEntries
  performSearch(state.filteredEntries);

  renderTableHeader(el);

  // Virtual-ish: last 300
  const visibleCount = Math.min(state.filteredEntries.length, 300);
  const startIdx = Math.max(0, state.filteredEntries.length - visibleCount);
  const visible = state.filteredEntries.slice(startIdx);

  const displayMode = state.displayMode || 'log';

  if (displayMode === 'hex') {
    renderHexMode(el, visible, startIdx);
  } else if (displayMode === 'normal') {
    renderNormalMode(el, visible, startIdx);
  } else {
    renderStructuredLogMode(el, visible, startIdx);
  }

  el.emptyState?.classList.toggle('hidden', state.filteredEntries.length > 0);

  if (el.logInfo) el.logInfo.textContent = `${state.allEntries.length} 条日志`;
  if (el.filterInfo) {
    el.filterInfo.textContent =
      state.filteredEntries.length !== state.allEntries.length
        ? `(显示 ${state.filteredEntries.length})`
        : '';
  }
}

function renderStructuredLogMode(el, visibleEntries, startIdx) {
  el.logBody.innerHTML = visibleEntries
    .map((entry, idx) => {
      const config = levelConfig[entry.levelName] || levelConfig.UNKNOWN;
      const entryIndex = startIdx + idx;

      // message highlight uses message field; rawLine highlight uses rawLine
      const rawMessage = escapeHtml(entry.message);
      const message = highlightSearch(rawMessage, entryIndex);

      const timeHtml = el.showTimestamp?.checked
        ? `<td class="col-time">${escapeHtml(entry.timestamp)}</td>`
        : '';

      const levelHtml = el.showLevel?.checked
        ? `<td class="col-level"><span class="level-badge" style="background:${config.badgeBg};color:${config.color};">${escapeHtml(entry.levelName)}</span></td>`
        : '';

      const tagHtml = el.showTag?.checked
        ? `<td class="col-tag"><span class="tag-badge">${escapeHtml(entry.tag)}</span></td>`
        : '';

      const locationHtml =
        el.showLocation?.checked && entry.location
          ? `<span class="log-location">${escapeHtml(entry.location)}</span>`
          : '';

      return `
        <tr class="log-row level-${escapeHtml(entry.levelName)}" data-index="${entryIndex}" data-id="${escapeHtml(entry.id)}">
          <td class="col-index">${entry.index + 1}</td>
          ${timeHtml}
          ${levelHtml}
          ${tagHtml}
          <td class="col-message">${message}${locationHtml}</td>
          <td class="col-action"></td>
        </tr>
      `;
    })
    .join('');
}

function renderHexMode(el, visibleEntries, startIdx) {
  el.logBody.innerHTML = visibleEntries
    .map((entry, idx) => {
      const hexData = stringToHexFormatted(entry.rawLine);
      const entryIndex = startIdx + idx;
      return `
        <tr class="log-row hex-mode" data-index="${entryIndex}" data-id="${escapeHtml(entry.id)}">
          <td class="col-index">${entry.index + 1}</td>
          <td class="col-hex" colspan="5">${hexData}</td>
          <td class="col-action"></td>
        </tr>
      `;
    })
    .join('');
}

function renderNormalMode(el, visibleEntries, startIdx) {
  const wrap = state.wrapLines ? 'white-space:pre-wrap;' : '';
  el.logBody.innerHTML = visibleEntries
    .map((entry, idx) => {
      const entryIndex = startIdx + idx;
      const raw = escapeHtml(entry.rawLine);
      const highlighted = highlightSearch(raw, entryIndex);
      return `
        <tr class="log-row normal-mode" data-index="${entryIndex}" data-id="${escapeHtml(entry.id)}">
          <td class="col-index">${entry.index + 1}</td>
          <td class="col-normal" colspan="5" style="${wrap}">${highlighted}</td>
          <td class="col-action"></td>
        </tr>
      `;
    })
    .join('');
}

function renderTableHeader(el) {
  const mode = state.displayMode || 'log';

  if (mode === 'hex') {
    el.logHead.innerHTML = `
      <tr>
        <th class="col-index"><i class="fas fa-hashtag"></i></th>
        <th class="col-hex" colspan="5"><i class="fas fa-code"></i> HEX 数据</th>
        <th class="col-action"><i class="fas fa-ellipsis-h"></i></th>
      </tr>
    `;
    return;
  }

  if (mode === 'normal') {
    el.logHead.innerHTML = `
      <tr>
        <th class="col-index"><i class="fas fa-hashtag"></i></th>
        <th class="col-normal" colspan="5"><i class="fas fa-terminal"></i> 原始数据</th>
        <th class="col-action"><i class="fas fa-ellipsis-h"></i></th>
      </tr>
    `;
    return;
  }

  let headerHtml = '<tr><th class="col-index"><i class="fas fa-hashtag"></i></th>';
  if (el.showTimestamp?.checked) headerHtml += '<th class="col-time"><i class="fas fa-clock"></i> 时间</th>';
  if (el.showLevel?.checked) headerHtml += '<th class="col-level"><i class="fas fa-signal"></i> 级别</th>';
  if (el.showTag?.checked) headerHtml += '<th class="col-tag"><i class="fas fa-tag"></i> Tag</th>';
  headerHtml += '<th class="col-message"><i class="fas fa-align-left"></i> 消息</th>';
  headerHtml += '<th class="col-action"><i class="fas fa-ellipsis-h"></i></th>';
  headerHtml += '</tr>';
  el.logHead.innerHTML = headerHtml;
}

function stringToHexFormatted(str) {
  const bytes = Array.from(str).map((c) => c.charCodeAt(0));
  const lines = [];

  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = bytes.slice(i, i + 16);
    const address = i.toString(16).toUpperCase().padStart(4, '0');

    const hex1 = chunk
      .slice(0, 8)
      .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
      .join(' ');
    const hex2 = chunk
      .slice(8, 16)
      .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
      .join(' ');

    const hexPart = hex1 + (hex2 ? '  ' + hex2 : '');
    const ascii = chunk
      .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
      .join('');

    lines.push(
      `<span class="hex-address">${address}</span>  <span class="hex-data">${hexPart.padEnd(
        49,
        ' '
      )}</span>  <span class="hex-ascii">|${ascii}|</span>`
    );
  }

  return lines.join('<br>');
}

