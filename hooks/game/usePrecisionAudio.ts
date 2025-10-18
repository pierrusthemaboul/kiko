import { useCallback, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { FirebaseAnalytics } from '../../lib/firebase';

interface PrecisionAudioConfig {
  soundVolume: number;
  isSoundEnabled: boolean;
}

/**
 * Hook spécialisé pour gérer l'ambiance sonore du mode Précision
 * Gère les sons d'interface (touches, soumission) et d'événements de jeu
 */
export const usePrecisionAudio = ({ soundVolume, isSoundEnabled }: PrecisionAudioConfig) => {
  const isInitialized = useRef(false);
  const soundCache = useRef<{ [key: string]: Audio.Sound }>({});
  const currentlyPlayingRef = useRef<Audio.Sound | null>(null);
  const lastPlayedResultRef = useRef<{ time: number; difference: number } | null>(null);

  // Chemins vers les fichiers audio
  const soundPaths = {
    // Sons d'interface
    keyPress: require('../../assets/sounds/bop.wav'), // Son doux pour les touches
    submit: require('../../assets/sounds/361261__japanyoshithegamer__8-bit-spaceship-startup.wav'), // Son de soumission

    // Sons de résultat
    perfectAnswer: require('../../assets/sounds/corectok.wav'), // Réponse parfaite (0 écart)
    goodAnswer: require('../../assets/sounds/corectok.wav'), // Bonne réponse (écart faible)
    wrongAnswer: require('../../assets/sounds/361260__japanyoshithegamer__8-bit-wrong-sound.wav'), // Mauvaise réponse

    // Sons de chronomètre
    timerTick: require('../../assets/sounds/count.wav'), // Tick du chronomètre
    timerWarning: require('../../assets/sounds/countdown.wav'), // Avertissement temps faible
    timerExpired: require('../../assets/sounds/242208__wagna__failfare.mp3'), // Temps écoulé

    // Sons d'événements
    levelUp: require('../../assets/sounds/423455__ohforheavensake__trumpet-brass-fanfare.wav'),
    gameOver: require('../../assets/sounds/242208__wagna__failfare.mp3'),
  };

  useEffect(() => {
    const initAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        isInitialized.current = true;
      } catch (error) {
        FirebaseAnalytics.trackError('precision_audio_init_error', {
          message: error instanceof Error ? error.message : 'Unknown',
          screen: 'usePrecisionAudioInit',
        });
      }
    };
    initAudio();

    return () => {
      isInitialized.current = false;
      Object.values(soundCache.current).forEach(async (sound) => {
        try {
          await sound.unloadAsync();
        } catch (_) {}
      });
      soundCache.current = {};
    };
  }, []);

  /**
   * Joue un son avec gestion du cache et du volume
   * Arrête le son précédent pour éviter les chevauchements
   */
  const playSound = useCallback(
    async (soundKey: keyof typeof soundPaths, volumeMultiplier: number = 1.0) => {
      console.log('[usePrecisionAudio] playSound called:', soundKey, 'enabled:', isSoundEnabled, 'initialized:', isInitialized.current);

      if (!isSoundEnabled || !isInitialized.current) {
        console.log('[usePrecisionAudio] Sound disabled or not initialized, skipping');
        return;
      }

      const finalVolume = Math.max(0, Math.min(soundVolume * volumeMultiplier, 1.0));
      console.log('[usePrecisionAudio] Playing', soundKey, 'at volume:', finalVolume);

      try {
        // Arrêter le son précédent s'il est encore en cours (sauf pour les touches)
        if (currentlyPlayingRef.current && soundKey !== 'keyPress') {
          console.log('[usePrecisionAudio] Stopping previous sound to avoid overlap');
          try {
            await currentlyPlayingRef.current.stopAsync();
            await currentlyPlayingRef.current.unloadAsync();
          } catch (e) {
            // Ignorer les erreurs si le son était déjà arrêté
          }
          currentlyPlayingRef.current = null;
        }

        // Créer et jouer le son
        const { sound } = await Audio.Sound.createAsync(
          soundPaths[soundKey],
          {
            volume: finalVolume,
            shouldPlay: true,
          },
          (status) => {
            if (status.isLoaded && status.didJustFinish) {
              if (currentlyPlayingRef.current === sound) {
                currentlyPlayingRef.current = null;
              }
              sound.unloadAsync().catch(() => {});
            }
          }
        );

        // Mémoriser le son en cours (sauf pour les touches)
        if (soundKey !== 'keyPress') {
          currentlyPlayingRef.current = sound;
        }

        console.log('[usePrecisionAudio] Sound', soundKey, 'playing successfully');

        // Log pour les événements importants
        if (['perfectAnswer', 'wrongAnswer', 'levelUp', 'gameOver'].includes(soundKey)) {
          FirebaseAnalytics.trackEvent('precision_sound_played', { sound_name: soundKey });
        }
      } catch (error) {
        console.error('[usePrecisionAudio] Error playing sound:', soundKey, error);
        FirebaseAnalytics.trackError('precision_audio_playback_error', {
          message: `Sound: ${soundKey}, Error: ${error instanceof Error ? error.message : 'Unknown'}`,
          screen: 'playPrecisionSound',
        });
      }
    },
    [isSoundEnabled, soundVolume]
  );

  // --- Sons d'interface ---

  /**
   * Son joué lors de la pression d'une touche du pavé numérique
   */
  const playKeyPress = useCallback(() => {
    playSound('keyPress', 0.3); // Volume réduit pour ne pas être envahissant
  }, [playSound]);

  /**
   * Son joué lors de la soumission d'une réponse
   */
  const playSubmit = useCallback(() => {
    playSound('submit', 0.6);
  }, [playSound]);

  // --- Sons de résultat ---

  /**
   * Son pour une réponse parfaite (écart = 0)
   */
  const playPerfectAnswer = useCallback(() => {
    playSound('perfectAnswer', 1.0);
  }, [playSound]);

  /**
   * Son pour une bonne réponse (écart faible)
   */
  const playGoodAnswer = useCallback(() => {
    playSound('goodAnswer', 0.8);
  }, [playSound]);

  /**
   * Son pour une mauvaise réponse
   */
  const playWrongAnswer = useCallback(() => {
    playSound('wrongAnswer', 0.7);
  }, [playSound]);

  /**
   * Joue le son approprié selon l'écart de la réponse
   * Logique :
   * - 0 écart = Son parfait (100% volume)
   * - 1-10 ans = Son de succès (80% volume) - Très bonne réponse
   * - 11-30 ans = Son de succès (60% volume) - Bonne réponse
   * - 31-100 ans = Son d'échec (50% volume) - Assez loin
   * - >100 ans = Son d'échec (70% volume) - Très loin
   * - Temps écoulé = Son spécial timerExpired
   */
  const playAnswerResult = useCallback(
    (absDifference: number, timedOut: boolean = false) => {
      const now = Date.now();

      // Protection contre les appels multiples avec le même résultat (dans les 500ms)
      if (lastPlayedResultRef.current) {
        const timeSinceLastPlay = now - lastPlayedResultRef.current.time;
        const sameDifference = lastPlayedResultRef.current.difference === absDifference;

        if (sameDifference && timeSinceLastPlay < 500) {
          console.log('[usePrecisionAudio] playAnswerResult - DUPLICATE CALL BLOCKED (same result within 500ms)');
          return;
        }
      }

      // Mémoriser ce résultat
      lastPlayedResultRef.current = { time: now, difference: absDifference };

      console.log('[usePrecisionAudio] playAnswerResult - diff:', absDifference, 'timedOut:', timedOut);

      if (timedOut) {
        console.log('[usePrecisionAudio] → Playing timerExpired');
        playSound('timerExpired', 0.8);
      } else if (absDifference === 0) {
        console.log('[usePrecisionAudio] → Playing perfectAnswer (0 écart)');
        playPerfectAnswer();
      } else if (absDifference <= 10) {
        console.log('[usePrecisionAudio] → Playing goodAnswer (1-10 ans)');
        playSound('goodAnswer', 0.8);
      } else if (absDifference <= 30) {
        console.log('[usePrecisionAudio] → Playing goodAnswer (11-30 ans, volume réduit)');
        playSound('goodAnswer', 0.6);
      } else if (absDifference <= 100) {
        console.log('[usePrecisionAudio] → Playing wrongAnswer (31-100 ans, assez loin)');
        playSound('wrongAnswer', 0.5);
      } else {
        console.log('[usePrecisionAudio] → Playing wrongAnswer (>100 ans, très loin)');
        playSound('wrongAnswer', 0.7);
      }
    },
    [playSound, playPerfectAnswer]
  );

  // --- Sons de chronomètre ---

  /**
   * Son de tick du chronomètre (optionnel, peut être désactivé)
   */
  const playTimerTick = useCallback(() => {
    playSound('timerTick', 0.2);
  }, [playSound]);

  /**
   * Son d'avertissement quand le temps est presque écoulé
   */
  const playTimerWarning = useCallback(() => {
    playSound('timerWarning', 0.5);
  }, [playSound]);

  /**
   * Son quand le temps est écoulé
   */
  const playTimerExpired = useCallback(() => {
    playSound('timerExpired', 0.8);
  }, [playSound]);

  // --- Sons d'événements ---

  /**
   * Son de passage de niveau
   */
  const playLevelUp = useCallback(() => {
    playSound('levelUp', 0.8);
  }, [playSound]);

  /**
   * Son de game over
   */
  const playGameOver = useCallback(() => {
    playSound('gameOver', 0.8);
  }, [playSound]);

  return {
    // Interface
    playKeyPress,
    playSubmit,

    // Résultats
    playPerfectAnswer,
    playGoodAnswer,
    playWrongAnswer,
    playAnswerResult,

    // Chronomètre
    playTimerTick,
    playTimerWarning,
    playTimerExpired,

    // Événements
    playLevelUp,
    playGameOver,
  };
};
