/**
 * In-app debug logger for Telegram Mini App.
 * Stores log entries in memory so they can be rendered on screen.
 * Controlled by VITE_DEBUG_MODE env variable.
 */

const DEBUG_ENABLED = import.meta.env.VITE_DEBUG_MODE === 'true';

export interface LogEntry {
  time: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

const MAX_ENTRIES = 100;
const entries: LogEntry[] = [];
const listeners: Set<() => void> = new Set();

function now(): string {
  return new Date().toISOString().slice(11, 23); // HH:mm:ss.SSS
}

function push(level: LogEntry['level'], ...args: unknown[]) {
  if (!DEBUG_ENABLED) return;

  const message = args.map(a => {
    if (a instanceof Error) return `${a.name}: ${a.message}`;
    if (typeof a === 'object') {
      try { return JSON.stringify(a); } catch { return String(a); }
    }
    return String(a);
  }).join(' ');

  const entry: LogEntry = { time: now(), level, message };
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries.shift();

  // Mirror to real console
  const consoleFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  consoleFn(`[DBG ${entry.time}]`, ...args);

  // Notify React subscribers
  listeners.forEach(fn => fn());
}

export const dlog = {
  info: (...args: unknown[]) => push('info', ...args),
  warn: (...args: unknown[]) => push('warn', ...args),
  error: (...args: unknown[]) => push('error', ...args),
  getEntries: () => [...entries],
  subscribe: (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); },
  clear: () => { entries.length = 0; listeners.forEach(fn => fn()); },
  isEnabled: () => DEBUG_ENABLED,
};
