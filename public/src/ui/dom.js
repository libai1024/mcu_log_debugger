let cached = null;

export function getElements() {
  if (cached) return cached;

  cached = {
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

    // Theme
    toggleTheme: document.getElementById('toggleTheme'),

    // Filters - levels
    levelVerbose: document.getElementById('levelVerbose'),
    levelDebug: document.getElementById('levelDebug'),
    levelInfo: document.getElementById('levelInfo'),
    levelWarn: document.getElementById('levelWarn'),
    levelError: document.getElementById('levelError'),

    // Search (sidebar)
    keywordFilter: document.getElementById('keywordFilter'),
    wholeWord: document.getElementById('wholeWord'),
    useRegex: document.getElementById('useRegex'),
    caseSensitive: document.getElementById('caseSensitive'),
    regexShortcuts: document.getElementById('regexShortcuts'),
    searchClearBtn: document.getElementById('searchClearBtn'),
    searchPrev: document.getElementById('searchPrev'),
    searchNext: document.getElementById('searchNext'),
    searchCount: document.getElementById('searchCount'),
    searchHistoryDropdown: document.getElementById('searchHistoryDropdown'),
    historyList: document.getElementById('historyList'),
    historyClearBtn: document.getElementById('historyClearBtn'),

    // Search (stats bar)
    statSearchInput: document.getElementById('statSearchInput'),
    statSearchClear: document.getElementById('statSearchClear'),
    statSearchPrev: document.getElementById('statSearchPrev'),
    statSearchNext: document.getElementById('statSearchNext'),
    statSearchCount: document.getElementById('statSearchCount'),
    statSearchHistoryDropdown: document.getElementById('statSearchHistoryDropdown'),
    statHistoryList: document.getElementById('statHistoryList'),
    statHistoryClearBtn: document.getElementById('statHistoryClearBtn'),

    // Active filters
    activeFilters: document.getElementById('activeFilters'),
    activeFiltersList: document.getElementById('activeFiltersList'),
    clearAllFilters: document.getElementById('clearAllFilters'),

    // Tags
    tagList: document.getElementById('tagList'),
    toggleAllTags: document.getElementById('toggleAllTags'),

    // Hidden display option checkboxes
    autoScroll: document.getElementById('autoScroll'),
    showTimestamp: document.getElementById('showTimestamp'),
    showLevel: document.getElementById('showLevel'),
    showTag: document.getElementById('showTag'),
    showLocation: document.getElementById('showLocation'),
    autoSave: document.getElementById('autoSave'),

    // Toolbar buttons
    btnAutoScroll: document.getElementById('btnAutoScroll'),
    btnShowTimestamp: document.getElementById('btnShowTimestamp'),
    btnShowLevel: document.getElementById('btnShowLevel'),
    btnShowTag: document.getElementById('btnShowTag'),
    btnShowLocation: document.getElementById('btnShowLocation'),
    btnAutoSave: document.getElementById('btnAutoSave'),
    toggleWrap: document.getElementById('toggleWrap'),
    increaseFont: document.getElementById('increaseFont'),
    decreaseFont: document.getElementById('decreaseFont'),

    // Log display
    logHead: document.getElementById('logHead'),
    logBody: document.getElementById('logBody'),
    logContainer: document.getElementById('logContainer'),
    logTable: document.getElementById('logTable'),
    emptyState: document.getElementById('emptyState'),
    logInfo: document.getElementById('logInfo'),
    filterInfo: document.getElementById('filterInfo'),
    newDataToast: document.getElementById('newDataToast'),
    jumpToNew: document.getElementById('jumpToNew'),
    scrollToBottom: document.getElementById('scrollToBottom'),
    btnViewLock: document.getElementById('btnViewLock'),
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

    // Context menu
    contextMenu: document.getElementById('contextMenu'),
    ctxBookmark: document.getElementById('ctxBookmark'),
    ctxCopy: document.getElementById('ctxCopy'),
    ctxCopyRow: document.getElementById('ctxCopyRow'),
    ctxFilterTag: document.getElementById('ctxFilterTag'),
    ctxFilterLevel: document.getElementById('ctxFilterLevel'),

    // Send
    sendInput: document.getElementById('sendInput'),
    sendBtn: document.getElementById('sendBtn'),
    sendHex: document.getElementById('sendHex'),
    sendNewline: document.getElementById('sendNewline'),
    loopSend: document.getElementById('loopSend'),
    loopInterval: document.getElementById('loopInterval'),
    quickCommands: document.getElementById('quickCommands'),

    // Toast
    toastContainer: document.getElementById('toastContainer'),
  };

  return cached;
}

