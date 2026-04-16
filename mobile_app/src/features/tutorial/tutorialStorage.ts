import AsyncStorage from '@react-native-async-storage/async-storage';

export const TUTORIAL_ENABLED_KEY = 'tutorial_enabled';

export async function getTutorialEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(TUTORIAL_ENABLED_KEY);

    if (raw === null) {
      return true;
    }

    if (raw === 'true') {
      return true;
    }

    if (raw === 'false') {
      return false;
    }

    return true;
  } catch {
    return true;
  }
}

export async function setTutorialEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(TUTORIAL_ENABLED_KEY, enabled ? 'true' : 'false');
}

export async function disableTutorial(): Promise<void> {
  await setTutorialEnabled(false);
}
