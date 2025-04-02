import { useState, useCallback, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { FirebaseAnalytics } from '../lib/firebase';

interface CachedSound {
  sound: Audio.Sound;
  status: Audio.PlaybackStatus;
  lastPlayed?: number;
}

export const useAudio = () => {
  const [sounds, setSounds] = useState<{ [key: string]: CachedSound | null }>({
    correct: null, incorrect: null, levelUp: null, countdown: null, gameover: null,
  });
  const soundVolumeRef = useRef(0.24); // 0.48 * 0.5
  const musicVolumeRef = useRef(0.24);
  const [soundVolume, setSoundVolume] = useState(0.24);
  const [musicVolume, setMusicVolume] = useState(0.24);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const isInitialized = useRef(false);

  const soundPaths = {
    correct: require('../assets/sounds/corectok.wav'),
    incorrect: require('../assets/sounds/361260__japanyoshithegamer__8-bit-wrong-sound.wav'),
    levelUp: require('../assets/sounds/423455__ohforheavensake__trumpet-brass-fanfare.wav'),
    countdown: require('../assets/sounds/361254__japanyoshithegamer__8-bit-countdown-ready.wav'),
    gameover: require('../assets/sounds/242208__wagna__failfare.mp3')
  };

  useEffect(() => {
    const initAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false
        });
        isInitialized.current = true;
        console.log('[useAudio] Audio system initialized.');
      } catch (error) {
        console.error('[useAudio] Error initializing audio system:', error);
        FirebaseAnalytics.error('audio_init_error', error instanceof Error ? error.message : 'Unknown', 'useAudioInit');
      }
    };
    initAudio();

    return () => {
      console.log('[useAudio] Cleaning up audio resources...');
      isInitialized.current = false;
      Object.values(sounds).forEach(async (soundObj) => {
        if (soundObj?.sound) {
          try {
            await soundObj.sound.unloadAsync();
          } catch (_) {}
        }
      });
      setSounds({});
    };
  }, []);

  const playSound = async (soundKey: string, volumeMultiplier: number = 1.0) => {
    if (!isSoundEnabled || !isInitialized.current) return;

    const finalVolume = Math.max(0, Math.min(soundVolumeRef.current * volumeMultiplier, 1.0));

    let soundObject: Audio.Sound | null = null;
    try {
      const { sound } = await Audio.Sound.createAsync(
        soundPaths[soundKey],
        {
          volume: finalVolume,
          shouldPlay: true,
        },
        (status) => {
          if (status.didJustFinish) {
            soundObject?.unloadAsync().catch(() => {});
          }
        }
      );
      soundObject = sound;

      if (['correct', 'incorrect', 'levelUp', 'gameover'].includes(soundKey)) {
        FirebaseAnalytics.logEvent('sound_played', { sound_name: soundKey });
      }

    } catch (error) {
      console.error(`[useAudio] Error playing sound '${soundKey}':`, error);
      FirebaseAnalytics.error('audio_playback_error', `Sound: ${soundKey}, Error: ${error instanceof Error ? error.message : 'Unknown'}`, 'playSound');
      soundObject?.unloadAsync().catch(() => {});
    }
  };

  const playCorrectSound = useCallback(() => {
    playSound('correct', 1.0);
  }, [isSoundEnabled]);

  const playIncorrectSound = useCallback(() => {
    playSound('incorrect', 0.7);
  }, [isSoundEnabled]);

  const playLevelUpSound = useCallback(() => {
    playSound('levelUp', 0.8);
  }, [isSoundEnabled]);

  const playCountdownSound = useCallback(() => {
    playSound('countdown', 0.5);
  }, [isSoundEnabled]);

  const playGameOverSound = useCallback(() => {
    playSound('gameover', 0.8);
  }, [isSoundEnabled]);

  const setVolume = async (volume: number, type: 'sound' | 'music') => {
    try {
      const safeVolume = Math.max(0, Math.min(1.0, volume));
      if (type === 'sound') {
        console.log(`[useAudio] Setting sound effect volume to ${safeVolume.toFixed(2)}`);
        soundVolumeRef.current = safeVolume;
        setSoundVolume(safeVolume);
      } else {
        console.log(`[useAudio] Setting music volume to ${safeVolume.toFixed(2)}`);
        musicVolumeRef.current = safeVolume;
        setMusicVolume(safeVolume);
      }
    } catch (error) {
      console.error(`[useAudio] Error setting ${type} volume:`, error);
      FirebaseAnalytics.error('audio_volume_error', `Type: ${type}, Error: ${error instanceof Error ? error.message : 'Unknown'}`, 'setVolume');
    }
  };

  const toggleSound = (enabled: boolean) => {
    console.log(`[useAudio] Toggling sound effects to: ${enabled}`);
    setIsSoundEnabled(enabled);
    FirebaseAnalytics.logEvent('sound_toggled', { enabled, type: 'effects' });
  };

  const toggleMusic = (enabled: boolean) => {
    console.log(`[useAudio] Toggling music to: ${enabled}`);
    setIsMusicEnabled(enabled);
    FirebaseAnalytics.logEvent('sound_toggled', { enabled, type: 'music' });
  };

  return {
    playCorrectSound,
    playIncorrectSound,
    playLevelUpSound,
    playCountdownSound,
    playGameOverSound,
    setSoundVolume: (volume: number) => setVolume(volume, 'sound'),
    setMusicVolume: (volume: number) => setVolume(volume, 'music'),
    toggleSound,
    toggleMusic,
    isSoundEnabled,
    isMusicEnabled,
    soundVolume,
    musicVolume,
  };
};

export default useAudio;
