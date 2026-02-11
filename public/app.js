// ============================================================
// MCU Log Debugger - Modern Serial Log Debug Assistant
// ============================================================
// Modules:
// 1. Serial connection management
// 2. Real-time log receiving & rendering
// 3. Log filtering & search
// 4. Bookmark management
// 5. Data export
// 6. Theme management
// 7. Toast notification system
// ============================================================

// ========== Configuration Constants ==========
const MAX_LOG_ENTRIES = 10000;
const BATCH_INTERVAL = 50;
const AUTO_SAVE_INTERVAL = 30000;
const MAX_SEARCH_HISTORY = 20;

// ========== Global State ==========
let allEntries = [];
let filteredEntries = [];
let isConnected = false;
let autoScroll = true;
let pendingEntries = [];
let selectedPortPath = '';
let bookmarks = new Map();
let currentSearchIndex = -1;
let searchMatches = [];
let contextMenuTarget = null;
let fontSize = 12;
let wrapLines = false;
let isUserScrolling = false;
let scrollTimeout = null;
let autoSaveEnabled = false;
let autoSaveInterval = null;
let searchHistory = [];
let isDarkTheme = false;
let tagFilterInitialized = false; // 跟踪Tag过滤是否已初始化
let savePath = ''; // 保存路径
let defaultExportFormat = 'txt'; // 默认导出格式
let autoSaveIntervalSeconds = 30; // 自动保存间隔（秒）
let displayMode = 'log'; // 显示模式: 'log' | 'hex' | 'normal'
let isViewLocked = false; // 视图锁定状态
let lockReason = ''; // 锁定原因: 'search' | 'scroll' | 'manual'
let pendingMessageCount = 0; // 锁定期间累积的新消息数量
let selectedLogId = null; // 当前选中的日志 ID

// 锁定原因配置
const LOCK_REASON = {
    search: { icon: 'fa-search', text: '搜索中' },
    scroll: { icon: 'fa-hand-paper', text: '手动浏览' },
    manual: { icon: 'fa-lock', text: '已锁定' }
};

// 模式配置
const MODE_CONFIG = {
    log: {
        name: 'Log',
        icon: 'fa-list-ul',
        description: '结构化日志显示',
        shortcut: '1'
    },
    hex: {
        name: 'HEX',
        icon: 'fa-code',
        description: '十六进制数据查看',
        shortcut: '2'
    },
    normal: {
        name: 'Normal',
        icon: 'fa-terminal',
        description: '纯文本终端风格',
        shortcut: '3'
    }
};

// ========== Custom Dropdown Component ==========
class CustomDropdown {
    /**
     * Replaces a native <select> with a beautiful custom dropdown.
     * @param {HTMLSelectElement} selectEl - The native select element
     * @param {Object} opts - Options
     * @param {string} opts.triggerClass - Extra CSS class for the trigger button
     * @param {boolean} opts.showCheck - Show check icons on items (default true)
     * @param {Function} opts.formatItem - Custom item render fn(option) => innerHTML
     * @param {string} opts.emptyText - Text to show when no options
     * @param {string} opts.emptyIcon - FA icon for empty state
     */
    constructor(selectEl, opts = {}) {
        this.select = selectEl;
        this.opts = {
            triggerClass: '',
            showCheck: true,
            formatItem: null,
            emptyText: '暂无选项',
            emptyIcon: 'fa-inbox',
            ...opts,
        };
        this.isOpen = false;
        this.focusedIndex = -1;
        this.items = [];

        this._build();
        this._bind();
    }

    // ---- Build DOM ----
    _build() {
        // Create dropdown wrapper
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'dropdown';
        if (this.select.disabled) this.wrapper.classList.add('disabled');

        // Create trigger
        this.trigger = document.createElement('button');
        this.trigger.type = 'button';
        this.trigger.className = `dropdown-trigger ${this.opts.triggerClass}`.trim();
        this.trigger.setAttribute('role', 'combobox');
        this.trigger.setAttribute('aria-haspopup', 'listbox');
        this.trigger.setAttribute('aria-expanded', 'false');

        // Create menu
        this.menu = document.createElement('div');
        this.menu.className = 'dropdown-menu';
        this.menu.setAttribute('role', 'listbox');

        this.menuInner = document.createElement('div');
        this.menuInner.className = 'dropdown-menu-inner';
        this.menu.appendChild(this.menuInner);

        // Insert into DOM - replace the parent .custom-select or insert next to select
        const customSelectParent = this.select.closest('.custom-select');
        if (customSelectParent) {
            // Hide the old .custom-select wrapper
            customSelectParent.style.display = 'none';
            // Insert dropdown after the .custom-select
            customSelectParent.parentNode.insertBefore(this.wrapper, customSelectParent.nextSibling);
        } else {
            this.select.style.display = 'none';
            this.select.parentNode.insertBefore(this.wrapper, this.select.nextSibling);
        }

        this.wrapper.appendChild(this.trigger);
        this.wrapper.appendChild(this.menu);

        this.refresh();
    }

    // ---- Build/rebuild menu items from <select> options ----
    refresh() {
        this.menuInner.innerHTML = '';
        this.items = [];

        const children = this.select.children;
        let hasItems = false;

        for (const child of children) {
            if (child.tagName === 'OPTGROUP') {
                const groupLabel = document.createElement('div');
                groupLabel.className = 'dropdown-group-label';
                groupLabel.textContent = child.label;
                this.menuInner.appendChild(groupLabel);

                for (const opt of child.children) {
                    if (opt.tagName === 'OPTION' && opt.value !== '') {
                        this._addItem(opt);
                        hasItems = true;
                    }
                }
            } else if (child.tagName === 'OPTION') {
                // Skip the placeholder option (value="")
                if (child.value === '' && child.textContent.includes('...')) {
                    continue;
                }
                this._addItem(child);
                hasItems = true;
            }
        }

        if (!hasItems) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'dropdown-empty';
            emptyDiv.innerHTML = `<i class="fas ${this.opts.emptyIcon}"></i>${this.opts.emptyText}`;
            this.menuInner.appendChild(emptyDiv);
        }

        this._updateTrigger();
    }

    _addItem(option) {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.setAttribute('role', 'option');
        item.dataset.value = option.value;

        if (option.disabled) item.classList.add('disabled');
        if (option.value === this.select.value && option.value !== '') {
            item.classList.add('selected');
        }

        // Build inner content
        if (this.opts.formatItem) {
            item.innerHTML = this.opts.formatItem(option);
        } else {
            let html = '';
            if (this.opts.showCheck) {
                html += `<span class="item-check"><i class="fas fa-check"></i></span>`;
            }
            html += `<span class="item-text">${option.textContent}</span>`;
            item.innerHTML = html;
        }

        // Click handler
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            if (option.disabled) return;
            this.setValue(option.value);
        });

        // Hover to set focus
        item.addEventListener('mouseenter', () => {
            this.focusedIndex = this.items.findIndex(i => i.el === item);
            this._updateFocus();
        });

        this.menuInner.appendChild(item);
        this.items.push({ el: item, option });
    }

    // ---- Update trigger text ----
    _updateTrigger() {
        const selectedOpt = this.select.options[this.select.selectedIndex];
        let text = '';
        let isPlaceholder = false;

        if (selectedOpt && selectedOpt.value !== '') {
            text = selectedOpt.textContent;
        } else if (selectedOpt) {
            text = selectedOpt.textContent;
            isPlaceholder = true;
        } else {
            text = '请选择...';
            isPlaceholder = true;
        }

        this.trigger.innerHTML = `
            <span class="dropdown-value ${isPlaceholder ? 'placeholder' : ''}">${text}</span>
            <i class="fas fa-chevron-down dropdown-arrow"></i>
        `;
    }

    // ---- Set value programmatically ----
    setValue(value) {
        this.select.value = value;
        this.select.dispatchEvent(new Event('change', { bubbles: true }));
        this._highlightSelected();
        this._updateTrigger();
        this.close();
    }

    // ---- Highlight selected item ----
    _highlightSelected() {
        this.items.forEach(({ el }) => {
            el.classList.toggle('selected', el.dataset.value === this.select.value);
        });
    }

    // ---- Open/Close ----
    open() {
        if (this.isOpen || this.select.disabled) return;
        this.isOpen = true;
        this.wrapper.classList.add('open');
        this.trigger.setAttribute('aria-expanded', 'true');
        this._highlightSelected();

        // Set focus to selected item
        const selIdx = this.items.findIndex(i => i.el.classList.contains('selected'));
        this.focusedIndex = selIdx >= 0 ? selIdx : 0;
        this._updateFocus();

        // Scroll selected into view
        const selectedItem = this.items[this.focusedIndex]?.el;
        if (selectedItem) {
            requestAnimationFrame(() => {
                selectedItem.scrollIntoView({ block: 'nearest' });
            });
        }
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        this.wrapper.classList.remove('open');
        this.trigger.setAttribute('aria-expanded', 'false');
        this.focusedIndex = -1;
        this._updateFocus();
    }

    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    setDisabled(disabled) {
        this.select.disabled = disabled;
        this.wrapper.classList.toggle('disabled', disabled);
        if (disabled) this.close();
    }

    // ---- Keyboard focus ----
    _updateFocus() {
        this.items.forEach(({ el }, idx) => {
            el.classList.toggle('focused', idx === this.focusedIndex);
        });
    }

    _moveFocus(delta) {
        if (this.items.length === 0) return;
        let idx = this.focusedIndex + delta;
        // Skip disabled
        while (idx >= 0 && idx < this.items.length && this.items[idx].option.disabled) {
            idx += delta;
        }
        if (idx < 0) idx = 0;
        if (idx >= this.items.length) idx = this.items.length - 1;
        this.focusedIndex = idx;
        this._updateFocus();
        this.items[idx]?.el.scrollIntoView({ block: 'nearest' });
    }

    // ---- Bind events ----
    _bind() {
        // Toggle on trigger click
        this.trigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggle();
        });

        // Keyboard navigation
        this.trigger.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    if (this.isOpen && this.focusedIndex >= 0) {
                        const focused = this.items[this.focusedIndex];
                        if (focused && !focused.option.disabled) {
                            this.setValue(focused.option.value);
                        }
                    } else {
                        this.open();
                    }
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.close();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    if (!this.isOpen) { this.open(); }
                    else { this._moveFocus(1); }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    if (!this.isOpen) { this.open(); }
                    else { this._moveFocus(-1); }
                    break;
                case 'Home':
                    e.preventDefault();
                    if (this.isOpen) { this.focusedIndex = -1; this._moveFocus(1); }
                    break;
                case 'End':
                    e.preventDefault();
                    if (this.isOpen) { this.focusedIndex = this.items.length; this._moveFocus(-1); }
                    break;
                case 'Tab':
                    this.close();
                    break;
            }
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (this.isOpen && !this.wrapper.contains(e.target)) {
                this.close();
            }
        });
    }

    // ---- Destroy ----
    destroy() {
        this.wrapper.remove();
        const customSelectParent = this.select.closest('.custom-select');
        if (customSelectParent) {
            customSelectParent.style.display = '';
        } else {
            this.select.style.display = '';
        }
    }
}

// Store dropdown instances for programmatic access
const dropdowns = {};

// Log level configuration (matches LOG_PROTOCOL.md color scheme)
const levelConfig = {
    VERBOSE: { label: 'VERBOSE', bg: 'var(--level-verbose-bg)', color: 'var(--level-verbose-fg)', badgeBg: 'var(--level-verbose-badge)' },
    DEBUG:   { label: 'DEBUG',   bg: 'var(--level-debug-bg)',   color: 'var(--level-debug-fg)',   badgeBg: 'var(--level-debug-badge)' },
    INFO:    { label: 'INFO',    bg: 'var(--level-info-bg)',    color: 'var(--level-info-fg)',    badgeBg: 'var(--level-info-badge)' },
    WARN:    { label: 'WARN',    bg: 'var(--level-warn-bg)',    color: 'var(--level-warn-fg)',    badgeBg: 'var(--level-warn-badge)' },
    ERROR:   { label: 'ERROR',   bg: 'var(--level-error-bg)',   color: 'var(--level-error-fg)',   badgeBg: 'var(--level-error-badge)' },
    UNKNOWN: { label: 'UNKNOWN', bg: 'var(--bg-secondary)',     color: 'var(--text-secondary)',   badgeBg: 'var(--bg-secondary)' },
};

// ========== DOM Elements ==========
const elements = {
    // Serial
    portSelect: document.getElementById('portSelect'),
    portSelectWrapper: document.getElementById('portSelectWrapper'),
    selectedPortInfo: document.getElementById('selectedPortInfo'),
    connectedPortName: document.getElementById('connectedPortName'),
    refreshPorts: document.getElementById('refreshPorts'),
    baudRate: document.getElementById('baudRate'),
    dataBits: document.getElementById('dataBits'),
    stopBits: document.getElementById('stopBits'),
    parity: document.getElementById('parity'),
    connectBtn: document.getElementById('connectBtn'),

    // Filters
    levelVerbose: document.getElementById('levelVerbose'),
    levelDebug: document.getElementById('levelDebug'),
    levelInfo: document.getElementById('levelInfo'),
    levelWarn: document.getElementById('levelWarn'),
    levelError: document.getElementById('levelError'),
    keywordFilter: document.getElementById('keywordFilter'),
    wholeWord: document.getElementById('wholeWord'),
    regexShortcuts: document.getElementById('regexShortcuts'),
    searchClearBtn: document.getElementById('searchClearBtn'),
    searchHistoryDropdown: document.getElementById('searchHistoryDropdown'),
    historyList: document.getElementById('historyList'),
    historyClearBtn: document.getElementById('historyClearBtn'),
    activeFilters: document.getElementById('activeFilters'),
    activeFiltersList: document.getElementById('activeFiltersList'),
    clearAllFilters: document.getElementById('clearAllFilters'),
    useRegex: document.getElementById('useRegex'),
    caseSensitive: document.getElementById('caseSensitive'),
    searchCount: document.getElementById('searchCount'),
    searchBtn: document.getElementById('searchBtn'),
    searchPrev: document.getElementById('searchPrev'),
    searchNext: document.getElementById('searchNext'),

    // Stats bar search
    statSearchInput: document.getElementById('statSearchInput'),
    statSearchClear: document.getElementById('statSearchClear'),
    statSearchHistoryDropdown: document.getElementById('statSearchHistoryDropdown'),
    statHistoryList: document.getElementById('statHistoryList'),
    statHistoryClearBtn: document.getElementById('statHistoryClearBtn'),
    statSearchPrev: document.getElementById('statSearchPrev'),
    statSearchNext: document.getElementById('statSearchNext'),
    statSearchCount: document.getElementById('statSearchCount'),

    tagList: document.getElementById('tagList'),
    toggleAllTags: document.getElementById('toggleAllTags'),

    // Display options (hidden checkboxes)
    autoScroll: document.getElementById('autoScroll'),
    showTimestamp: document.getElementById('showTimestamp'),
    showLevel: document.getElementById('showLevel'),
    showTag: document.getElementById('showTag'),
    hexMode: document.getElementById('hexMode'),
    showLocation: document.getElementById('showLocation'),
    autoSave: document.getElementById('autoSave'),

    // Toolbar buttons
    btnAutoScroll: document.getElementById('btnAutoScroll'),
    btnShowTimestamp: document.getElementById('btnShowTimestamp'),
    btnShowLevel: document.getElementById('btnShowLevel'),
    btnShowTag: document.getElementById('btnShowTag'),
    btnShowLocation: document.getElementById('btnShowLocation'),
    btnAutoSave: document.getElementById('btnAutoSave'),

    // Toolbar controls
    btnViewLock: document.getElementById('btnViewLock'),
    scrollToBottom: document.getElementById('scrollToBottom'),
    toggleWrap: document.getElementById('toggleWrap'),
    increaseFont: document.getElementById('increaseFont'),
    decreaseFont: document.getElementById('decreaseFont'),
    logInfo: document.getElementById('logInfo'),
    filterInfo: document.getElementById('filterInfo'),

    // Log display
    logHead: document.getElementById('logHead'),
    logBody: document.getElementById('logBody'),
    logContainer: document.getElementById('logContainer'),
    logTable: document.getElementById('logTable'),
    emptyState: document.getElementById('emptyState'),
    newDataToast: document.getElementById('newDataToast'),
    jumpToNew: document.getElementById('jumpToNew'),
    
    // View lock
    viewLockNotification: document.getElementById('viewLockNotification'),
    lockReasonText: document.getElementById('lockReasonText'),
    pendingCounter: document.getElementById('pendingCounter'),
    pendingCountValue: document.getElementById('pendingCountValue'),
    btnUnlockFromNotification: document.getElementById('btnUnlockFromNotification'),

    // Actions
    clearBtn: document.getElementById('clearBtn'),
    exportBtn: document.getElementById('exportBtn'),
    toggleBookmarkPanel: document.getElementById('toggleBookmarkPanel'),
    bookmarkCount: document.getElementById('bookmarkCount'),

    // Bookmark panel
    bookmarkPanel: document.getElementById('bookmarkPanel'),
    closeBookmarkPanel: document.getElementById('closeBookmarkPanel'),
    bookmarkList: document.getElementById('bookmarkList'),

    // Send
    sendInput: document.getElementById('sendInput'),
    sendBtn: document.getElementById('sendBtn'),
    sendHex: document.getElementById('sendHex'),
    sendNewline: document.getElementById('sendNewline'),
    loopSend: document.getElementById('loopSend'),
    loopInterval: document.getElementById('loopInterval'),
    quickCommands: document.getElementById('quickCommands'),

    // Status
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),

    // Context menu
    contextMenu: document.getElementById('contextMenu'),
    
    // Settings
    btnSettings: document.getElementById('btnSettings'),
    settingsModal: document.getElementById('settingsModal'),
    closeSettings: document.getElementById('closeSettings'),
    savePathInput: document.getElementById('savePathInput'),
    browseSavePath: document.getElementById('browseSavePath'),
    defaultExportFormat: document.getElementById('defaultExportFormat'),
    autoSaveIntervalInput: document.getElementById('autoSaveInterval'),
    resetSettings: document.getElementById('resetSettings'),
    saveSettings: document.getElementById('saveSettings'),

    // Theme
    toggleTheme: document.getElementById('toggleTheme'),

    // Toast
    toastContainer: document.getElementById('toastContainer'),
};

// ========== Toast Notification System ==========
function showStatus(message, type = 'info', duration = 3000) {
    const iconMap = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle',
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${iconMap[type] || iconMap.info}"></i>
        <span>${message}</span>
    `;

    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-removing');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ========== Theme Management ==========
function initTheme() {
    const saved = localStorage.getItem('theme');
    isDarkTheme = saved === 'dark';
    applyTheme();
}

function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    localStorage.setItem('theme', isDarkTheme ? 'dark' : 'light');
    applyTheme();
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light');
    const icon = elements.toggleTheme.querySelector('i');
    if (icon) {
        icon.className = isDarkTheme ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// ========== Log Parsing ==========
// Protocol regex: [HH:MM:SS.mmm] [LEVEL] [TAG] message (optional file:line)
const LOG_PATTERN = /^\[(\d{2}:\d{2}:\d{2}\.\d{3})\]\s+\[(\w+)\]\s+\[(\w+)\]\s+(.+?)(?:\s+\(([^:]+):(\d+)\))?$/;

function parseLogLevel(levelStr) {
    const levels = { VERBOSE: 0, DEBUG: 1, INFO: 2, WARN: 3, ERROR: 4, NONE: 5 };
    return levels[levelStr.toUpperCase()] ?? -1;
}

function parseLogLine(line, index) {
    const trimmed = line.trim();
    if (!trimmed) return null;

    const match = LOG_PATTERN.exec(trimmed);
    let timestamp, level, tag, message, location;

    if (match) {
        timestamp = match[1];
        level = parseLogLevel(match[2]);
        tag = match[3];
        message = match[4].trim();
        // Capture optional file location (protocol section 2.3)
        if (match[5] && match[6]) {
            location = `${match[5]}:${match[6]}`;
        }
    } else {
        const now = new Date();
        timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;
        level = -1;
        tag = 'RAW';
        message = trimmed;
    }

    const levelName = Object.keys(levelConfig)[level] || 'UNKNOWN';

    return {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        index,
        timestamp,
        level,
        levelName,
        tag,
        message,
        location: location || null,
        rawLine: trimmed,
        bookmarked: false,
    };
}

// ========== UI Updates ==========
function updateStats() {
    const counts = { VERBOSE: 0, DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, UNKNOWN: 0 };
    allEntries.forEach(e => {
        counts[e.levelName] = (counts[e.levelName] || 0) + 1;
    });

    Object.keys(counts).forEach(level => {
        const el = document.getElementById(`stat${level}`);
        if (el) el.textContent = counts[level];
    });

    const totalEl = document.getElementById('statTotal');
    if (totalEl) totalEl.textContent = allEntries.length;

    elements.logInfo.textContent = `${allEntries.length} 条日志`;
    if (filteredEntries.length !== allEntries.length) {
        elements.filterInfo.textContent = `(显示 ${filteredEntries.length})`;
    } else {
        elements.filterInfo.textContent = '';
    }

    updateTagList();
}

function updateTagList() {
    const tags = [...new Set(allEntries.map(e => e.tag))].sort();
    const currentTags = new Set(
        Array.from(elements.tagList.querySelectorAll('input:checked')).map(cb => cb.value)
    );

    // 判断是否应该默认选中新Tag
    // 只有在第一次初始化时（tagFilterInitialized=false 且 currentTags.size=0）才全选
    const shouldSelectByDefault = !tagFilterInitialized && currentTags.size === 0;
    
    if (shouldSelectByDefault) {
        tagFilterInitialized = true;
    }

    elements.tagList.innerHTML = tags.map(tag => {
        // 新Tag的选中状态：
        // 1. 如果Tag已存在于currentTags中，保持选中
        // 2. 如果是新Tag且应该默认选中，则选中
        // 3. 否则不选中
        const isActive = currentTags.has(tag) || (shouldSelectByDefault && !currentTags.size);
        return `
        <div class="tag-item ${isActive ? '' : 'inactive'}" data-tag="${tag}">
            <span>${tag}</span>
            <button type="button" class="tag-toggle" title="${isActive ? '取消选择' : '选择'}">
                <i class="fas ${isActive ? 'fa-times' : 'fa-check'}"></i>
            </button>
            <input type="checkbox" value="${tag}" ${isActive ? 'checked' : ''} style="display:none;">
        </div>`;
    }).join('');

    elements.tagList.querySelectorAll('.tag-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const tagItem = btn.closest('.tag-item');
            const checkbox = tagItem.querySelector('input[type="checkbox"]');

            checkbox.checked = !checkbox.checked;
            tagItem.classList.toggle('inactive', !checkbox.checked);
            btn.querySelector('i').className = `fas ${checkbox.checked ? 'fa-times' : 'fa-check'}`;
            btn.title = checkbox.checked ? '取消选择' : '选择';

            renderLogTable();
            updateActiveFiltersDisplay();
            updateToggleAllTagsButton();
        });
    });
    
    updateToggleAllTagsButton();
}

function updateToggleAllTagsButton() {
    const checkboxes = elements.tagList.querySelectorAll('input');
    if (checkboxes.length === 0) return;
    
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    const btnIcon = elements.toggleAllTags.querySelector('i');
    const btnText = elements.toggleAllTags.querySelector('span');
    
    if (allChecked) {
        btnIcon.className = 'fas fa-times-circle';
        btnText.textContent = '取消全选';
    } else {
        btnIcon.className = 'fas fa-check-double';
        btnText.textContent = '全选';
    }
}

// ========== Search ==========
function performSearch() {
    const keyword = elements.keywordFilter.value;
    if (!keyword) {
        searchMatches = [];
        currentSearchIndex = -1;
        updateSearchDisplay();
        // 搜索清空时，如果是因为搜索而锁定的，则解锁
        if (isViewLocked && lockReason === 'search') {
            unlockView();
        }
        return;
    }

    const useRegex = elements.useRegex.checked;
    const caseSensitive = elements.caseSensitive.checked;
    const wholeWord = elements.wholeWord?.checked || false;
    searchMatches = [];

    filteredEntries.forEach((entry, index) => {
        let matched = false;
        const text = entry.rawLine;

        if (useRegex) {
            try {
                const flags = caseSensitive ? 'g' : 'gi';
                matched = new RegExp(keyword, flags).test(text);
            } catch (e) {
                // 正则表达式错误，显示提示
                showStatus(`正则表达式错误: ${e.message}`, 'error');
                matched = caseSensitive ? text.includes(keyword) : text.toLowerCase().includes(keyword.toLowerCase());
            }
        } else {
            // 全词匹配
            if (wholeWord) {
                const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const pattern = `\\b${escaped}\\b`;
                const flags = caseSensitive ? 'g' : 'gi';
                try {
                    matched = new RegExp(pattern, flags).test(text);
                } catch {
                    matched = caseSensitive ? text.includes(keyword) : text.toLowerCase().includes(keyword.toLowerCase());
                }
            } else {
                matched = caseSensitive ? text.includes(keyword) : text.toLowerCase().includes(keyword.toLowerCase());
            }
        }

        if (matched) searchMatches.push(index);
    });

    currentSearchIndex = searchMatches.length > 0 ? 0 : -1;
    updateSearchDisplay();
    if (searchMatches.length > 0) {
        // 搜索时锁定视图
        if (!isViewLocked) {
            lockView('search');
        }
        jumpToMatch(0);
    }
}

function updateSearchDisplay() {
    const text = searchMatches.length > 0 ? `${currentSearchIndex + 1}/${searchMatches.length}` : '0/0';
    if (elements.searchCount) elements.searchCount.textContent = text;
    if (elements.statSearchCount) elements.statSearchCount.textContent = text;
}

function jumpToMatch(direction) {
    if (searchMatches.length === 0) return;

    if (direction === 'next') {
        currentSearchIndex = (currentSearchIndex + 1) % searchMatches.length;
    } else if (direction === 'prev') {
        currentSearchIndex = (currentSearchIndex - 1 + searchMatches.length) % searchMatches.length;
    } else if (typeof direction === 'number') {
        currentSearchIndex = direction;
    }

    updateSearchDisplay();
    
    // 重新渲染以更新当前匹配项的高亮
    renderLogTable();

    // 滚动到当前匹配项
    const rowIndex = searchMatches[currentSearchIndex];
    const row = elements.logBody.children[rowIndex];
    if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

/**
 * 高亮搜索关键词
 * @param {string} text - 要高亮的文本
 * @param {number} entryIndex - 当前条目在 filteredEntries 中的索引
 * @returns {string} - 高亮后的 HTML
 */
function highlightSearch(text, entryIndex) {
    const keyword = elements.keywordFilter.value;
    if (!keyword) return text;

    const useRegex = elements.useRegex.checked;
    const caseSensitive = elements.caseSensitive.checked;
    const wholeWord = elements.wholeWord?.checked || false;
    
    // 判断当前条目是否是当前搜索匹配项
    const isCurrentMatch = searchMatches.length > 0 && 
                          currentSearchIndex >= 0 && 
                          searchMatches[currentSearchIndex] === entryIndex;

    try {
        let regex;
        if (useRegex) {
            regex = new RegExp(`(${keyword})`, caseSensitive ? 'g' : 'gi');
        } else {
            const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // 全词匹配
            const pattern = wholeWord ? `(\\b${escaped}\\b)` : `(${escaped})`;
            regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
        }
        
        // 如果是当前匹配项，使用特殊高亮
        if (isCurrentMatch) {
            let matchCount = 0;
            return text.replace(regex, (match) => {
                matchCount++;
                // 第一个匹配项使用当前高亮样式
                if (matchCount === 1) {
                    return `<mark class="search-highlight-current">${match}</mark>`;
                }
                // 其他匹配项使用普通高亮样式
                return `<mark class="search-highlight">${match}</mark>`;
            });
        } else {
            // 非当前匹配项，所有匹配都使用普通高亮
            return text.replace(regex, '<mark class="search-highlight">$1</mark>');
        }
    } catch {
        return text;
    }
}

// ========== Search History ==========
function loadSearchHistory() {
    try {
        searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    } catch {
        searchHistory = [];
    }
}

function saveSearchHistory() {
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
}

function addSearchToHistory(keyword) {
    if (!keyword?.trim()) return;
    const trimmed = keyword.trim();
    searchHistory = searchHistory.filter(item => item !== trimmed);
    searchHistory.unshift(trimmed);
    if (searchHistory.length > MAX_SEARCH_HISTORY) {
        searchHistory = searchHistory.slice(0, MAX_SEARCH_HISTORY);
    }
    saveSearchHistory();
    renderSearchHistory();
    renderStatSearchHistory();
}

function removeSearchFromHistory(keyword) {
    searchHistory = searchHistory.filter(item => item !== keyword);
    saveSearchHistory();
    renderSearchHistory();
    renderStatSearchHistory();
}

function clearSearchHistory() {
    searchHistory = [];
    saveSearchHistory();
    renderSearchHistory();
    renderStatSearchHistory();
}

function renderSearchHistory() {
    if (!elements.historyList) return;

    if (searchHistory.length === 0) {
        elements.historyList.innerHTML = '<div class="history-empty">暂无搜索历史</div>';
        return;
    }

    elements.historyList.innerHTML = searchHistory.map(kw => `
        <div class="history-item" data-keyword="${kw}">
            <i class="fas fa-clock history-icon"></i>
            <span class="history-text">${kw}</span>
            <button class="history-delete" data-keyword="${kw}" title="删除"><i class="fas fa-times"></i></button>
        </div>
    `).join('');

    elements.historyList.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.history-delete')) return;
            const kw = item.dataset.keyword;
            elements.keywordFilter.value = kw;
            if (elements.statSearchInput) elements.statSearchInput.value = kw;
            elements.keywordFilter.closest('.input-with-clear')?.classList.add('has-value');
            hideSearchHistory();
            performSearch();
        });
    });

    elements.historyList.querySelectorAll('.history-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeSearchFromHistory(btn.dataset.keyword);
        });
    });
}

function showSearchHistory() {
    renderSearchHistory();
    elements.searchHistoryDropdown?.classList.add('show');
}
function hideSearchHistory() {
    elements.searchHistoryDropdown?.classList.remove('show');
}
function toggleSearchHistoryDropdown() {
    elements.searchHistoryDropdown?.classList.toggle('show');
    if (elements.searchHistoryDropdown?.classList.contains('show')) renderSearchHistory();
}

function renderStatSearchHistory() {
    if (!elements.statHistoryList) return;

    if (searchHistory.length === 0) {
        elements.statHistoryList.innerHTML = '<div class="history-empty">暂无搜索历史</div>';
        return;
    }

    elements.statHistoryList.innerHTML = searchHistory.map(kw => `
        <div class="history-item" data-keyword="${kw}">
            <i class="fas fa-clock history-icon"></i>
            <span class="history-text">${kw}</span>
            <button class="history-delete" data-keyword="${kw}" title="删除"><i class="fas fa-times"></i></button>
        </div>
    `).join('');

    elements.statHistoryList.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.history-delete')) return;
            const kw = item.dataset.keyword;
            if (elements.statSearchInput) elements.statSearchInput.value = kw;
            elements.keywordFilter.value = kw;
            elements.statSearchInput?.closest('.qsearch')?.classList.add('has-value');
            hideStatSearchHistory();
            performSearch();
        });
    });

    elements.statHistoryList.querySelectorAll('.history-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeSearchFromHistory(btn.dataset.keyword);
        });
    });
}

function showStatSearchHistory() {
    renderStatSearchHistory();
    elements.statSearchHistoryDropdown?.classList.add('show');
}
function hideStatSearchHistory() {
    elements.statSearchHistoryDropdown?.classList.remove('show');
}
function toggleStatSearchHistoryDropdown() {
    elements.statSearchHistoryDropdown?.classList.toggle('show');
    if (elements.statSearchHistoryDropdown?.classList.contains('show')) renderStatSearchHistory();
}

// ========== Active Filters Display ==========
function updateActiveFiltersDisplay() {
    const activeFilters = [];

    const minLevel = parseInt(elements.levelFilter.value);
    if (minLevel > 0) {
        const names = ['VERBOSE', 'DEBUG', 'INFO', 'WARN', 'ERROR'];
        activeFilters.push({ type: 'level', label: `级别 ≥ ${names[minLevel]}`, value: minLevel });
    }

    const keyword = elements.keywordFilter.value.trim();
    if (keyword) {
        activeFilters.push({ type: 'keyword', label: `搜索: ${keyword}`, value: keyword });
    }

    const selectedTags = Array.from(elements.tagList.querySelectorAll('input:checked')).map(cb => cb.value);
    const allTags = Array.from(elements.tagList.querySelectorAll('input')).map(cb => cb.value);
    if (selectedTags.length > 0 && selectedTags.length !== allTags.length) {
        activeFilters.push({
            type: 'tag',
            label: selectedTags.length === 1 ? `Tag: ${selectedTags[0]}` : `Tag: ${selectedTags.length}个`,
            value: selectedTags
        });
    }

    if (activeFilters.length === 0) {
        elements.activeFilters.style.display = 'none';
    } else {
        elements.activeFilters.style.display = 'block';
        const iconMap = { level: 'fa-layer-group', tag: 'fa-tag', keyword: 'fa-search' };
        elements.activeFiltersList.innerHTML = activeFilters.map(f => `
            <div class="active-filter-tag ${f.type}-filter" data-type="${f.type}">
                <i class="fas ${iconMap[f.type]}"></i>
                <span>${f.label}</span>
                <button class="filter-remove" data-type="${f.type}"><i class="fas fa-times"></i></button>
            </div>
        `).join('');

        elements.activeFiltersList.querySelectorAll('.filter-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeFilter(btn.dataset.type);
            });
        });
    }
}

function removeFilter(type) {
    switch (type) {
        case 'level':
            // 选中所有级别
            if (elements.levelVerbose) elements.levelVerbose.checked = true;
            if (elements.levelDebug) elements.levelDebug.checked = true;
            if (elements.levelInfo) elements.levelInfo.checked = true;
            if (elements.levelWarn) elements.levelWarn.checked = true;
            if (elements.levelError) elements.levelError.checked = true;
            break;
        case 'keyword':
            elements.keywordFilter.value = '';
            elements.keywordFilter.closest('.input-with-clear')?.classList.remove('has-value');
            if (elements.statSearchInput) elements.statSearchInput.value = '';
            break;
        case 'tag':
            elements.tagList.querySelectorAll('input').forEach(cb => cb.checked = true);
            break;
    }
    renderLogTable();
    updateActiveFiltersDisplay();
}

function clearAllFiltersAction() {
    // 选中所有级别
    if (elements.levelVerbose) elements.levelVerbose.checked = true;
    if (elements.levelDebug) elements.levelDebug.checked = true;
    if (elements.levelInfo) elements.levelInfo.checked = true;
    if (elements.levelWarn) elements.levelWarn.checked = true;
    if (elements.levelError) elements.levelError.checked = true;
    
    elements.keywordFilter.value = '';
    elements.keywordFilter.closest('.input-with-clear')?.classList.remove('has-value');
    if (elements.statSearchInput) elements.statSearchInput.value = '';
    if (elements.statSearchInput) {
        elements.statSearchInput.closest('.qsearch')?.classList.remove('has-value');
    }
    elements.tagList.querySelectorAll('input').forEach(cb => cb.checked = true);
    renderLogTable();
    updateActiveFiltersDisplay();
}

// ========== View Lock Management ==========
/**
 * 锁定视图
 * @param {string} reason - 'search' | 'scroll' | 'manual'
 */
function lockView(reason) {
    if (isViewLocked && lockReason === reason) return;
    
    isViewLocked = true;
    lockReason = reason;
    pendingMessageCount = 0;
    
    // 更新 UI
    updateViewLockUI();
    
    // 显示锁定通知
    showLockNotification();
    
    console.log(`[ViewLock] Locked - Reason: ${reason}`);
}

/**
 * 解锁视图
 */
function unlockView() {
    if (!isViewLocked) return;
    
    isViewLocked = false;
    lockReason = '';
    pendingMessageCount = 0;
    
    // 更新 UI
    updateViewLockUI();
    
    // 隐藏锁定通知
    hideLockNotification();
    
    // 如果有待处理的消息，重新渲染并滚动到底部
    if (pendingEntries.length > 0) {
        renderLogTable();
        if (autoScroll) {
            scrollToBottom();
        }
    }
    
    console.log('[ViewLock] Unlocked');
}

/**
 * 切换视图锁定状态
 */
function toggleViewLock() {
    if (isViewLocked) {
        unlockView();
    } else {
        lockView('manual');
    }
}

/**
 * 更新视图锁定 UI
 */
function updateViewLockUI() {
    const lockBtn = elements.btnViewLock;
    const lockIcon = lockBtn.querySelector('i');
    
    if (isViewLocked) {
        lockBtn.classList.add('locked');
        lockIcon.className = 'fas fa-lock';
        lockBtn.title = '解锁视图 (Cmd+L)';
    } else {
        lockBtn.classList.remove('locked');
        lockIcon.className = 'fas fa-unlock';
        lockBtn.title = '锁定视图 (Cmd+L)';
    }
}

/**
 * 显示锁定通知
 */
function showLockNotification() {
    const notification = elements.viewLockNotification;
    const reasonConfig = LOCK_REASON[lockReason] || LOCK_REASON.manual;
    
    // 更新通知内容
    elements.lockReasonText.innerHTML = `<i class="fas ${reasonConfig.icon}"></i> ${reasonConfig.text}`;
    elements.pendingCountValue.textContent = pendingMessageCount;
    
    // 显示通知
    notification.style.display = 'block';
}

/**
 * 隐藏锁定通知
 */
function hideLockNotification() {
    elements.viewLockNotification.style.display = 'none';
}

/**
 * 更新待处理消息计数
 */
function updatePendingCount() {
    if (isViewLocked) {
        elements.pendingCountValue.textContent = pendingMessageCount;
        
        // 如果计数器之前隐藏，现在显示它
        if (pendingMessageCount > 0) {
            elements.pendingCounter.style.display = 'flex';
        }
    }
}

// ========== Display Mode Management ==========
/**
 * 切换显示模式
 * @param {string} mode - 'log' | 'hex' | 'normal'
 */
function switchDisplayMode(mode) {
    if (!MODE_CONFIG[mode]) {
        console.error('Invalid display mode:', mode);
        return;
    }
    
    if (displayMode === mode) return;
    
    // 保存当前滚动位置
    const scrollPos = elements.logContainer.scrollTop;
    const wasAtBottom = isAtBottom();
    
    // 更新状态
    displayMode = mode;
    
    // 保存到 localStorage
    localStorage.setItem('displayMode', mode);
    
    // 更新模式切换器 UI
    updateModeSwitcher();
    
    // 重新渲染
    renderLogTable();
    
    // 恢复滚动位置
    if (autoScroll || wasAtBottom) {
        scrollToBottom();
    } else {
        elements.logContainer.scrollTop = scrollPos;
    }
    
    // 显示提示
    showStatus(`已切换到 ${MODE_CONFIG[mode].name} 模式`, 'info');
}

/**
 * 更新模式切换器 UI
 */
function updateModeSwitcher() {
    const options = document.querySelectorAll('.mode-option');
    const indicator = document.querySelector('.mode-indicator');
    
    options.forEach((option, index) => {
        const mode = option.dataset.mode;
        
        if (mode === displayMode) {
            option.classList.add('active');
            
            // 更新指示器位置
            if (indicator) {
                const width = option.offsetWidth;
                const left = option.offsetLeft;
                indicator.style.width = `${width}px`;
                indicator.style.transform = `translateX(${left}px)`;
            }
        } else {
            option.classList.remove('active');
        }
    });
}

/**
 * 检查是否滚动到底部
 */
function isAtBottom() {
    const container = elements.logContainer;
    return container.scrollHeight - container.scrollTop <= container.clientHeight + 10;
}

/**
 * 滚动到底部
 */
function scrollToBottom() {
    elements.logContainer.scrollTop = elements.logContainer.scrollHeight;
}

// ========== Log Table Rendering ==========
function renderLogTable() {
    const keyword = elements.keywordFilter.value.toLowerCase();
    const selectedTags = new Set(
        Array.from(elements.tagList.querySelectorAll('input:checked')).map(cb => cb.value)
    );
    
    // 获取选中的级别
    const selectedLevels = new Set();
    if (elements.levelVerbose?.checked) selectedLevels.add(0);
    if (elements.levelDebug?.checked) selectedLevels.add(1);
    if (elements.levelInfo?.checked) selectedLevels.add(2);
    if (elements.levelWarn?.checked) selectedLevels.add(3);
    if (elements.levelError?.checked) selectedLevels.add(4);

    filteredEntries = allEntries.filter(entry => {
        // 级别过滤：只显示选中的级别
        if (selectedLevels.size > 0 && !selectedLevels.has(entry.level)) return false;
        if (selectedTags.size > 0 && !selectedTags.has(entry.tag)) return false;
        if (keyword && !entry.rawLine.toLowerCase().includes(keyword)) return false;
        return true;
    });

    // Render table header based on display mode
    renderTableHeader();

    // Virtual scrolling: render only recent entries
    const visibleCount = Math.min(filteredEntries.length, 300);
    const startIdx = Math.max(0, filteredEntries.length - visibleCount);
    const visibleEntries = filteredEntries.slice(startIdx);

    // Render based on display mode
    switch (displayMode) {
        case 'hex':
            renderHexMode(visibleEntries, startIdx, keyword);
            break;
        case 'normal':
            renderNormalMode(visibleEntries, startIdx, keyword);
            break;
        case 'log':
        default:
            renderLogMode(visibleEntries, startIdx, keyword);
            break;
    }

    elements.emptyState.classList.toggle('hidden', filteredEntries.length > 0);

    // 恢复选中状态
    if (selectedLogId) {
        const selectedRow = elements.logBody.querySelector(`[data-id="${selectedLogId}"]`);
        if (selectedRow) {
            selectedRow.classList.add('selected');
        }
    }

    // 视图锁定时不滚动
    if (isViewLocked) {
        // 锁定时不执行任何滚动操作
        return;
    }

    if (autoScroll && !isUserScrolling) {
        elements.logContainer.scrollTop = elements.logContainer.scrollHeight;
    } else if (pendingEntries.length > 0 && !isUserScrolling) {
        elements.newDataToast.style.display = 'flex';
    }
}

/**
 * 渲染 Log 模式（结构化日志）
 */
function renderLogMode(visibleEntries, startIdx, keyword) {
    elements.logBody.innerHTML = visibleEntries.map((entry, idx) => {
        const config = levelConfig[entry.levelName] || levelConfig.UNKNOWN;
        const entryIndex = startIdx + idx;
        const message = keyword ? highlightSearch(entry.message, entryIndex) : escapeHtml(entry.message);
        
        // 新消息类名
        const newClass = entry.isNew ? 'new-entry' : '';

        let levelHtml = '';
        if (elements.showLevel.checked) {
            levelHtml = `<td class="col-level">
                <span class="level-badge" style="background:${config.badgeBg};color:${config.color};">${entry.levelName}</span>
            </td>`;
        }

        let tagHtml = '';
        if (elements.showTag.checked) {
            tagHtml = `<td class="col-tag"><span class="tag-badge">${entry.tag}</span></td>`;
        }

        let locationHtml = '';
        if (elements.showLocation.checked && entry.location) {
            locationHtml = `<span class="log-location">${entry.location}</span>`;
        }

        return `
            <tr class="log-row level-${entry.levelName} ${entry.bookmarked ? 'bookmarked' : ''} ${newClass}"
                data-index="${startIdx + idx}" data-id="${entry.id}">
                <td class="col-index">${entry.index + 1}</td>
                ${elements.showTimestamp.checked ? `<td class="col-time">${entry.timestamp}</td>` : ''}
                ${levelHtml}
                ${tagHtml}
                <td class="col-message" style="${wrapLines ? 'white-space:pre-wrap;' : ''}">${message}${locationHtml}</td>
                <td class="col-action">
                    <button class="bookmark-btn ${entry.bookmarked ? 'active' : ''}" data-id="${entry.id}">
                        <i class="fas fa-bookmark"></i>
                    </button>
                </td>
            </tr>`;
    }).join('');
}

/**
 * 渲染 HEX 模式（十六进制数据）
 */
function renderHexMode(visibleEntries, startIdx, keyword) {
    elements.logBody.innerHTML = visibleEntries.map((entry, idx) => {
        const hexData = stringToHexFormatted(entry.rawLine);
        const newClass = entry.isNew ? 'new-entry' : '';
        return `
            <tr class="log-row hex-mode ${entry.bookmarked ? 'bookmarked' : ''} ${newClass}"
                data-index="${startIdx + idx}" data-id="${entry.id}">
                <td class="col-index">${entry.index + 1}</td>
                <td class="col-hex" colspan="5">${hexData}</td>
                <td class="col-action">
                    <button class="bookmark-btn ${entry.bookmarked ? 'active' : ''}" data-id="${entry.id}">
                        <i class="fas fa-bookmark"></i>
                    </button>
                </td>
            </tr>`;
    }).join('');
}

/**
 * 渲染 Normal 模式（纯文本终端风格）
 */
function renderNormalMode(visibleEntries, startIdx, keyword) {
    elements.logBody.innerHTML = visibleEntries.map((entry, idx) => {
        const entryIndex = startIdx + idx;
        const rawText = keyword ? highlightSearch(entry.rawLine, entryIndex) : escapeHtml(entry.rawLine);
        const newClass = entry.isNew ? 'new-entry' : '';
        
        return `
            <tr class="log-row normal-mode ${entry.bookmarked ? 'bookmarked' : ''} ${newClass}"
                data-index="${startIdx + idx}" data-id="${entry.id}">
                <td class="col-index">${entry.index + 1}</td>
                <td class="col-normal" colspan="5" style="${wrapLines ? 'white-space:pre-wrap;' : ''}">${rawText}</td>
                <td class="col-action">
                    <button class="bookmark-btn ${entry.bookmarked ? 'active' : ''}" data-id="${entry.id}">
                        <i class="fas fa-bookmark"></i>
                    </button>
                </td>
            </tr>`;
    }).join('');
}

function renderTableHeader() {
    switch (displayMode) {
        case 'hex':
            elements.logHead.innerHTML = `
                <tr>
                    <th class="col-index"><i class="fas fa-hashtag"></i></th>
                    <th class="col-hex" colspan="5"><i class="fas fa-code"></i> HEX 数据</th>
                    <th class="col-action"><i class="fas fa-ellipsis-h"></i></th>
                </tr>`;
            break;
            
        case 'normal':
            elements.logHead.innerHTML = `
                <tr>
                    <th class="col-index"><i class="fas fa-hashtag"></i></th>
                    <th class="col-normal" colspan="5"><i class="fas fa-terminal"></i> 原始数据</th>
                    <th class="col-action"><i class="fas fa-ellipsis-h"></i></th>
                </tr>`;
            break;
            
        case 'log':
        default:
            // Log mode: dynamic header based on display options
            let headerHtml = '<tr><th class="col-index"><i class="fas fa-hashtag"></i></th>';
            
            if (elements.showTimestamp.checked) {
                headerHtml += '<th class="col-time"><i class="fas fa-clock"></i> 时间</th>';
            }
            
            if (elements.showLevel.checked) {
                headerHtml += '<th class="col-level"><i class="fas fa-signal"></i> 级别</th>';
            }
            
            if (elements.showTag.checked) {
                headerHtml += '<th class="col-tag"><i class="fas fa-tag"></i> Tag</th>';
            }
            
            headerHtml += '<th class="col-message"><i class="fas fa-align-left"></i> 消息</th>';
            headerHtml += '<th class="col-action"><i class="fas fa-ellipsis-h"></i></th>';
            headerHtml += '</tr>';
            
            elements.logHead.innerHTML = headerHtml;
            break;
    }
}

/**
 * 将字符串转换为格式化的 HEX 显示
 * 格式: 地址 | HEX 数据 (每16字节一行) | ASCII
 */
function stringToHexFormatted(str) {
    const bytes = Array.from(str).map(c => c.charCodeAt(0));
    const lines = [];
    
    for (let i = 0; i < bytes.length; i += 16) {
        const chunk = bytes.slice(i, i + 16);
        
        // 地址偏移
        const address = i.toString(16).toUpperCase().padStart(4, '0');
        
        // HEX 数据（每8字节一组）
        const hex1 = chunk.slice(0, 8).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
        const hex2 = chunk.slice(8, 16).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
        const hexPart = hex1 + (hex2 ? '  ' + hex2 : '');
        
        // ASCII 对照
        const ascii = chunk.map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.').join('');
        
        lines.push(`<span class="hex-address">${address}</span>  <span class="hex-data">${hexPart.padEnd(49, ' ')}</span>  <span class="hex-ascii">|${ascii}|</span>`);
    }
    
    return lines.join('<br>');
}

// 简单的 HEX 转换（用于简单场景）
function stringToHex(str) {
    return Array.from(str)
        .map(char => {
            const hex = char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0');
            return hex;
        })
        .join(' ');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== Bookmark ==========
function toggleBookmark(entryId) {
    const entry = allEntries.find(e => e.id === entryId);
    if (!entry) return;

    entry.bookmarked = !entry.bookmarked;
    if (entry.bookmarked) {
        bookmarks.set(entryId, entry);
    } else {
        bookmarks.delete(entryId);
    }

    updateBookmarkPanel();
    renderLogTable();
}

function updateBookmarkPanel() {
    elements.bookmarkCount.textContent = bookmarks.size;

    if (bookmarks.size === 0) {
        elements.bookmarkList.innerHTML = '<div class="empty-state" style="height:auto;padding:24px;"><p>暂无固定日志</p></div>';
        return;
    }

    const sorted = Array.from(bookmarks.values()).sort((a, b) => a.index - b.index);
    elements.bookmarkList.innerHTML = sorted.map(entry => `
        <div class="bookmark-item" data-id="${entry.id}">
            <div class="bookmark-time">#${entry.index + 1} ${entry.timestamp}</div>
            <span class="bookmark-tag">${entry.tag}</span>
            <div class="bookmark-msg">${entry.message.substring(0, 60)}${entry.message.length > 60 ? '...' : ''}</div>
        </div>
    `).join('');

    elements.bookmarkList.querySelectorAll('.bookmark-item').forEach(item => {
        item.addEventListener('click', () => {
            const row = elements.logBody.querySelector(`[data-id="${item.dataset.id}"]`);
            if (row) {
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                row.classList.add('selected');
                setTimeout(() => row.classList.remove('selected'), 1500);
            }
        });
    });
}

// ========== Smart Scroll ==========
function setupSmartScroll() {
    elements.logContainer.addEventListener('scroll', () => {
        isUserScrolling = true;
        const nearBottom = elements.logContainer.scrollHeight - elements.logContainer.scrollTop - elements.logContainer.clientHeight < 50;

        if (nearBottom) {
            autoScroll = true;
            elements.newDataToast.style.display = 'none';
            // 滚动到底部时，如果是因为滚动而锁定的，则解锁
            if (isViewLocked && lockReason === 'scroll') {
                unlockView();
            }
        } else {
            autoScroll = false;
            // 用户向上滚动时，锁定视图
            if (!isViewLocked) {
                lockView('scroll');
            }
        }

        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => { isUserScrolling = false; }, 1000);
    });

    elements.jumpToNew.addEventListener('click', () => {
        elements.logContainer.scrollTop = elements.logContainer.scrollHeight;
        elements.newDataToast.style.display = 'none';
        autoScroll = true;
        // 跳转到新消息时解锁
        if (isViewLocked && lockReason === 'scroll') {
            unlockView();
        }
    });

    elements.scrollToBottom.addEventListener('click', () => {
        elements.logContainer.scrollTop = elements.logContainer.scrollHeight;
        autoScroll = true;
        // 滚动到底部时解锁
        if (isViewLocked && lockReason === 'scroll') {
            unlockView();
        }
    });
}

// ========== Context Menu ==========
function setupContextMenu() {
    elements.logBody.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const row = e.target.closest('.log-row');
        if (!row) return;

        contextMenuTarget = row;
        elements.contextMenu.style.display = 'block';
        elements.contextMenu.style.left = `${e.pageX}px`;
        elements.contextMenu.style.top = `${e.pageY}px`;
    });

    document.addEventListener('click', () => {
        elements.contextMenu.style.display = 'none';
    });

    document.getElementById('ctxBookmark').addEventListener('click', () => {
        if (contextMenuTarget) toggleBookmark(contextMenuTarget.dataset.id);
    });

    document.getElementById('ctxCopy').addEventListener('click', () => {
        if (!contextMenuTarget) return;
        const entry = allEntries.find(e => e.id === contextMenuTarget.dataset.id);
        if (entry) {
            navigator.clipboard.writeText(entry.message);
            showStatus('已复制消息内容', 'success');
        }
    });

    document.getElementById('ctxCopyRow').addEventListener('click', () => {
        if (!contextMenuTarget) return;
        const entry = allEntries.find(e => e.id === contextMenuTarget.dataset.id);
        if (entry) {
            navigator.clipboard.writeText(entry.rawLine);
            showStatus('已复制整行', 'success');
        }
    });

    document.getElementById('ctxFilterTag').addEventListener('click', () => {
        if (!contextMenuTarget) return;
        const entry = allEntries.find(e => e.id === contextMenuTarget.dataset.id);
        if (entry) {
            elements.tagList.querySelectorAll('input').forEach(cb => { cb.checked = cb.value === entry.tag; });
            renderLogTable();
            updateActiveFiltersDisplay();
            showStatus(`已过滤 Tag: ${entry.tag}`, 'info');
        }
    });

    document.getElementById('ctxFilterLevel').addEventListener('click', () => {
        if (!contextMenuTarget) return;
        const entry = allEntries.find(e => e.id === contextMenuTarget.dataset.id);
        if (entry) {
            // 只选中该级别
            if (elements.levelVerbose) elements.levelVerbose.checked = (entry.level === 0);
            if (elements.levelDebug) elements.levelDebug.checked = (entry.level === 1);
            if (elements.levelInfo) elements.levelInfo.checked = (entry.level === 2);
            if (elements.levelWarn) elements.levelWarn.checked = (entry.level === 3);
            if (elements.levelError) elements.levelError.checked = (entry.level === 4);
            renderLogTable();
            updateActiveFiltersDisplay();
            showStatus(`已过滤级别: ${entry.levelName}`, 'info');
        }
    });
}

// ========== Send ==========
function setupSendPanel() {
    elements.sendBtn.addEventListener('click', sendData);
    elements.sendInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendData();
    });
    elements.quickCommands.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-chip[data-cmd]');
        if (btn) {
            elements.sendInput.value = btn.dataset.cmd;
            sendData();
        }
    });
}

async function sendData() {
    const data = elements.sendInput.value;
    if (!data || !isConnected) return;

    let payload = data;
    if (elements.sendHex.checked) {
        const hex = data.replace(/\s/g, '');
        if (!/^[0-9A-Fa-f]*$/.test(hex)) {
            showStatus('无效的 HEX 格式', 'error');
            return;
        }
    }
    if (elements.sendNewline.checked) payload += '\n';

    try {
        // TODO: Implement backend send
        // await window.__TAURI__.invoke('send_serial', { data: payload });
        const entry = parseLogLine(`[SEND] ${data}`, allEntries.length);
        if (entry) {
            entry.tag = 'SEND';
            entry.levelName = 'INFO';
            pendingEntries.push(entry);
        }
        elements.sendInput.value = '';
        showStatus('数据已发送', 'success');
    } catch (e) {
        showStatus(`发送失败: ${e}`, 'error');
    }
}

// ========== Serial Port Management ==========
function parsePortName(fullPath) {
    const name = fullPath.replace('/dev/', '');
    const isCU = name.startsWith('cu.');
    const isTTY = name.startsWith('tty.');
    let deviceId = name;
    if (isCU) deviceId = name.substring(3);
    else if (isTTY) deviceId = name.substring(4);
    return { path: fullPath, name, isCU, isTTY, deviceId };
}

function optimizePortList(ports) {
    const portMap = new Map();
    ports.forEach(path => {
        const parsed = parsePortName(path);
        if (portMap.has(parsed.deviceId)) {
            const existing = portMap.get(parsed.deviceId);
            if (parsed.isCU && !existing.isCU) portMap.set(parsed.deviceId, parsed);
        } else {
            portMap.set(parsed.deviceId, parsed);
        }
    });
    return Array.from(portMap.values()).sort((a, b) => {
        if (a.isCU && !b.isCU) return -1;
        if (!a.isCU && b.isCU) return 1;
        return a.name.localeCompare(b.name);
    });
}

async function listPorts() {
    elements.refreshPorts.classList.add('spinning');
    try {
        const rawPorts = await window.__TAURI__.invoke('list_serial_ports');
        const optimized = optimizePortList(rawPorts);
        const current = elements.portSelect.value;

        let html = '<option value="">选择串口...</option>';
        if (optimized.length === 0) {
            html += '<option value="" disabled>未检测到串口</option>';
        } else {
            const cuPorts = optimized.filter(p => p.isCU);
            const others = optimized.filter(p => !p.isCU);

            if (cuPorts.length > 0) {
                html += '<optgroup label="推荐 (cu.)">';
                cuPorts.forEach(p => {
                    html += `<option value="${p.path}" ${p.path === current ? 'selected' : ''}>${p.name}</option>`;
                });
                html += '</optgroup>';
            }
            if (others.length > 0) {
                html += '<optgroup label="其他">';
                others.forEach(p => {
                    html += `<option value="${p.path}" ${p.path === current ? 'selected' : ''}>${p.name}</option>`;
                });
                html += '</optgroup>';
            }
        }

        elements.portSelect.innerHTML = html;
        if (current && Array.from(elements.portSelect.options).some(o => o.value === current)) {
            elements.portSelect.value = current;
        }
        // Refresh the custom dropdown to reflect new port list
        if (dropdowns.port) dropdowns.port.refresh();
    } catch (e) {
        console.error('Failed to list ports:', e);
    } finally {
        setTimeout(() => elements.refreshPorts.classList.remove('spinning'), 600);
    }
}

async function connect() {
    const path = elements.portSelect.value;
    if (!path) {
        showStatus('请先选择串口', 'warning');
        return;
    }

    try {
        await window.__TAURI__.invoke('connect_serial', {
            config: { path, baud_rate: parseInt(elements.baudRate.value) }
        });

        isConnected = true;
        selectedPortPath = path;

        elements.connectBtn.innerHTML = '<i class="fas fa-link-slash"></i><span>断开连接</span>';
        elements.connectBtn.classList.add('connected');
        elements.statusDot.classList.add('connected');
        elements.statusText.textContent = '已连接';
        elements.portSelectWrapper.style.display = 'none';
        elements.selectedPortInfo.style.display = 'flex';
        elements.connectedPortName.textContent = path.replace('/dev/', '');
        elements.baudRate.disabled = true;
        elements.refreshPorts.disabled = true;

        // Hide/disable custom dropdowns
        if (dropdowns.port) {
            dropdowns.port.wrapper.style.display = 'none';
        }
        if (dropdowns.baudRate) dropdowns.baudRate.setDisabled(true);
        if (dropdowns.dataBits) dropdowns.dataBits.setDisabled(true);
        if (dropdowns.stopBits) dropdowns.stopBits.setDisabled(true);
        if (dropdowns.parity) dropdowns.parity.setDisabled(true);

        showStatus(`已连接: ${path.replace('/dev/', '')}`, 'success');
    } catch (e) {
        showStatus(`连接失败: ${e}`, 'error');
    }
}

async function disconnect() {
    try {
        await window.__TAURI__.invoke('disconnect_serial');
    } catch (e) {
        console.error('Disconnect error:', e);
    }

    isConnected = false;
    elements.connectBtn.innerHTML = '<i class="fas fa-plug"></i><span>连接串口</span>';
    elements.connectBtn.classList.remove('connected');
    elements.statusDot.classList.remove('connected');
    elements.statusText.textContent = '未连接';
    elements.portSelectWrapper.style.display = 'none'; // Keep native hidden
    elements.selectedPortInfo.style.display = 'none';
    elements.baudRate.disabled = false;
    elements.refreshPorts.disabled = false;

    // Show/enable custom dropdowns
    if (dropdowns.port) {
        dropdowns.port.wrapper.style.display = '';
        dropdowns.port.setDisabled(false);
    }
    if (dropdowns.baudRate) dropdowns.baudRate.setDisabled(false);
    if (dropdowns.dataBits) dropdowns.dataBits.setDisabled(false);
    if (dropdowns.stopBits) dropdowns.stopBits.setDisabled(false);
    if (dropdowns.parity) dropdowns.parity.setDisabled(false);

    showStatus('已断开连接', 'info');
}

// ========== Batch Processing ==========
function startBatchProcessing() {
    setInterval(() => {
        if (pendingEntries.length === 0) return;
        const toAdd = pendingEntries.splice(0, pendingEntries.length);
        toAdd.forEach((entry, i) => { 
            entry.index = allEntries.length + i;
            entry.isNew = true; // 标记为新消息
        });
        allEntries.push(...toAdd);

        if (allEntries.length > MAX_LOG_ENTRIES) {
            allEntries = allEntries.slice(-MAX_LOG_ENTRIES);
        }

        renderLogTable();
        updateStats();
        
        // 400ms 后移除新消息标记（与动画时长一致）
        setTimeout(() => {
            toAdd.forEach(entry => { entry.isNew = false; });
        }, 400);
    }, BATCH_INTERVAL);
}

// ========== Export ==========
async function exportLogs() {
    if (allEntries.length === 0) {
        showStatus('没有可导出的日志', 'warning');
        return;
    }

    try {
        // 使用默认导出格式
        let content = '';
        let extension = defaultExportFormat;

        if (defaultExportFormat === 'txt') {
            content = allEntries.map(e => e.rawLine).join('\n');
        } else if (defaultExportFormat === 'csv') {
            const headers = ['Index', 'Timestamp', 'Level', 'Tag', 'Message'];
            const rows = allEntries.map(e =>
                [e.index + 1, e.timestamp, e.levelName, e.tag, `"${e.message.replace(/"/g, '""')}"`].join(',')
            );
            content = [headers.join(','), ...rows].join('\n');
        } else if (defaultExportFormat === 'json') {
            content = JSON.stringify(allEntries, null, 2);
        }

        // 生成文件名
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
        const filename = `logs_${timestamp}.${extension}`;

        // 使用 Tauri 保存文件
        const filePath = await window.__TAURI__.invoke('save_log_file', {
            content: content,
            filename: filename,
            savePath: savePath || null
        });

        showStatus(`已导出 ${allEntries.length} 条日志到: ${filePath}`, 'success');
    } catch (error) {
        console.error('导出失败:', error);
        showStatus(`导出失败: ${error}`, 'error');
    }
}

// ========== Auto Save ==========
function startAutoSave() {
    if (autoSaveInterval) clearInterval(autoSaveInterval);
    autoSaveInterval = setInterval(async () => {
        if (allEntries.length === 0) return;
        
        try {
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
            const content = allEntries.map(e => e.rawLine).join('\n');
            const filename = `autosave_${timestamp}.txt`;

            await window.__TAURI__.invoke('save_log_file', {
                content: content,
                filename: filename,
                savePath: savePath || null
            });
            
            console.log('自动保存成功:', filename);
        } catch (error) {
            console.error('自动保存失败:', error);
        }
    }, autoSaveIntervalSeconds * 1000);
}

function stopAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
    }
}

// ========== Toolbar Button State ==========
function updateToolbarButtonState(buttonId, isActive) {
    const button = document.getElementById(buttonId);
    if (button) button.classList.toggle('active', isActive);
}

function syncToolbarButtons() {
    updateToolbarButtonState('btnAutoScroll', elements.autoScroll.checked);
    updateToolbarButtonState('btnShowTimestamp', elements.showTimestamp.checked);
    updateToolbarButtonState('btnShowLevel', elements.showLevel.checked);
    updateToolbarButtonState('btnShowTag', elements.showTag.checked);
    updateToolbarButtonState('btnShowLocation', elements.showLocation.checked);
    updateToolbarButtonState('btnAutoSave', elements.autoSave.checked);
}

// ========== Event Listeners ==========
function setupEventListeners() {
    // Theme toggle
    elements.toggleTheme.addEventListener('click', toggleTheme);

    // Mode switcher
    document.querySelectorAll('.mode-option').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            switchDisplayMode(mode);
        });
    });

    // View lock button
    elements.btnViewLock.addEventListener('click', toggleViewLock);
    elements.btnUnlockFromNotification.addEventListener('click', unlockView);

    // Keyboard shortcuts for mode switching and view lock
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
            if (e.key === '1') {
                e.preventDefault();
                switchDisplayMode('log');
            } else if (e.key === '2') {
                e.preventDefault();
                switchDisplayMode('hex');
            } else if (e.key === '3') {
                e.preventDefault();
                switchDisplayMode('normal');
            } else if (e.key === 'l' || e.key === 'L') {
                e.preventDefault();
                toggleViewLock();
            }
        }
    });

    // Connect/Disconnect
    elements.connectBtn.addEventListener('click', () => {
        isConnected ? disconnect() : connect();
    });
    elements.refreshPorts.addEventListener('click', listPorts);

    // Level filter checkboxes
    [elements.levelVerbose, elements.levelDebug, elements.levelInfo, elements.levelWarn, elements.levelError].forEach(checkbox => {
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                renderLogTable();
                updateActiveFiltersDisplay();
            });
        }
    });

    // Tag list changes
    elements.tagList.addEventListener('change', () => {
        renderLogTable();
        updateActiveFiltersDisplay();
    });

    // Clear all filters
    elements.clearAllFilters.addEventListener('click', clearAllFiltersAction);

    // Sidebar search
    elements.keywordFilter.addEventListener('input', (e) => {
        const wrapper = elements.keywordFilter.closest('.input-with-clear');
        wrapper?.classList.toggle('has-value', e.target.value.length > 0);
        if (elements.statSearchInput) elements.statSearchInput.value = e.target.value;
        performSearch();
        updateActiveFiltersDisplay();
    });

    elements.keywordFilter.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (elements.keywordFilter.value.trim()) addSearchToHistory(elements.keywordFilter.value);
            if (e.shiftKey) jumpToMatch('prev');
            else jumpToMatch('next');
        }
    });

    elements.keywordFilter.addEventListener('focus', showSearchHistory);

    elements.searchClearBtn.addEventListener('click', () => {
        elements.keywordFilter.value = '';
        elements.keywordFilter.closest('.input-with-clear')?.classList.remove('has-value');
        if (elements.statSearchInput) elements.statSearchInput.value = '';
        performSearch();
        updateActiveFiltersDisplay();
        elements.keywordFilter.focus();
    });

    // 历史记录按钮已删除，点击输入框时自动显示历史记录（通过focus事件）

    elements.historyClearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearSearchHistory();
        showStatus('搜索历史已清空', 'info');
    });

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.input-with-history')) hideSearchHistory();
        if (!e.target.closest('.qsearch')) hideStatSearchHistory();
    });

    elements.useRegex.addEventListener('change', () => {
        // 切换正则快捷按钮显示
        if (elements.regexShortcuts) {
            elements.regexShortcuts.style.display = elements.useRegex.checked ? 'flex' : 'none';
        }
        performSearch();
    });
    elements.caseSensitive.addEventListener('change', performSearch);
    if (elements.wholeWord) {
        elements.wholeWord.addEventListener('change', performSearch);
    }
    
    // 正则快捷按钮
    if (elements.regexShortcuts) {
        elements.regexShortcuts.addEventListener('click', (e) => {
            const btn = e.target.closest('.regex-btn');
            if (btn) {
                const pattern = btn.dataset.pattern;
                elements.keywordFilter.value = pattern;
                elements.useRegex.checked = true;
                elements.regexShortcuts.style.display = 'flex';
                performSearch();
            }
        });
    }
    elements.searchBtn.addEventListener('click', () => {
        if (elements.keywordFilter.value.trim()) addSearchToHistory(elements.keywordFilter.value);
        performSearch();
    });
    elements.searchPrev.addEventListener('click', () => jumpToMatch('prev'));
    elements.searchNext.addEventListener('click', () => jumpToMatch('next'));

    // Stats bar search
    elements.statSearchInput.addEventListener('input', (e) => {
        elements.keywordFilter.value = e.target.value;
        const wrapper = elements.statSearchInput.closest('.qsearch');
        wrapper?.classList.toggle('has-value', e.target.value.length > 0);
        performSearch();
        updateActiveFiltersDisplay();
    });

    elements.statSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (elements.statSearchInput.value.trim()) addSearchToHistory(elements.statSearchInput.value);
            jumpToMatch(e.shiftKey ? 'prev' : 'next');
        }
    });

    elements.statSearchInput.addEventListener('focus', showStatSearchHistory);

    elements.statSearchClear.addEventListener('click', () => {
        elements.statSearchInput.value = '';
        elements.keywordFilter.value = '';
        elements.statSearchInput.closest('.qsearch')?.classList.remove('has-value');
        performSearch();
        updateActiveFiltersDisplay();
        elements.statSearchInput.focus();
    });

    // 历史记录按钮已删除，点击输入框时自动显示历史记录（通过focus事件）

    elements.statHistoryClearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearSearchHistory();
        showStatus('搜索历史已清空', 'info');
    });

    elements.statSearchPrev.addEventListener('click', () => jumpToMatch('prev'));
    elements.statSearchNext.addEventListener('click', () => jumpToMatch('next'));

    // Tag toggle action
    elements.toggleAllTags.addEventListener('click', () => {
        const checkboxes = elements.tagList.querySelectorAll('input');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        
        // 标记Tag过滤已被用户操作过
        tagFilterInitialized = true;
        
        if (allChecked) {
            // 当前全选状态，点击后取消全选
            checkboxes.forEach(cb => cb.checked = false);
            elements.tagList.querySelectorAll('.tag-item').forEach(item => item.classList.add('inactive'));
            elements.tagList.querySelectorAll('.tag-toggle i').forEach(icon => icon.className = 'fas fa-check');
            elements.tagList.querySelectorAll('.tag-toggle').forEach(btn => btn.title = '选择');
            
            // 更新按钮状态
            const btnIcon = elements.toggleAllTags.querySelector('i');
            const btnText = elements.toggleAllTags.querySelector('span');
            btnIcon.className = 'fas fa-check-double';
            btnText.textContent = '全选';
            
            showStatus('已取消所有Tag选择（显示所有日志）', 'info');
        } else {
            // 当前非全选状态，点击后全选
            checkboxes.forEach(cb => cb.checked = true);
            elements.tagList.querySelectorAll('.tag-item').forEach(item => item.classList.remove('inactive'));
            elements.tagList.querySelectorAll('.tag-toggle i').forEach(icon => icon.className = 'fas fa-times');
            elements.tagList.querySelectorAll('.tag-toggle').forEach(btn => btn.title = '取消选择');
            
            // 更新按钮状态
            const btnIcon = elements.toggleAllTags.querySelector('i');
            const btnText = elements.toggleAllTags.querySelector('span');
            btnIcon.className = 'fas fa-times-circle';
            btnText.textContent = '取消全选';
            
            showStatus('已选择所有Tag', 'info');
        }
        
        renderLogTable();
        updateActiveFiltersDisplay();
    });

    // Display option checkboxes -> toolbar buttons sync
    const togglePairs = [
        ['autoScroll', 'btnAutoScroll', (v) => { 
            autoScroll = v;
            // 关闭自动滚动时锁定视图
            if (!v && !isViewLocked) {
                lockView('scroll');
            }
            // 开启自动滚动时，如果是因为滚动而锁定的，则解锁
            else if (v && isViewLocked && lockReason === 'scroll') {
                unlockView();
            }
        }],
        ['showTimestamp', 'btnShowTimestamp', () => renderLogTable()],
        ['showLevel', 'btnShowLevel', () => renderLogTable()],
        ['showTag', 'btnShowTag', () => renderLogTable()],
        ['showLocation', 'btnShowLocation', () => renderLogTable()],
        ['autoSave', 'btnAutoSave', (v) => {
            autoSaveEnabled = v;
            if (v) { startAutoSave(); showStatus('自动保存已启用', 'success'); }
            else { stopAutoSave(); showStatus('自动保存已关闭', 'info'); }
        }],
    ];

    togglePairs.forEach(([checkboxId, btnId, callback]) => {
        const checkbox = elements[checkboxId];
        const btn = elements[btnId];
        if (!checkbox || !btn) return;

        checkbox.addEventListener('change', (e) => {
            updateToolbarButtonState(btnId, e.target.checked);
            callback(e.target.checked);
        });

        btn.addEventListener('click', () => {
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change'));
        });
    });

    syncToolbarButtons();

    // Toolbar controls
    elements.toggleWrap.addEventListener('click', () => {
        wrapLines = !wrapLines;
        renderLogTable();
        showStatus(wrapLines ? '自动换行已开启' : '自动换行已关闭', 'info');
    });

    elements.increaseFont.addEventListener('click', () => {
        fontSize = Math.min(fontSize + 1, 18);
        elements.logTable.style.fontSize = `${fontSize}px`;
    });

    elements.decreaseFont.addEventListener('click', () => {
        fontSize = Math.max(fontSize - 1, 9);
        elements.logTable.style.fontSize = `${fontSize}px`;
    });

    // Bookmark panel
    elements.toggleBookmarkPanel.addEventListener('click', () => {
        const visible = elements.bookmarkPanel.style.display !== 'none';
        elements.bookmarkPanel.style.display = visible ? 'none' : 'flex';
    });
    elements.closeBookmarkPanel.addEventListener('click', () => {
        elements.bookmarkPanel.style.display = 'none';
    });

    // Clear & Export
    elements.clearBtn.addEventListener('click', () => {
        if (allEntries.length === 0) return;
        allEntries = [];
        filteredEntries = [];
        pendingEntries = [];
        bookmarks.clear();
        updateBookmarkPanel();
        renderLogTable();
        updateStats();
        showStatus('日志已清空', 'info');
    });
    elements.exportBtn.addEventListener('click', exportLogs);

    // Bookmark button delegation
    elements.logBody.addEventListener('click', (e) => {
        const btn = e.target.closest('.bookmark-btn');
        if (btn) {
            e.stopPropagation();
            toggleBookmark(btn.dataset.id);
            return;
        }
        
        // 点击日志行选中高亮
        const row = e.target.closest('.log-row');
        if (row) {
            e.stopPropagation(); // 阻止事件冒泡
            const logId = row.dataset.id;
            
            // 如果点击的是已选中的行，取消选中
            if (row.classList.contains('selected')) {
                row.classList.remove('selected');
                selectedLogId = null; // 清除选中 ID
            } else {
                // 移除其他行的选中状态
                elements.logBody.querySelectorAll('.log-row.selected').forEach(r => {
                    r.classList.remove('selected');
                });
                // 添加选中状态
                row.classList.add('selected');
                selectedLogId = logId; // 保存选中 ID
            }
        }
    });
    
    // 点击日志容器的空白区域取消选中
    elements.logContainer.addEventListener('click', (e) => {
        // 如果点击的不是表格内容，取消所有选中
        if (e.target === elements.logContainer || e.target === elements.logTable) {
            elements.logBody.querySelectorAll('.log-row.selected').forEach(r => {
                r.classList.remove('selected');
            });
            selectedLogId = null; // 清除选中 ID
        }
    });

    // Tauri serial events
    if (window.__TAURI__) {
        window.__TAURI__.event.listen('serial-data', (event) => {
            const entry = parseLogLine(event.payload, allEntries.length + pendingEntries.length);
            if (entry) {
                pendingEntries.push(entry);
                
                // 如果视图已锁定，增加待处理消息计数
                if (isViewLocked) {
                    pendingMessageCount++;
                    updatePendingCount();
                }
            }
        });

        window.__TAURI__.event.listen('serial-error', (event) => {
            showStatus(`串口错误: ${event.payload}`, 'error');
            disconnect();
        });

        window.__TAURI__.event.listen('serial-disconnected', () => {
            if (isConnected) {
                showStatus('串口已断开', 'warning');
                disconnect();
            }
        });
    }
}

// ========== Initialize Custom Dropdowns ==========
function initDropdowns() {
    // Port select dropdown
    dropdowns.port = new CustomDropdown(elements.portSelect, {
        triggerClass: 'port-trigger',
        showCheck: false,
        emptyText: '未检测到串口',
        emptyIcon: 'fa-usb',
        formatItem: (opt) => {
            const isCU = opt.textContent.startsWith('cu.');
            const icon = isCU ? 'fa-microchip' : 'fa-plug';
            const badge = isCU ? '<span class="item-badge">推荐</span>' : '';
            return `<i class="fas ${icon}" style="color:var(--primary);font-size:10px;width:14px;text-align:center;flex-shrink:0;"></i>
                    <span class="item-text">${opt.textContent}</span>${badge}`;
        },
    });

    // Baud rate dropdown
    dropdowns.baudRate = new CustomDropdown(elements.baudRate, {
        showCheck: true,
        formatItem: (opt) => {
            const isRecommended = opt.textContent.includes('推荐');
            const badge = isRecommended ? '<span class="item-badge">推荐</span>' : '';
            return `<span class="item-check"><i class="fas fa-check"></i></span>
                    <span class="item-text">${opt.textContent}</span>${badge}`;
        },
    });

    // Data bits dropdown
    dropdowns.dataBits = new CustomDropdown(elements.dataBits, {
        showCheck: true,
    });

    // Stop bits dropdown
    dropdowns.stopBits = new CustomDropdown(elements.stopBits, {
        showCheck: true,
    });

    // Parity dropdown
    dropdowns.parity = new CustomDropdown(elements.parity, {
        showCheck: true,
        formatItem: (opt) => {
            const labels = { 'none': '无', 'even': '偶', 'odd': '奇' };
            const label = labels[opt.value] || opt.textContent;
            return `<span class="item-check"><i class="fas fa-check"></i></span>
                    <span class="item-text">${label}</span>`;
        },
    });

    // Level filter dropdown - 已移除，改为复选框
    
    // Export format dropdown (in settings modal)
    if (elements.defaultExportFormat) {
        dropdowns.exportFormat = new CustomDropdown(elements.defaultExportFormat, {
            showCheck: true,
        });
    }
}

// ========== Initialization ==========
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initDropdowns();
    loadSearchHistory();
    updateModeSwitcher(); // 初始化模式切换器

    if (window.__TAURI__) {
        listPorts();
        setInterval(listPorts, 3000);
    }

    setupEventListeners();
    setupSmartScroll();
    setupContextMenu();
    setupSendPanel();
    startBatchProcessing();
    loadSettings();
});

// ========== Settings Management ==========
async function loadSettings() {
    try {
        // 加载保存路径
        savePath = await window.__TAURI__.invoke('get_save_path');
        elements.savePathInput.value = savePath;
        
        // 从 localStorage 加载其他设置
        const savedFormat = localStorage.getItem('defaultExportFormat');
        if (savedFormat) {
            defaultExportFormat = savedFormat;
            elements.defaultExportFormat.value = savedFormat;
        }
        
        const savedInterval = localStorage.getItem('autoSaveInterval');
        if (savedInterval) {
            autoSaveIntervalSeconds = parseInt(savedInterval);
            elements.autoSaveIntervalInput.value = savedInterval;
        }
        
        // 加载显示模式
        const savedMode = localStorage.getItem('displayMode');
        if (savedMode && MODE_CONFIG[savedMode]) {
            displayMode = savedMode;
            updateModeSwitcher();
        }
    } catch (error) {
        console.error('加载设置失败:', error);
    }
}

async function saveSettingsToBackend() {
    try {
        // 保存路径到后端
        if (savePath) {
            await window.__TAURI__.invoke('set_save_path', { path: savePath });
        }
        
        // 保存其他设置到 localStorage
        localStorage.setItem('defaultExportFormat', defaultExportFormat);
        localStorage.setItem('autoSaveInterval', autoSaveIntervalSeconds.toString());
        
        showStatus('设置已保存', 'success');
        elements.settingsModal.style.display = 'none';
        
        // 如果自动保存已启用，重启自动保存以应用新间隔
        if (autoSaveEnabled) {
            stopAutoSave();
            startAutoSave();
        }
    } catch (error) {
        console.error('保存设置失败:', error);
        showStatus(`保存设置失败: ${error}`, 'error');
    }
}

async function browseSavePathHandler() {
    try {
        const selected = await window.__TAURI__.dialog.open({
            directory: true,
            multiple: false,
            defaultPath: savePath || undefined,
            title: '选择日志保存目录'
        });
        
        if (selected) {
            savePath = selected;
            elements.savePathInput.value = selected;
        }
    } catch (error) {
        console.error('选择目录失败:', error);
        showStatus(`选择目录失败: ${error}`, 'error');
    }
}

function resetSettingsHandler() {
    savePath = '';
    defaultExportFormat = 'txt';
    autoSaveIntervalSeconds = 30;
    
    elements.savePathInput.value = '';
    elements.defaultExportFormat.value = 'txt';
    elements.autoSaveIntervalInput.value = '30';
    
    showStatus('设置已恢复为默认值', 'info');
}

function setupSettingsEvents() {
    // 打开设置
    elements.btnSettings.addEventListener('click', () => {
        elements.settingsModal.style.display = 'flex';
    });
    
    // 关闭设置
    elements.closeSettings.addEventListener('click', () => {
        elements.settingsModal.style.display = 'none';
    });
    
    // 点击遮罩关闭
    elements.settingsModal.addEventListener('click', (e) => {
        if (e.target === elements.settingsModal) {
            elements.settingsModal.style.display = 'none';
        }
    });
    
    // ESC 关闭
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.settingsModal.style.display === 'flex') {
            elements.settingsModal.style.display = 'none';
        }
    });
    
    // 浏览保存路径
    elements.browseSavePath.addEventListener('click', browseSavePathHandler);
    
    // 保存设置
    elements.saveSettings.addEventListener('click', () => {
        defaultExportFormat = elements.defaultExportFormat.value;
        autoSaveIntervalSeconds = parseInt(elements.autoSaveIntervalInput.value);
        saveSettingsToBackend();
    });
    
    // 恢复默认
    elements.resetSettings.addEventListener('click', resetSettingsHandler);
}

// 在 setupEventListeners 中调用
setupSettingsEvents();

// ========== Level Multi-select Dropdown ==========
function setupLevelMultiselect() {
    const multiselect = document.getElementById('levelMultiselect');
    const trigger = document.getElementById('levelMultiselectTrigger');
    const dropdown = document.getElementById('levelMultiselectDropdown');
    const text = document.getElementById('levelMultiselectText');
    const selectAllBtn = document.getElementById('levelSelectAll');
    const deselectAllBtn = document.getElementById('levelDeselectAll');
    const checkboxes = [
        elements.levelVerbose,
        elements.levelDebug,
        elements.levelInfo,
        elements.levelWarn,
        elements.levelError
    ];

    // 更新显示文本
    function updateText() {
        const checked = checkboxes.filter(cb => cb.checked);
        if (checked.length === 0) {
            text.textContent = '未选择级别';
            text.style.color = 'var(--text-hint)';
        } else if (checked.length === checkboxes.length) {
            text.textContent = '全部级别';
            text.style.color = 'var(--text-primary)';
        } else {
            const labels = checked.map(cb => {
                const label = cb.parentElement.querySelector('.level-badge').textContent;
                return label;
            });
            text.textContent = labels.join(', ');
            text.style.color = 'var(--text-primary)';
        }
    }

    // 切换下拉框
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        multiselect.classList.toggle('open');
    });

    // 点击外部关闭
    document.addEventListener('click', (e) => {
        if (!multiselect.contains(e.target)) {
            multiselect.classList.remove('open');
        }
    });

    // 全选
    selectAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        checkboxes.forEach(cb => {
            if (!cb.checked) {
                cb.checked = true;
                cb.dispatchEvent(new Event('change'));
            }
        });
        updateText();
    });

    // 清空
    deselectAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        checkboxes.forEach(cb => {
            if (cb.checked) {
                cb.checked = false;
                cb.dispatchEvent(new Event('change'));
            }
        });
        updateText();
    });

    // 选项点击
    checkboxes.forEach(checkbox => {
        const option = checkbox.parentElement;

        // 点击选项切换复选框
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change'));
            updateText();
        });

        // 监听复选框变化
        checkbox.addEventListener('change', () => {
            updateText();
        });
    });

    // 初始化文本
    updateText();
}

// 初始化多选下拉框
setupLevelMultiselect();
