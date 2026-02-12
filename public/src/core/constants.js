export const MAX_LOG_ENTRIES = 10000;
export const BATCH_INTERVAL = 50;
export const AUTO_SAVE_INTERVAL = 30000;
export const MAX_SEARCH_HISTORY = 20;

export const LOCK_REASON = {
  search: { icon: 'fa-search', text: '搜索中' },
  scroll: { icon: 'fa-hand-paper', text: '手动浏览' },
  manual: { icon: 'fa-lock', text: '已锁定' },
};

export const MODE_CONFIG = {
  log: {
    name: 'Log',
    icon: 'fa-list-ul',
    description: '结构化日志显示',
    shortcut: '1',
  },
  hex: {
    name: 'HEX',
    icon: 'fa-code',
    description: '十六进制数据查看',
    shortcut: '2',
  },
  normal: {
    name: 'Normal',
    icon: 'fa-terminal',
    description: '纯文本终端风格',
    shortcut: '3',
  },
};

export const levelConfig = {
  VERBOSE: { label: 'VERBOSE', bg: 'var(--level-verbose-bg)', color: 'var(--level-verbose-fg)', badgeBg: 'var(--level-verbose-badge)' },
  DEBUG:   { label: 'DEBUG',   bg: 'var(--level-debug-bg)',   color: 'var(--level-debug-fg)',   badgeBg: 'var(--level-debug-badge)' },
  INFO:    { label: 'INFO',    bg: 'var(--level-info-bg)',    color: 'var(--level-info-fg)',    badgeBg: 'var(--level-info-badge)' },
  WARN:    { label: 'WARN',    bg: 'var(--level-warn-bg)',    color: 'var(--level-warn-fg)',    badgeBg: 'var(--level-warn-badge)' },
  ERROR:   { label: 'ERROR',   bg: 'var(--level-error-bg)',   color: 'var(--level-error-fg)',   badgeBg: 'var(--level-error-badge)' },
  UNKNOWN: { label: 'UNKNOWN', bg: 'var(--bg-secondary)',     color: 'var(--text-secondary)',   badgeBg: 'var(--bg-secondary)' },
};

