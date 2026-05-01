import AsyncStorage from '@react-native-async-storage/async-storage';

const MUSIC_VOLUME_KEY = '@timalaus_music_volume';
const MUSIC_ENABLED_KEY = '@timalaus_music_enabled';

const LEGACY_DEFAULT_VOLUME = 0.3;
export const DEFAULT_MUSIC_VOLUME = LEGACY_DEFAULT_VOLUME * 0.25;
export const DEFAULT_MUSIC_ENABLED = true;

const clampVolume = (value: number): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_MUSIC_VOLUME;
  }
  return Math.max(0, Math.min(1, value));
};

export async function getMusicVolumePreference(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(MUSIC_VOLUME_KEY);
    if (raw === null) {
      return DEFAULT_MUSIC_VOLUME;
    }

    const parsed = Number(raw);
    return clampVolume(parsed);
  } catch {
    return DEFAULT_MUSIC_VOLUME;
  }
}

export async function setMusicVolumePreference(volume: number): Promise<void> {
  const safeVolume = clampVolume(volume);
  await AsyncStorage.setItem(MUSIC_VOLUME_KEY, String(safeVolume));
}

export async function getMusicEnabledPreference(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(MUSIC_ENABLED_KEY);
    if (raw === null) {
      return DEFAULT_MUSIC_ENABLED;
    }

    return raw === 'true';
  } catch {
    return DEFAULT_MUSIC_ENABLED;
  }
}

export async function setMusicEnabledPreference(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(MUSIC_ENABLED_KEY, enabled ? 'true' : 'false');
}
