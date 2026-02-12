import { levelConfig } from '../../core/constants.js';

const LOG_PATTERN = /^\[(\d{2}:\d{2}:\d{2}\.\d{3})\]\s+\[(\w+)\]\s+\[(\w+)\]\s+(.+?)(?:\s+\(([^:]+):(\d+)\))?$/;

function parseLogLevel(levelStr) {
  const levels = { VERBOSE: 0, DEBUG: 1, INFO: 2, WARN: 3, ERROR: 4, NONE: 5 };
  return levels[levelStr.toUpperCase()] ?? -1;
}

export function parseLogLine(line, index) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const match = LOG_PATTERN.exec(trimmed);
  let timestamp, level, tag, message, location;

  if (match) {
    timestamp = match[1];
    level = parseLogLevel(match[2]);
    tag = match[3];
    message = match[4].trim();
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
