type CrashContext = Record<string, unknown> | undefined;

const ENABLE_CRASHLYTICS = (() => {
  try {
    return (process.env.EXPO_PUBLIC_ENABLE_CRASHLYTICS ?? 'false') === 'true';
  } catch {
    return false;
  }
})();

export const isCrashlyticsEnabled = () => ENABLE_CRASHLYTICS;

export async function recordNonFatal(error: unknown, context: CrashContext = undefined) {
  if (!ENABLE_CRASHLYTICS) return;
  const payload = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
  };
  console.log('[CrashlyticsStub] recordNonFatal', payload);
}
