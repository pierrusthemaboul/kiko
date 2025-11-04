import { useState, useCallback, useRef } from 'react';
import { FirebaseAnalytics } from '../lib/firebase';
import { useAudioContext } from '../contexts/AudioContext';

/**
 * Hook audio pour le mode de jeu CLASSIQUE
 *
 * Utilise WebView Audio - compatible avec Expo SDK 52
 */

export const useAudio = () => {
  const { playSound: playWebSound, setVolume: setWebVolume, isReady } = useAudioContext();

  const [soundVolume, setSoundVolume] = useState(0.24);
  const [musicVolume, setMusicVolume] = useState(0.24);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isMusicEnabled, setIsMusicEnabled] = useState(false);

  const soundVolumeRef = useRef(0.24);
  const musicVolumeRef = useRef(0.24);

  // Fonction générique pour jouer un son
  const playSound = useCallback((soundKey: string) => {
    if (!isSoundEnabled) {
      console.log(`[useAudio] Son désactivé: ${soundKey}`);
      return;
    }

    if (!isReady) {
      console.log(`[useAudio] Audio WebView pas prêt`);
      return;
    }

    playWebSound(soundKey);
    FirebaseAnalytics.trackEvent('sound_played', {
      sound_name: soundKey,
      disabled: false
    });
  }, [isSoundEnabled, isReady, playWebSound]);

  const playCountdownSound = useCallback(() => {
    playSound('countdown');
  }, [playSound]);

  const playCorrectSound = useCallback(() => {
    playSound('correct');
  }, [playSound]);

  const playIncorrectSound = useCallback(() => {
    playSound('incorrect');
  }, [playSound]);

  const playLevelUpSound = useCallback(() => {
    playSound('levelUp');
  }, [playSound]);

  const playGameOverSound = useCallback(() => {
    playSound('gameover');
  }, [playSound]);

  const setVolume = async (volume: number, type: 'sound' | 'music') => {
    try {
      const safeVolume = Math.max(0, Math.min(1.0, volume));
      if (type === 'sound') {
        soundVolumeRef.current = safeVolume;
        setSoundVolume(safeVolume);
        setWebVolume(safeVolume);
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
    setIsSoundEnabled(enabled);
    FirebaseAnalytics.trackEvent('sound_toggled', { enabled, type: 'effects' });
  };

  const toggleMusic = (enabled: boolean) => {
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
