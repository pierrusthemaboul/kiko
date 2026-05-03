import AsyncStorage from '@react-native-async-storage/async-storage';

export const TUTORIAL_ENABLED_KEY = 'tutorial_enabled';

export async function getTutorialEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(TUTORIAL_ENABLED_KEY);

    if (raw === null) {
      // First time: enable tutorial
      return true;
    }

    if (raw === 'true') {
      return true;
    }

    if (raw === 'false') {
      return false;
    }

    // Default for corrupted data
    return false;
  } catch (e) {
    console.warn('[TutorialStorage] Error reading tutorial state:', e);
    // On error, better to not block the user with a recurring tutorial
    return false;
  }
}

export async function setTutorialEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(TUTORIAL_ENABLED_KEY, enabled ? 'true' : 'false');
}

export async function disableTutorial(): Promise<void> {
  await setTutorialEnabled(false);
}
