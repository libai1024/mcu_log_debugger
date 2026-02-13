import { getElements } from '../ui/dom.js';
import { toggleTheme } from '../features/theme/theme.js';
import { commitKeywordToHistory, hideSearchHistory, hideStatSearchHistory, showSearchHistory, showStatSearchHistory, wireSearchHistoryUI } from '../features/search/historyUI.js';
import { jumpToMatch, updateSearchDisplay } from '../features/search/searchController.js';
import { renderLogTable } from '../features/log/renderer.js';
import { state } from '../core/state.js';
import { switchDisplayMode } from '../features/displayMode/modeSwitcher.js';

export function setupEventListeners() {
  const el = getElements();

  // Theme
  el.toggleTheme?.addEventListener('click', toggleTheme);

  // Search history UI wiring
  wireSearchHistoryUI({
    onKeywordSelected: (kw) => {
      if (el.keywordFilter) el.keywordFilter.value = kw;
      if (el.statSearchInput) el.statSearchInput.value = kw;
      el.keywordFilter?.closest('.input-with-clear')?.classList.add('has-value');
      el.statSearchInput?.closest('.qsearch')?.classList.add('has-value');
      renderLogTable();
    },
    onHistoryChanged: () => {},
  });

  // Sidebar search input
  el.keywordFilter?.addEventListener('input', (e) => {
    const wrapper = el.keywordFilter.closest('.input-with-clear');
    wrapper?.classList.toggle('has-value', e.target.value.length > 0);
    if (el.statSearchInput) el.statSearchInput.value = e.target.value;
    renderLogTable();
  });

  el.keywordFilter?.addEventListener('keypress', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (el.keywordFilter.value.trim()) commitKeywordToHistory(el.keywordFilter.value);
    jumpToMatch(e.shiftKey ? 'prev' : 'next');
  });

  el.keywordFilter?.addEventListener('focus', showSearchHistory);

  el.searchClearBtn?.addEventListener('click', () => {
    el.keywordFilter.value = '';
    el.keywordFilter.closest('.input-with-clear')?.classList.remove('has-value');
    if (el.statSearchInput) {
      el.statSearchInput.value = '';
      el.statSearchInput.closest('.qsearch')?.classList.remove('has-value');
    }
    renderLogTable();
    el.keywordFilter.focus();
  });

  el.searchPrev?.addEventListener('click', () => jumpToMatch('prev'));
  el.searchNext?.addEventListener('click', () => jumpToMatch('next'));

  // Stats bar search
  el.statSearchInput?.addEventListener('input', (e) => {
    if (el.keywordFilter) el.keywordFilter.value = e.target.value;
    const wrapper = el.statSearchInput.closest('.qsearch');
    wrapper?.classList.toggle('has-value', e.target.value.length > 0);
    renderLogTable();
  });

  el.statSearchInput?.addEventListener('keypress', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (el.statSearchInput.value.trim()) commitKeywordToHistory(el.statSearchInput.value);
    jumpToMatch(e.shiftKey ? 'prev' : 'next');
  });

  el.statSearchInput?.addEventListener('focus', showStatSearchHistory);

  el.statSearchClear?.addEventListener('click', () => {
    if (el.statSearchInput) {
      el.statSearchInput.value = '';
      el.statSearchInput.closest('.qsearch')?.classList.remove('has-value');
    }
    if (el.keywordFilter) {
      el.keywordFilter.value = '';
      el.keywordFilter.closest('.input-with-clear')?.classList.remove('has-value');
    }
    renderLogTable();
    el.statSearchInput?.focus();
  });

  el.statSearchPrev?.addEventListener('click', () => jumpToMatch('prev'));
  el.statSearchNext?.addEventListener('click', () => jumpToMatch('next'));

  // Export
  el.exportBtn?.addEventListener('click', async () => {
    try {
      const { invoke, hasTauri } = await import('../services/tauriClient.js');
      if (!hasTauri()) {
        alert('导出功能仅在客户端模式下可用');
        return;
      }
      const format = state.defaultExportFormat || 'txt';
      const content = state.filteredEntries.map(e => `[${e.timestamp}] [${e.level}] [${e.tag}] ${e.message}`).join('\n');
      await invoke('save_log_file', { content, format });
      // TODO: Add toast notification for success
    } catch (err) {
      console.error('导出失败:', err);
    }
  });

  // Settings Modal
  const settingsModal = document.getElementById('settingsModal');
  const btnSettings = document.getElementById('btnSettings');
  const closeSettings = document.getElementById('closeSettings');
  const browseSavePath = document.getElementById('browseSavePath');
  const saveSettingsBtn = document.getElementById('saveSettings');
  const savePathInput = document.getElementById('savePathInput');

  btnSettings?.addEventListener('click', () => {
    if (settingsModal) {
      settingsModal.style.display = 'flex';
      if (savePathInput) savePathInput.value = state.savePath || '';
    }
  });

  closeSettings?.addEventListener('click', () => {
    if (settingsModal) settingsModal.style.display = 'none';
  });

  browseSavePath?.addEventListener('click', async () => {
    try {
      const { invoke, hasTauri } = await import('../services/tauriClient.js');
      if (hasTauri()) {
        const path = await invoke('select_directory');
        if (path && savePathInput) {
          savePathInput.value = path;
        }
      }
    } catch (err) {
      console.error('选择目录失败:', err);
    }
  });

  saveSettingsBtn?.addEventListener('click', async () => {
    try {
      state.savePath = savePathInput?.value || '';
      const { invoke, hasTauri } = await import('../services/tauriClient.js');
      if (hasTauri()) {
        await invoke('set_save_path', { path: state.savePath });
      }
      
      const formatSelect = document.getElementById('defaultExportFormat');
      if (formatSelect) {
        state.defaultExportFormat = formatSelect.value;
        localStorage.setItem('defaultExportFormat', state.defaultExportFormat);
      }

      const intervalInput = document.getElementById('autoSaveInterval');
      if (intervalInput) {
        state.autoSaveIntervalSeconds = parseInt(intervalInput.value, 10);
        localStorage.setItem('autoSaveInterval', state.autoSaveIntervalSeconds);
      }

      if (settingsModal) settingsModal.style.display = 'none';
    } catch (err) {
      console.error('保存设置失败:', err);
    }
  });

  // Level filter checkboxes
  const updateLevelText = () => {
    const checkboxes = [
      { id: 'levelVerbose', cb: el.levelVerbose, label: 'V', cls: 'level-verbose' },
      { id: 'levelDebug', cb: el.levelDebug, label: 'D', cls: 'level-debug' },
      { id: 'levelInfo', cb: el.levelInfo, label: 'I', cls: 'level-info' },
      { id: 'levelWarn', cb: el.levelWarn, label: 'W', cls: 'level-warn' },
      { id: 'levelError', cb: el.levelError, label: 'E', cls: 'level-error' }
    ];

    // Highlight selected rows (fallback for browsers without :has())
    checkboxes.forEach((item) => {
      const input = item.cb;
      if (!input) return;
      const optionLabel = input.closest('.multiselect-option');
      optionLabel?.classList.toggle('is-checked', input.checked);
    });

    const checked = checkboxes.filter(item => item.cb?.checked);
    const textEl = document.getElementById('levelMultiselectText');
    if (!textEl) return;

    if (checked.length === 0) {
      textEl.textContent = '未选择';
      textEl.className = 'multiselect-text';
    } else if (checked.length === checkboxes.length) {
      textEl.textContent = '全部级别';
      textEl.className = 'multiselect-text';
    } else if (checked.length === 1) {
      textEl.textContent = checked[0].label;
      textEl.className = `multiselect-text ${checked[0].cls}`;
    } else {
      textEl.innerHTML = checked
        .map((item) => `<span class=\"level-chip ${item.cls}\">${item.label}</span>`)
        .join('');
      textEl.className = 'multiselect-text chips';
    }
  };

  [el.levelVerbose, el.levelDebug, el.levelInfo, el.levelWarn, el.levelError].forEach(checkbox => {
    checkbox?.addEventListener('change', () => {
      updateLevelText();
      renderLogTable();
    });
  });

  // Level dropdown toggle
  const levelMultiselect = document.getElementById('levelMultiselect');
  const levelTrigger = document.getElementById('levelMultiselectTrigger');
  const levelDropdown = document.getElementById('levelMultiselectDropdown');
  levelTrigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    levelMultiselect?.classList.toggle('open');
  });

  document.getElementById('levelSelectAll')?.addEventListener('click', () => {
    [el.levelVerbose, el.levelDebug, el.levelInfo, el.levelWarn, el.levelError].forEach(cb => { if (cb) cb.checked = true; });
    updateLevelText();
    renderLogTable();
  });

  document.getElementById('levelDeselectAll')?.addEventListener('click', () => {
    [el.levelVerbose, el.levelDebug, el.levelInfo, el.levelWarn, el.levelError].forEach(cb => { if (cb) cb.checked = false; });
    updateLevelText();
    renderLogTable();
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#levelMultiselect')) {
      levelMultiselect?.classList.remove('open');
    }
  });

  // Release notes modal
  const releaseNotesModal = document.getElementById('releaseNotesModal');
  const btnShowReleaseNotes = document.getElementById('btnShowReleaseNotes');
  const closeReleaseNotes = document.getElementById('closeReleaseNotes');
  const confirmReleaseNotes = document.getElementById('confirmReleaseNotes');

  const openReleaseNotes = () => {
    if (releaseNotesModal) releaseNotesModal.style.display = 'flex';
  };

  const hideReleaseNotes = () => {
    if (releaseNotesModal) releaseNotesModal.style.display = 'none';
  };

  const renderMarkdownToHtml = (md) => {
    // Minimal markdown renderer (no external deps)
    // Supports: headings (#/##/###), unordered lists (-/*), code blocks ```
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, (m, code) => {
      return `<pre><code>${code.trim()}</code></pre>`;
    });

    // Headings
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Unordered lists
    html = html.replace(/^(?:\s*[-*]\s.+\n)+/gm, (block) => {
      const items = block
        .trim()
        .split(/\n/)
        .map((line) => line.replace(/^\s*[-*]\s+/, '').trim())
        .filter(Boolean)
        .map((item) => `<li>${item}</li>`)
        .join('');
      return `<ul>${items}</ul>`;
    });

    // Paragraphs (remaining lines)
    html = html
      .split(/\n{2,}/)
      .map((p) => {
        const t = p.trim();
        if (!t) return '';
        if (t.startsWith('<h') || t.startsWith('<ul') || t.startsWith('<pre')) return t;
        return `<p>${t.replace(/\n/g, '<br/>')}</p>`;
      })
      .join('\n');

    return html;
  };

  const loadReleaseNotes = async () => {
    try {
      const { invoke, hasTauri } = await import('../services/tauriClient.js');
      if (!hasTauri()) {
        return [];
      }
      const notes = await invoke('get_all_release_notes');
      return Array.isArray(notes) ? notes : [];
    } catch (e) {
      console.error('加载版本公告失败:', e);
      return [];
    }
  };

  const renderReleaseNotesUI = (notes) => {
    const listEl = document.getElementById('releaseNotesList');
    const versionEl = document.getElementById('releaseNotesVersion');
    const contentEl = document.getElementById('releaseNotesContent');
    if (!listEl || !versionEl || !contentEl) return;

    listEl.innerHTML = '';

    const setActive = (idx) => {
      const note = notes[idx];
      if (!note) return;

      Array.from(listEl.querySelectorAll('.release-notes-item')).forEach((el, i) => {
        el.classList.toggle('active', i === idx);
      });

      versionEl.textContent = note.version || '-';
      contentEl.innerHTML = renderMarkdownToHtml(note.content || '');
    };

    notes.forEach((note, idx) => {
      const item = document.createElement('div');
      item.className = 'release-notes-item';
      item.textContent = note.version || `v${idx}`;
      item.addEventListener('click', () => setActive(idx));
      listEl.appendChild(item);
    });

    if (notes.length > 0) setActive(0);
    else {
      versionEl.textContent = '-';
      contentEl.innerHTML = '<p>暂无版本公告</p>';
    }
  };

  btnShowReleaseNotes?.addEventListener('click', async () => {
    openReleaseNotes();
    const notes = await loadReleaseNotes();
    renderReleaseNotesUI(notes);
  });
  closeReleaseNotes?.addEventListener('click', hideReleaseNotes);
  confirmReleaseNotes?.addEventListener('click', hideReleaseNotes);
  releaseNotesModal?.addEventListener('click', (e) => {
    if (e.target === releaseNotesModal) hideReleaseNotes();
  });

  // Display option checkboxes
  const displayToggles = [
    { checkbox: el.showTimestamp, button: el.btnShowTimestamp },
    { checkbox: el.showLevel, button: el.btnShowLevel },
    { checkbox: el.showTag, button: el.btnShowTag },
    { checkbox: el.showLocation, button: el.btnShowLocation },
    { checkbox: el.autoScroll, button: el.btnAutoScroll },
    { checkbox: el.autoSave, button: el.btnAutoSave }
  ];

  displayToggles.forEach(({ checkbox, button }) => {
    if (checkbox && button) {
      checkbox.addEventListener('change', () => {
        button.classList.toggle('active', checkbox.checked);
        renderLogTable();
      });
      button.addEventListener('click', () => {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      });
    }
  });

  // Toolbar actions
  el.toggleWrap?.addEventListener('click', () => {
    state.wrapLines = !state.wrapLines;
    el.toggleWrap.classList.toggle('active', state.wrapLines);
    renderLogTable();
  });

  el.increaseFont?.addEventListener('click', () => {
    state.fontSize = Math.min(state.fontSize + 1, 18);
    el.logTable.style.fontSize = `${state.fontSize}px`;
  });

  el.decreaseFont?.addEventListener('click', () => {
    state.fontSize = Math.max(state.fontSize - 1, 9);
    el.logTable.style.fontSize = `${state.fontSize}px`;
  });

  // Search options
  el.useRegex?.addEventListener('change', () => {
    if (el.regexShortcuts) el.regexShortcuts.style.display = el.useRegex.checked ? 'flex' : 'none';
    renderLogTable();
  });
  el.caseSensitive?.addEventListener('change', () => renderLogTable());
  el.wholeWord?.addEventListener('change', () => renderLogTable());

  // Mode switcher
  document.querySelectorAll('.mode-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      switchDisplayMode(mode);
      renderLogTable();
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
      if (e.key === '1') {
        e.preventDefault();
        switchDisplayMode('log');
        renderLogTable();
      } else if (e.key === '2') {
        e.preventDefault();
        switchDisplayMode('hex');
        renderLogTable();
      } else if (e.key === '3') {
        e.preventDefault();
        switchDisplayMode('normal');
        renderLogTable();
      }
    }
  });

  // Global document clicks to hide history
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.input-with-history')) hideSearchHistory();
    if (!e.target.closest('.qsearch')) hideStatSearchHistory();
  });

  updateSearchDisplay();
}

