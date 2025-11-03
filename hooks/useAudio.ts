import { useState, useCallback, useEffect, useRef } from 'react';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { FirebaseAnalytics } from '../lib/firebase';

// console.log('---- Loading useAudio.ts ----');

const soundPaths = {
  correct: require('../assets/sounds/corectok.wav'),
  incorrect: require('../assets/sounds/361260__japanyoshithegamer__8-bit-wrong-sound.wav'),
  levelUp: require('../assets/sounds/423455__ohforheavensake__trumpet-brass-fanfare.wav'),
  countdown: require('../assets/sounds/bop.wav'),
  gameover: require('../assets/sounds/242208__wagna__failfare.mp3')
};

type SoundKeys = keyof typeof soundPaths;

export const useAudio = () => {
  // console.log('[useAudio] Hook rendered or re-rendered');
  const players = useRef<Partial<Record<SoundKeys, AudioPlayer>>>({});
  const soundVolumeRef = useRef(0.24);
  const musicVolumeRef = useRef(0.24);
  const [soundVolume, setSoundVolume] = useState(0.24);
  const [musicVolume, setMusicVolume] = useState(0.24);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Pre-create all players to avoid EventEmitter issues during gameplay
    const timer = setTimeout(async () => {
      try {
        // Create all players upfront
        const soundKeys: SoundKeys[] = ['correct', 'incorrect', 'levelUp', 'countdown', 'gameover'];
        for (const key of soundKeys) {
          try {
            const player = createAudioPlayer(soundPaths[key]);
            if (player) {
              players.current[key] = player;
            }
          } catch (err) {
            console.log(`[useAudio] Skipping pre-create for ${key}:`, err);
          }
        }
        setIsInitialized(true);
      } catch (error) {
        console.error('[useAudio] Init error:', error);
        setIsInitialized(true); // Continue anyway
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      setIsInitialized(false);
      // Cleanup all players
      Object.values(players.current).forEach(player => {
        try {
          player?.pause();
          player?.remove();
        } catch {}
      });
      players.current = {};
    };
  }, []);

  const playSound = async (soundKey: SoundKeys, volumeMultiplier: number = 1.0) => {
    if (!isSoundEnabled || !isInitialized) {
      return;
    }

    const finalVolume = Math.max(0, Math.min(soundVolumeRef.current * volumeMultiplier, 1.0));

    try {
      // Use pre-created player if available
      let player = players.current[soundKey];

      if (!player) {
        // Fallback: create new player if not pre-created
        player = createAudioPlayer(soundPaths[soundKey]);
        if (!player) {
          return;
        }
        players.current[soundKey] = player;
      }

      // Rewind and play
      try {
        await player.seekTo(0);
      } catch {}

      player.volume = finalVolume;
      player.play();

      if (['correct', 'incorrect', 'levelUp', 'gameover'].includes(soundKey)) {
        FirebaseAnalytics.trackEvent('sound_played', { sound_name: soundKey });
      }
    } catch (error) {
      // Silently ignore errors - audio is non-critical
      console.log(`[useAudio] Skipped ${soundKey} due to error`);
    }
  };

  const playCountdownSound = useCallback(() => {
    playSound('countdown', 1);
  }, [isSoundEnabled, isInitialized]);

  const playCorrectSound = useCallback(() => {
    playSound('correct', 1.0);
  }, [isSoundEnabled, isInitialized]);

  const playIncorrectSound = useCallback(() => {
    playSound('incorrect', 0.7);
  }, [isSoundEnabled, isInitialized]);

  const playLevelUpSound = useCallback(() => {
    playSound('levelUp', 0.8);
  }, [isSoundEnabled, isInitialized]);

  const playGameOverSound = useCallback(() => {
    playSound('gameover', 0.8);
  }, [isSoundEnabled, isInitialized]);


  const setVolume = async (volume: number, type: 'sound' | 'music') => {
    try {
      const safeVolume = Math.max(0, Math.min(1.0, volume));
      if (type === 'sound') {
        soundVolumeRef.current = safeVolume;
        setSoundVolume(safeVolume);
      } else {
        musicVolumeRef.current = safeVolume;
        setMusicVolume(safeVolume);
      }
    } catch (error) {
      FirebaseAnalytics.trackError('audio_volume_error', {
        message: `Type: ${type}, Error: ${error instanceof Error ? error.message : 'Unknown'}`,
        screen: 'setVolume',
      });
    }
  };

  const toggleSound = (enabled: boolean) => {
    // console.log(`[useAudio] Toggling sound effects to: ${enabled}`);
    setIsSoundEnabled(enabled);
    FirebaseAnalytics.trackEvent('sound_toggled', { enabled, type: 'effects' });
  };

  const toggleMusic = (enabled: boolean) => {
    // console.log(`[useAudio] Toggling music to: ${enabled}`);
    setIsMusicEnabled(enabled);
    FirebaseAnalytics.trackEvent('sound_toggled', { enabled, type: 'music' });
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


export default useAudio;
