import { useState, useCallback, useEffect, useRef } from 'react';
import Audio, { AudioPlayer } from 'expo-audio';
import { FirebaseAnalytics } from '../lib/firebase';

console.log('---- Loading useAudio.ts ----');

const soundPaths = {
  correct: require('../assets/sounds/corectok.wav'),
  incorrect: require('../assets/sounds/361260__japanyoshithegamer__8-bit-wrong-sound.wav'),
  levelUp: require('../assets/sounds/423455__ohforheavensake__trumpet-brass-fanfare.wav'),
  countdown: require('../assets/sounds/bop.wav'),
  gameover: require('../assets/sounds/242208__wagna__failfare.mp3')
};

type SoundKeys = keyof typeof soundPaths;

export const useAudio = () => {
  console.log('[useAudio] Hook rendered or re-rendered');
  const players = useRef<Partial<Record<SoundKeys, AudioPlayer>>>({});
  const soundVolumeRef = useRef(0.24);
  const musicVolumeRef = useRef(0.24);
  const [soundVolume, setSoundVolume] = useState(0.24);
  const [musicVolume, setMusicVolume] = useState(0.24);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    console.log('[useAudio] useEffect for initialization is running.');
    const initAudio = async () => {
      console.log('[useAudio] initAudio: Starting initialization...');
      console.log('[useAudio] Checking imported Audio object:', Audio);
      try {
        if (!Audio || !Audio.createAudioPlayer) {
          throw new Error('Audio object or createAudioPlayer method is not available.');
        }
        const soundKeys = Object.keys(soundPaths) as SoundKeys[];
        console.log(`[useAudio] initAudio: Found ${soundKeys.length} sounds to load.`);
        for (const key of soundKeys) {
          console.log(`[useAudio] initAudio: Loading sound '${key}'...`);
          const player = Audio.createAudioPlayer(soundPaths[key]);
          if (player && typeof player.prepare === 'function') {
            await player.prepare();
          }
          players.current[key] = player;
          console.log(`[useAudio] initAudio: Sound '${key}' loaded successfully.`);
        }
        setIsInitialized(true);
        console.log('[useAudio] initAudio: Initialization complete.');
      } catch (error) {
        console.error('[useAudio] initAudio: CRITICAL ERROR during initialization:', error);
        FirebaseAnalytics.trackError('audio_init_error', {
          message: error instanceof Error ? error.message : 'Unknown',
          stack: error instanceof Error ? error.stack : 'N/A',
          screen: 'useAudioInit',
        });
      }
    };
    initAudio();

    return () => {
      console.log('[useAudio] Cleanup: Releasing audio players.');
      setIsInitialized(false);
      (Object.values(players.current) as AudioPlayer[]).forEach((player) => {
        if (player && typeof player.release === 'function') {
          try {
            player.release();
          } catch (e) {
            console.warn('[useAudio] Cleanup: Error releasing a player:', e);
          }
        }
      });
      players.current = {};
      console.log('[useAudio] Cleanup: Done.');
    };
  }, []);

  const playSound = async (soundKey: SoundKeys, volumeMultiplier: number = 1.0) => {
    console.log(`[useAudio] playSound: Attempting to play '${soundKey}'`);
    if (!isSoundEnabled) {
      console.log(`[useAudio] playSound: Sound is disabled. Aborting.`);
      return;
    }
    if (!isInitialized) {
      console.log(`[useAudio] playSound: Audio not initialized yet. Aborting.`);
      return;
    }

    const player = players.current[soundKey];
    if (!player) {
      console.error(`[useAudio] playSound: Player for '${soundKey}' not found!`);
      return;
    }

    const finalVolume = Math.max(0, Math.min(soundVolumeRef.current * volumeMultiplier, 1.0));
    console.log(`[useAudio] playSound: Playing '${soundKey}' with volume ${finalVolume}`);

    try {
      player.volume = finalVolume;
      await player.seekTo(0);
      await player.play();
      console.log(`[useAudio] playSound: '${soundKey}' played successfully.`);

      if (['correct', 'incorrect', 'levelUp', 'gameover'].includes(soundKey)) {
        FirebaseAnalytics.trackEvent('sound_played', { sound_name: soundKey });
      }

    } catch (error) {
      console.error(`[useAudio] playSound: CRITICAL ERROR during playback of '${soundKey}':`, error);
      FirebaseAnalytics.trackError('audio_playback_error', {
        message: `Sound: ${soundKey}, Error: ${error instanceof Error ? error.message : 'Unknown'}`,
        stack: error instanceof Error ? error.stack : 'N/A',
        screen: 'playSound',
      });
    }
  };

  const playCountdownSound = useCallback(() => {
    // playSound('countdown', 1);
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
    console.log(`[useAudio] Toggling sound effects to: ${enabled}`);
    setIsSoundEnabled(enabled);
    FirebaseAnalytics.trackEvent('sound_toggled', { enabled, type: 'effects' });
  };

  const toggleMusic = (enabled: boolean) => {
    console.log(`[useAudio] Toggling music to: ${enabled}`);
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
