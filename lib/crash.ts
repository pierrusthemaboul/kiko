// TEMPORAIRE: Crashlytics désactivé en dev, sera réactivé pour EAS build
// import crashlytics from '@react-native-firebase/crashlytics';
import Constants from 'expo-constants';

type CrashContext = Record<string, unknown> | undefined;

const CRASHLYTICS_ENABLED = (() => {
  try {
    return (Constants.expoConfig?.extra?.EXPO_PUBLIC_ENABLE_CRASHLYTICS ?? 'true') === 'true';
  } catch { }
  return true;
})();

export const isCrashlyticsEnabled = () => CRASHLYTICS_ENABLED;

export async function recordNonFatal(error: unknown, context: CrashContext = undefined) {
  if (!CRASHLYTICS_ENABLED) return;
  // Désactivé en dev - sera réactivé pour EAS build
  console.log('[Crashlytics stub] recordNonFatal:', error, context);
}

export async function recordFatalError(error: unknown, context: CrashContext = undefined) {
  if (!CRASHLYTICS_ENABLED) return;
  // Désactivé en dev - sera réactivé pour EAS build
  console.log('[Crashlytics stub] recordFatalError:', error, context);
}

export async function setUserId(userId: string | null) {
  if (!CRASHLYTICS_ENABLED) return;
  // Désactivé en dev - sera réactivé pour EAS build
  console.log('[Crashlytics stub] setUserId:', userId);
}

export async function log(message: string) {
  if (!CRASHLYTICS_ENABLED) return;
  // Désactivé en dev - sera réactivé pour EAS build
  console.log('[Crashlytics stub] log:', message);
}
