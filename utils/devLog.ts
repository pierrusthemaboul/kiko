/**
 * Simple development logger that can be toggled with the
 * `EXPO_PUBLIC_DEBUG_LOGS` environment variable.
 */

const isEnabled = (() => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      const flag = process.env.EXPO_PUBLIC_DEBUG_LOGS ?? process.env.DEBUG_LOGS;
      return flag === '1' || flag === 'true';
    }
  } catch (err) {
    // noop – fall back to disabled
  }
  return false;
})();

const ALLOWED_TAGS = new Set([
  'PREFILTER_COUNTS',
  'SCORING_COUNTS',
  'SELECTION_PATH',
  'WHY_SELECTED',
]);

export function devLog(tag: string, payload?: unknown) {
  if (!isEnabled || !ALLOWED_TAGS.has(tag)) return;

  const timestamp = new Date().toISOString();
  if (payload !== undefined) {
    console.log(`[DEV][${tag}] ${timestamp}`, payload);
  } else {
    console.log(`[DEV][${tag}] ${timestamp}`);
  }
}

export default devLog;
