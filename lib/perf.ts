type TraceController = {
  start: () => void;
  stop: () => void;
};

import Constants from 'expo-constants';

const PERF_ENABLED = (() => {
  try {
    return (Constants.expoConfig?.extra?.EXPO_PUBLIC_ENABLE_PERF ?? 'false') === 'true';
  } catch { }
  return false;
})();

export const isPerformanceEnabled = () => PERF_ENABLED;

export function trace(name: string): TraceController {
  if (!PERF_ENABLED) {
    return {
      start: () => undefined,
      stop: () => undefined,
    };
  }

  let startTime: number | null = null;

  return {
    start: () => {
      startTime = Date.now();
      console.log('[PerfStub] start', name);
    },
    stop: () => {
      const endTime = Date.now();
      const duration = startTime ? endTime - startTime : undefined;
      console.log('[PerfStub] stop', name, duration !== undefined ? `${duration}ms` : '');
      startTime = null;
    },
  };
}
