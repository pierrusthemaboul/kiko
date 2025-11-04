// TEMPORAIRE: Crashlytics désactivé en dev, sera réactivé pour EAS build
// import crashlytics from '@react-native-firebase/crashlytics';

type CrashContext = Record<string, unknown> | undefined;

const ENABLE_CRASHLYTICS = (() => {
  try {
    return (process.env.EXPO_PUBLIC_ENABLE_CRASHLYTICS ?? 'true') === 'true';
  } catch {
    return true;
  }
})();

export const isCrashlyticsEnabled = () => ENABLE_CRASHLYTICS;

export async function recordNonFatal(error: unknown, context: CrashContext = undefined) {
  if (!ENABLE_CRASHLYTICS) return;
  // Désactivé en dev - sera réactivé pour EAS build
  console.log('[Crashlytics stub] recordNonFatal:', error, context);
}

export async function recordFatalError(error: unknown, context: CrashContext = undefined) {
  if (!ENABLE_CRASHLYTICS) return;
  // Désactivé en dev - sera réactivé pour EAS build
  console.log('[Crashlytics stub] recordFatalError:', error, context);
}

export async function setUserId(userId: string | null) {
  if (!ENABLE_CRASHLYTICS) return;
  // Désactivé en dev - sera réactivé pour EAS build
  console.log('[Crashlytics stub] setUserId:', userId);
}

export async function log(message: string) {
  if (!ENABLE_CRASHLYTICS) return;
  // Désactivé en dev - sera réactivé pour EAS build
  console.log('[Crashlytics stub] log:', message);
}
