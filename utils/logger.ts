/**
 * Centralized logging utility
 * Set ENABLE_LOGS to false to disable all logs at once
 */

const ENABLE_LOGS = false; // Change to false to disable all logs

export const logger = {
  log: (...args: any[]) => {
    if (ENABLE_LOGS) console.log(...args);
  },
  warn: (...args: any[]) => {
    if (ENABLE_LOGS) console.warn(...args);
  },
  error: (...args: any[]) => {
    if (ENABLE_LOGS) console.error(...args);
  },
  info: (...args: any[]) => {
    if (ENABLE_LOGS) console.info(...args);
  },
};

// Export a no-op version for production
export const noop = () => {};
