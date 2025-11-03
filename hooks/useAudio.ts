import { useState, useCallback, useRef } from 'react';
import { AudioPlayer, useAudioPlayer } from 'expo-audio';
import { FirebaseAnalytics } from '../lib/firebase';

/**
 * Hook audio pour le mode de jeu CLASSIQUE
 *
 * ⚠️ IMPORTANT - AVANT DE MODIFIER CE FICHIER :
 * Lisez /docs/AUDIO_MIGRATION_GUIDE.md pour comprendre pourquoi nous utilisons
 * useAudioPlayer au lieu de createAudioPlayer.
 *
 * Résumé : createAudioPlayer() est buggé dans expo-audio 0.3.5 (SDK 52)
 * et provoque "Error: Value is undefined, expected an Object".
 *
 * ✅ Utilisez useAudioPlayer() pour créer les players
 * ❌ N'utilisez PAS createAudioPlayer() avec expo-audio 0.3.5
 */

const soundPaths = {
  correct: require('../assets/sounds/corectok.wav'),
  incorrect: require('../assets/sounds/361260__japanyoshithegamer__8-bit-wrong-sound.wav'),
  levelUp: require('../assets/sounds/423455__ohforheavensake__trumpet-brass-fanfare.wav'),
  countdown: require('../assets/sounds/bop.wav'),
  gameover: require('../assets/sounds/242208__wagna__failfare.mp3')
};

type SoundKeys = keyof typeof soundPaths;

export const useAudio = () => {
  // Créer un player pour chaque son avec useAudioPlayer hook
  const correctPlayer = useAudioPlayer(soundPaths.correct);
  const incorrectPlayer = useAudioPlayer(soundPaths.incorrect);
  const levelUpPlayer = useAudioPlayer(soundPaths.levelUp);
  const countdownPlayer = useAudioPlayer(soundPaths.countdown);
  const gameoverPlayer = useAudioPlayer(soundPaths.gameover);

  // Map des players pour accès facile
  const playersRef = useRef<Record<SoundKeys, AudioPlayer>>({
    correct: correctPlayer,
    incorrect: incorrectPlayer,
    levelUp: levelUpPlayer,
    countdown: countdownPlayer,
    gameover: gameoverPlayer,
  });

  const soundVolumeRef = useRef(0.24);
  const musicVolumeRef = useRef(0.24);
  const [soundVolume, setSoundVolume] = useState(0.24);
  const [musicVolume, setMusicVolume] = useState(0.24);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);

  const playSound = async (soundKey: SoundKeys, volumeMultiplier: number = 1.0) => {
    if (!isSoundEnabled) {
      return;
    }

    const finalVolume = Math.max(0, Math.min(soundVolumeRef.current * volumeMultiplier, 1.0));

    try {
      // Get the pre-created player
      const player = playersRef.current[soundKey];
      if (!player) {
        console.error(`[useAudio] Player not found for ${soundKey}`);
        return;
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
  }, [isSoundEnabled]);

  const playCorrectSound = useCallback(() => {
    playSound('correct', 1.0);
  }, [isSoundEnabled]);

  const playIncorrectSound = useCallback(() => {
    playSound('incorrect', 0.7);
  }, [isSoundEnabled]);

  const playLevelUpSound = useCallback(() => {
    playSound('levelUp', 0.8);
  }, [isSoundEnabled]);

  const playGameOverSound = useCallback(() => {
    playSound('gameover', 0.8);
  }, [isSoundEnabled]);


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
