/**
 * Simple development logger that can be toggled with the
 * `EXPO_PUBLIC_DEBUG_LOGS` environment variable.
 */

import Constants from 'expo-constants';

const DEBUG_LOG_ENABLED = (() => {
  try {
    const flag = Constants.expoConfig?.extra?.EXPO_PUBLIC_DEBUG_LOGS;
    return flag === 'verbose';
  } catch { }
  return false;
})();

const ALLOWED_TAGS = new Set([
  'PREFILTER_COUNTS',
  'SCORING_COUNTS',
  'SELECTION_PATH',
  'WHY_SELECTED',
]);

export function devLog(tag: string, payload?: unknown) {
  if (!DEBUG_LOG_ENABLED || !ALLOWED_TAGS.has(tag)) return;

  const timestamp = new Date().toISOString();
  if (payload !== undefined) {
    console.log(`[DEV][${tag}] ${timestamp}`, payload);
  } else {
    console.log(`[DEV][${tag}] ${timestamp}`);
  }
}

export default devLog;
