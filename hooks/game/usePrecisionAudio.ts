import { useCallback, useMemo } from 'react';
import { FirebaseAnalytics } from '../../lib/firebase';
import { useAudioContext } from '../../contexts/AudioContext';

/**
 * Hook audio pour le mode de jeu PRECISION
 *
 * Utilise WebView Audio - compatible avec Expo SDK 52
 *
 * Stratégie audio :
 * - Son neutre pour toutes les validations
 * - Son spécial uniquement pour date exacte (absDifference === 0)
 * - Pas de son pour les autres cas → feedback visuel uniquement
 */

interface PrecisionAudioConfig {
  soundVolume: number;
  isSoundEnabled: boolean;
}

export const usePrecisionAudio = ({ soundVolume, isSoundEnabled }: PrecisionAudioConfig) => {
  const { playSound: playWebSound, setVolume: setWebVolume, isReady } = useAudioContext();

  // Fonction pour arrêter tous les sons (non implémenté pour WebView, mais garde l'API)
  const stopAll = useCallback(async () => {
    console.log('[PrecisionAudio] stopAll (not implemented for WebView)');
  }, []);

  // Fonction générique pour jouer un son
  const playSound = useCallback((soundKey: string) => {
    if (!isSoundEnabled) {
      console.log(`[PrecisionAudio] Son désactivé: ${soundKey}`);
      return;
    }

    if (!isReady) {
      console.log(`[PrecisionAudio] Audio WebView pas prêt`);
      return;
    }

    playWebSound(soundKey);
    setWebVolume(soundVolume);
  }, [isSoundEnabled, isReady, playWebSound, soundVolume, setWebVolume]);

  const playKeyPress = useCallback(() => {
    playSound('keyPress');
  }, [playSound]);

  const playSubmit = useCallback(() => {
    playSound('submit');
  }, [playSound]);

  const playAnswerResult = useCallback((absDifference: number) => {
    if (absDifference === 0) {
      playSound('perfectAnswer');
      FirebaseAnalytics.trackEvent('precision_sound_played', {
        sound_name: 'perfectAnswer',
        disabled: false
      });
    }
    // Pas de son pour les autres cas (feedback visuel uniquement)
  }, [playSound]);

  const playTimerWarning = useCallback(() => {
    playSound('timerWarning');
  }, [playSound]);

  const playTimerExpired = useCallback(() => {
    playSound('timerExpired');
    FirebaseAnalytics.trackEvent('precision_sound_played', {
      sound_name: 'timerExpired',
      disabled: false
    });
  }, [playSound]);

  const playFocusGain = useCallback(() => {
    playSound('focusGain');
  }, [playSound]);

  const playFocusLoss = useCallback(() => {
    playSound('focusLoss');
  }, [playSound]);

  const playFocusLevelUp = useCallback(() => {
    playSound('focusLevelUp');
  }, [playSound]);

  const playLevelUp = useCallback(() => {
    playSound('levelUp');
    FirebaseAnalytics.trackEvent('precision_sound_played', {
      sound_name: 'levelUp',
      disabled: false
    });
  }, [playSound]);

  const playGameOver = useCallback(() => {
    playSound('gameOver');
    FirebaseAnalytics.trackEvent('precision_sound_played', {
      sound_name: 'gameOver',
      disabled: false
    });
  }, [playSound]);

  return useMemo(() => ({
    playKeyPress,
    playSubmit,
    playAnswerResult,
    playTimerWarning,
    playTimerExpired,
    playFocusGain,
    playFocusLoss,
    playFocusLevelUp,
    playLevelUp,
    playGameOver,
    stopAll,
  }), [
    playKeyPress,
    playSubmit,
    playAnswerResult,
    playTimerWarning,
    playTimerExpired,
    playFocusGain,
    playFocusLoss,
    playFocusLevelUp,
    playLevelUp,
    playGameOver,
    stopAll,
  ]);
};
