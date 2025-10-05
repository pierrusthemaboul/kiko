import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Audio } from 'expo-av';
import { FirebaseAnalytics } from '../lib/firebase';

interface CachedSoundTimestampMap {
  [key: string]: number;
}

export type PlayableSoundKey =
  | 'correct'
  | 'incorrect'
  | 'levelUp'
  | 'countdown'
  | 'gameover'
  | 'uiConfirm'
  | 'timePortal'
  | 'parchment';

export type MusicTheme = 'mystery' | 'western' | 'scifi';

const SOUND_PATHS: Record<PlayableSoundKey, ReturnType<typeof require>> = {
  correct: require('../assets/sounds/corectok.wav'),
  incorrect: require('../assets/sounds/361260__japanyoshithegamer__8-bit-wrong-sound.wav'),
  levelUp: require('../assets/sounds/423455__ohforheavensake__trumpet-brass-fanfare.wav'),
  countdown: require('../assets/sounds/bop.wav'),
  gameover: require('../assets/sounds/242208__wagna__failfare.mp3'),
  uiConfirm: require('../assets/audio/sfx/ui/ui-confirm.wav'),
  timePortal: require('../assets/audio/sfx/ambient/time-portal.wav'),
  parchment: require('../assets/audio/sfx/ambient/parchment.wav'),
};

const MUSIC_PATHS: Record<MusicTheme, ReturnType<typeof require>> = {
  mystery: require('../assets/audio/music/mystery-loop.wav'),
  western: require('../assets/audio/music/western-loop.wav'),
  scifi: require('../assets/audio/music/scifi-loop.wav'),
};

const SOUND_MIN_INTERVAL_MS: Partial<Record<PlayableSoundKey, number>> = {
  correct: 120,
  incorrect: 120,
  levelUp: 240,
  countdown: 550,
  gameover: 300,
  uiConfirm: 120,
  timePortal: 600,
  parchment: 250,
};

interface AudioContextValue {
  playCorrectSound: () => void;
  playIncorrectSound: () => void;
  playLevelUpSound: () => void;
  playCountdownSound: () => void;
  playGameOverSound: () => void;
  playUiConfirmSound: () => void;
  playTimePortalSound: () => void;
  playParchmentSound: () => void;
  playMusicTheme: (theme: MusicTheme) => Promise<void>;
  stopMusic: () => Promise<void>;
  currentMusicTheme: MusicTheme | null;
  setSoundVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
  toggleSound: (enabled: boolean) => void;
  toggleMusic: (enabled: boolean) => void;
  isSoundEnabled: boolean;
  isMusicEnabled: boolean;
  soundVolume: number;
  musicVolume: number;
}

const AudioContext = createContext<AudioContextValue | null>(null);

const warnMissingProvider = (): never => {
  const message = 'useAudio must be used within an <AudioProvider />';
  console.error(message);
  throw new Error(message);
};

const useCreateAudioManager = (): AudioContextValue => {
  const soundVolumeRef = useRef(0.24); // 0.48 * 0.5
  const musicVolumeRef = useRef(0.24);
  const [soundVolume, setSoundVolumeState] = useState(0.24);
  const [musicVolume, setMusicVolumeState] = useState(0.24);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [currentMusicTheme, setCurrentMusicTheme] = useState<MusicTheme | null>(null);
  const isInitializedRef = useRef(false);
  const initPromiseRef = useRef<Promise<void> | null>(null);
  const lastSoundTimestamps = useRef<CachedSoundTimestampMap>({});
  const currentMusicRef = useRef<Audio.Sound | null>(null);
  const currentMusicThemeRef = useRef<MusicTheme | null>(null);

  useEffect(() => {
    console.log('[Audio] useAudio mounted – starting init');

    const configureAudioMode = async () => {
      try {
        console.log('[Audio] initAudio: configuring audio mode');
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        isInitializedRef.current = true;
        console.log('[Audio] initAudio: configuration ready');
      } catch (error) {
        console.error('[Audio] initAudio: failed to configure audio mode', error);
        FirebaseAnalytics.error('audio_init_error', error instanceof Error ? error.message : 'Unknown', 'useAudioInit');
        throw error;
      }
    };

    if (!initPromiseRef.current) {
      initPromiseRef.current = configureAudioMode();
    }

    return () => {
      console.log('[Audio] useAudio cleanup – resetting audio state');
      isInitializedRef.current = false;
      initPromiseRef.current = null;
    };
  }, []);

  const ensureInitialized = useCallback(async () => {
    if (isInitializedRef.current) {
      return;
    }

    if (initPromiseRef.current) {
      try {
        console.log('[Audio] ensureInitialized: waiting for initialization');
        await initPromiseRef.current;
      } catch (error) {
        console.warn('[Audio] ensureInitialized: init failed, skipping playback');
      }
    } else {
      console.warn('[Audio] ensureInitialized: init promise missing');
    }
  }, []);

  const playSound = useCallback(
    async (soundKey: PlayableSoundKey, volumeMultiplier: number = 1.0) => {
      const now = Date.now();
      const lastPlayedAt = lastSoundTimestamps.current[soundKey] ?? 0;
      const minInterval = SOUND_MIN_INTERVAL_MS[soundKey] ?? 0;

      if (minInterval && now - lastPlayedAt < minInterval) {
        console.log('[Audio] playSound throttled', { soundKey, elapsed: now - lastPlayedAt, minInterval });
        return;
      }

      await ensureInitialized();

      if (!isSoundEnabled) {
        console.warn('[Audio] playSound aborted', { soundKey, reason: 'sound-disabled' });
        return;
      }

      if (!isInitializedRef.current) {
        console.warn('[Audio] playSound aborted', { soundKey, reason: 'not-initialized' });
        return;
      }

      lastSoundTimestamps.current[soundKey] = now;

      const finalVolume = Math.max(0, Math.min(soundVolumeRef.current * volumeMultiplier, 1.0));
      let soundObject: Audio.Sound | null = null;

      console.log('[Audio] playSound requested', { soundKey, volumeMultiplier, finalVolume });

      try {
        const { sound } = await Audio.Sound.createAsync(
          SOUND_PATHS[soundKey],
          {
            volume: finalVolume,
            shouldPlay: true,
          },
          (status) => {
            if (status.didJustFinish) {
              console.log('[Audio] playback finished – unloading', { soundKey });
              soundObject?.unloadAsync().catch((unloadError) => {
                console.warn('[Audio] playback finished – unload failed', { soundKey, unloadError });
              });
            }
          }
        );
        soundObject = sound;
        console.log('[Audio] playSound started', { soundKey, finalVolume });

        if (['correct', 'incorrect', 'levelUp', 'gameover'].includes(soundKey)) {
          FirebaseAnalytics.logEvent('sound_played', { sound_name: soundKey });
        }
      } catch (error) {
        console.error('[Audio] playSound error', { soundKey, error });
        FirebaseAnalytics.error('audio_playback_error', `Sound: ${soundKey}, Error: ${error instanceof Error ? error.message : 'Unknown'}`, 'playSound');
        soundObject?.unloadAsync().catch(() => {});
      }
    },
    [ensureInitialized, isSoundEnabled]
  );

  const playCountdownSound = useCallback(() => {
    console.log('[Audio] playCountdownSound triggered');
    void playSound('countdown', 1);
  }, [playSound]);

  const playCorrectSound = useCallback(() => {
    console.log('[Audio] playCorrectSound triggered');
    void playSound('correct', 1.0);
  }, [playSound]);

  const playIncorrectSound = useCallback(() => {
    console.log('[Audio] playIncorrectSound triggered');
    void playSound('incorrect', 0.7);
  }, [playSound]);

  const playLevelUpSound = useCallback(() => {
    console.log('[Audio] playLevelUpSound triggered');
    void playSound('levelUp', 0.8);
  }, [playSound]);

  const playGameOverSound = useCallback(() => {
    console.log('[Audio] playGameOverSound triggered');
    void playSound('gameover', 0.8);
  }, [playSound]);

  const playUiConfirmSound = useCallback(() => {
    console.log('[Audio] playUiConfirmSound triggered');
    void playSound('uiConfirm', 1.0);
  }, [playSound]);

  const playTimePortalSound = useCallback(() => {
    console.log('[Audio] playTimePortalSound triggered');
    void playSound('timePortal', 1.0);
  }, [playSound]);

  const playParchmentSound = useCallback(() => {
    console.log('[Audio] playParchmentSound triggered');
    void playSound('parchment', 0.9);
  }, [playSound]);

  const stopCurrentMusic = useCallback(async () => {
    if (!currentMusicRef.current) {
      return;
    }
    console.log('[Audio] stopCurrentMusic triggered');
    try {
      await currentMusicRef.current.stopAsync();
    } catch (error) {
      console.warn('[Audio] stopCurrentMusic: stop failed', error);
    }
    try {
      await currentMusicRef.current.unloadAsync();
    } catch (error) {
      console.warn('[Audio] stopCurrentMusic: unload failed', error);
    }
    currentMusicRef.current = null;
    currentMusicThemeRef.current = null;
    setCurrentMusicTheme(null);
  }, []);

  const playMusicTheme = useCallback(async (theme: MusicTheme) => {
    console.log('[Audio] playMusicTheme requested', { theme });
    await ensureInitialized();

    if (!isMusicEnabled) {
      console.warn('[Audio] playMusicTheme aborted', { theme, reason: 'music-disabled' });
      return;
    }

    if (currentMusicThemeRef.current === theme && currentMusicRef.current) {
      console.log('[Audio] playMusicTheme resume existing', { theme });
      try {
        await currentMusicRef.current.setStatusAsync({ shouldPlay: true, isLooping: true });
        await currentMusicRef.current.setVolumeAsync(musicVolumeRef.current);
      } catch (error) {
        console.warn('[Audio] playMusicTheme: resume failed', error);
      }
      return;
    }

    await stopCurrentMusic();

    const source = MUSIC_PATHS[theme];
    try {
      const { sound } = await Audio.Sound.createAsync(source, {
        volume: musicVolumeRef.current,
        shouldPlay: true,
        isLooping: true,
      });
      currentMusicRef.current = sound;
      currentMusicThemeRef.current = theme;
      setCurrentMusicTheme(theme);
      console.log('[Audio] playMusicTheme started', { theme, volume: musicVolumeRef.current });
    } catch (error) {
      console.error('[Audio] playMusicTheme error', { theme, error });
      FirebaseAnalytics.error('audio_music_error', error instanceof Error ? error.message : 'Unknown', 'playMusicTheme');
    }
  }, [ensureInitialized, isMusicEnabled, stopCurrentMusic]);

  const updateVolume = useCallback(async (volume: number, type: 'sound' | 'music') => {
    try {
      const safeVolume = Math.max(0, Math.min(1.0, volume));
      console.log('[Audio] setVolume requested', { type, volume, safeVolume });
      if (type === 'sound') {
        soundVolumeRef.current = safeVolume;
        setSoundVolumeState(safeVolume);
      } else {
        musicVolumeRef.current = safeVolume;
        setMusicVolumeState(safeVolume);
        if (currentMusicRef.current) {
          try {
            await currentMusicRef.current.setVolumeAsync(safeVolume);
          } catch (error) {
            console.warn('[Audio] setVolume: failed to update music volume', error);
          }
        }
      }
    } catch (error) {
      console.error('[Audio] setVolume error', { type, error });
      FirebaseAnalytics.error('audio_volume_error', `Type: ${type}, Error: ${error instanceof Error ? error.message : 'Unknown'}`, 'setVolume');
    }
  }, []);

  const setEffectsVolume = useCallback((volume: number) => {
    void updateVolume(volume, 'sound');
  }, [updateVolume]);

  const setBackgroundVolume = useCallback((volume: number) => {
    void updateVolume(volume, 'music');
  }, [updateVolume]);

  const toggleSound = useCallback((enabled: boolean) => {
    console.log('[Audio] toggleSound', { enabled });
    setIsSoundEnabled(enabled);
    FirebaseAnalytics.logEvent('sound_toggled', { enabled, type: 'effects' });
  }, []);

  const toggleMusic = useCallback((enabled: boolean) => {
    console.log('[Audio] toggleMusic', { enabled });
    setIsMusicEnabled(enabled);
    FirebaseAnalytics.logEvent('sound_toggled', { enabled, type: 'music' });
    if (!enabled) {
      void stopCurrentMusic();
    } else if (currentMusicThemeRef.current && !currentMusicRef.current) {
      void playMusicTheme(currentMusicThemeRef.current);
    }
  }, [playMusicTheme, stopCurrentMusic]);

  return useMemo(() => ({
    playCorrectSound,
    playIncorrectSound,
    playLevelUpSound,
    playCountdownSound,
    playGameOverSound,
    playUiConfirmSound,
    playTimePortalSound,
    playParchmentSound,
    playMusicTheme,
    stopMusic: stopCurrentMusic,
    currentMusicTheme,
    setSoundVolume: setEffectsVolume,
    setMusicVolume: setBackgroundVolume,
    toggleSound,
    toggleMusic,
    isSoundEnabled,
    isMusicEnabled,
    soundVolume,
    musicVolume,
  }), [
    playCorrectSound,
    playIncorrectSound,
    playLevelUpSound,
    playCountdownSound,
    playGameOverSound,
    playUiConfirmSound,
    playTimePortalSound,
    playParchmentSound,
    playMusicTheme,
    stopCurrentMusic,
    currentMusicTheme,
    setEffectsVolume,
    setBackgroundVolume,
    toggleSound,
    toggleMusic,
    isSoundEnabled,
    isMusicEnabled,
    soundVolume,
    musicVolume,
  ]);
};

interface AudioProviderProps {
  children: ReactNode;
}

export const AudioProvider = ({ children }: AudioProviderProps) => {
  const value = useCreateAudioManager();
  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
};

export const useAudio = (): AudioContextValue => {
  const context = useContext(AudioContext);
  if (!context) {
    return warnMissingProvider();
  }
  return context;
};

export default useAudio;
