export const state = {
  allEntries: [],
  filteredEntries: [],
  pendingEntries: [],

  isConnected: false,
  selectedPortPath: '',

  autoScroll: true,
  isUserScrolling: false,
  scrollTimeout: null,

  bookmarks: new Map(),
  selectedLogId: null,

  // Search
  searchHistory: [],
  searchMatches: [],
  currentSearchIndex: -1,

  // UI
  fontSize: 12,
  wrapLines: false,

  // Theme
  isDarkTheme: false,

  // Tag filter
  tagFilterInitialized: false,

  // Settings
  savePath: '',
  defaultExportFormat: 'txt',
  autoSaveEnabled: false,
  autoSaveIntervalSeconds: 30,
  autoSaveInterval: null,

  // Display mode
  displayMode: 'log',

  // View lock
  isViewLocked: false,
  lockReason: '',
  pendingMessageCount: 0,
};

