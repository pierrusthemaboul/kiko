type TraceController = {
  start: () => void;
  stop: () => void;
};

const ENABLE_PERF = (() => {
  try {
    return (process.env.EXPO_PUBLIC_ENABLE_PERF ?? 'false') === 'true';
  } catch {
    return false;
  }
})();

export const isPerformanceEnabled = () => ENABLE_PERF;

export function trace(name: string): TraceController {
  if (!ENABLE_PERF) {
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
