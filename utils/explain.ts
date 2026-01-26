type LoggedEntry = {
  eventId: string | null;
  rule: string;
  reason: string;
  timestamp: string;
};

import Constants from 'expo-constants';

const EXPLAIN_LOG_ENABLED = (() => {
  try {
    const flag = Constants.expoConfig?.extra?.EXPO_PUBLIC_EXPLAIN_LOGS;
    return flag === 'verbose';
  } catch (err) {
    // ignore – default disabled
  }
  return false;
})();

export function explainEnabled(): boolean {
  return EXPLAIN_LOG_ENABLED;
}

export function explainLog(message: string, payload?: unknown) {
  if (!explainEnabled()) return;
  const ts = new Date().toISOString();
  if (payload !== undefined) {
    console.log(`[EXPLAIN][${ts}] ${message}`, payload);
  } else {
    console.log(`[EXPLAIN][${ts}] ${message}`);
  }
}

export function createExclusionAccumulator(limit = 100) {
  const entries: LoggedEntry[] = [];

  function logExclusion(evt: { id?: string | null }, rule: string, reason: string) {
    if (!explainEnabled()) return;
    if (entries.length >= limit) return;
    entries.push({
      eventId: evt?.id ?? null,
      rule,
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  function flush(label: string) {
    if (!explainEnabled()) return { entries: [], truncated: 0 };
    const snapshot = entries.splice(0, entries.length);
    const truncated = Math.max(0, snapshot.length - limit);
    if (snapshot.length > 0) {
      console.log(`[EXPLAIN][${label}]`, snapshot);
    }
    return { entries: snapshot, truncated };
  }

  function size() {
    return entries.length;
  }

  return { logExclusion, flush, size };
}
