import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
// FirebaseAnalytics import est conservé
import { FirebaseAnalytics } from '../../lib/firebase';
import useAudio from '../useAudio';

/**
 * Hook pour gérer le compte à rebours et les événements liés au timing
 */
export function useTimer({
  user,
  isLevelPaused,
  isGameOver,
  handleTimeout,
  isImageLoaded: initialImageLoaded = false,
  isFromRewardedAd = false,
  initialTime = 20,
}: {
  user: { level: number; points: number; lives: number; };
  isLevelPaused: boolean;
  isGameOver: boolean;
  handleTimeout: () => void;
  isImageLoaded?: boolean;
  isFromRewardedAd?: boolean;
  initialTime?: number;
}) {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isCountdownActive, setIsCountdownActive] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(initialImageLoaded);
  const { playCountdownSound } = useAudio();

  // Référence pour suivre si l'application vient d'une publicité
  const comingFromAdRef = useRef(false);
  // Référence pour suivre si l'application vient spécifiquement d'une pub récompensée
  const fromRewardedAdRef = useRef(isFromRewardedAd);
  // Référence pour suivre l'état de l'application
  const appStateRef = useRef(AppState.currentState);
  // Références pour conserver les paramètres initiaux du timer
  const defaultTimeRef = useRef(initialTime);
  // Référence pour le dernier temps enregistré avant mise en arrière-plan
  const lastTimeRef = useRef(initialTime);

  // Mettre à jour la référence si la prop change
  useEffect(() => {
    fromRewardedAdRef.current = isFromRewardedAd;
  }, [isFromRewardedAd]);

  useEffect(() => {
    defaultTimeRef.current = initialTime;
    setTimeLeft(initialTime);
    lastTimeRef.current = initialTime;
  }, [initialTime]);

  // Gestion du compte à rebours
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;

    if (isCountdownActive && timeLeft > 0 && !isLevelPaused && !isGameOver) {
      timer = setInterval(() => {
        setTimeLeft((prevTime) => {
          const nextTime = prevTime - 1;

          if (nextTime <= 0) {
            clearInterval(timer);
            handleTimeout();
            return 0;
          }

          if (nextTime <= 5) {
            playCountdownSound();
          }

          return nextTime;
        });
      }, 1000);
    } else if (!isCountdownActive && timer) {
      clearInterval(timer);
    }

    // Nettoyage si le timer est actif mais les conditions ne sont plus remplies
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isCountdownActive, isLevelPaused, isGameOver, timeLeft, playCountdownSound, handleTimeout]);

  // Surveillance de l'état de l'application (premier plan / arrière-plan)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (nextAppState.match(/inactive|background/)) {
        if (nextAppState === 'background') {
          // Sauvegarde du temps actuel pour appliquer le malus au retour
          lastTimeRef.current = timeLeft;

          // Marquer que l'application est potentiellement en train d'afficher une publicité
          comingFromAdRef.current = true;
        }
      } else if (nextAppState === 'active') {
        // Si l'app revient au premier plan après une mise en arrière-plan,
        // et que le jeu est actif, appliquer le malus SAUF si on revient d'une pub récompensée
        if (comingFromAdRef.current && !isLevelPaused && !isGameOver) {
          if (!fromRewardedAdRef.current) {
            // Application du malus normal si ce n'est pas une pub récompensée
            const savedTime = lastTimeRef.current;
            const penalty = Math.max(1, Math.ceil(defaultTimeRef.current * 0.9));
            const newTime = Math.max(1, savedTime - penalty);
            setTimeLeft(newTime);
            console.log('[useTimer] Applying background penalty:', savedTime, '->', newTime);
          } else {
            // Si on revient d'une pub récompensée, pas de malus
            console.log('[useTimer] Skipping penalty - returning from rewarded ad');
            // Réinitialisation du flag après usage
            fromRewardedAdRef.current = false;
          }
        }

        // Réinitialiser le flag de retour
        comingFromAdRef.current = false;
      }
    });

    return () => {
      subscription.remove();
    };
  }, [timeLeft, isLevelPaused, isGameOver]);

  // Fonction pour initialiser ou réinitialiser le timer
  const resetTimer = useCallback((time: number = defaultTimeRef.current, skipNextMalus: boolean = false) => {
    setTimeLeft(time);
    setIsCountdownActive(false);
    
    // Si skipNextMalus est true, désactiver le prochain malus
    if (skipNextMalus) {
      fromRewardedAdRef.current = true;
    }
    
    // Réinitialiser aussi le flag comingFromAd
    comingFromAdRef.current = false;
    lastTimeRef.current = time;
  }, []);

  // Fonction pour démarrer le timer quand l'image est chargée
  const handleImageLoad = useCallback(() => {
    setIsImageLoaded(true);

    if (!isLevelPaused && !isGameOver) {
      setIsCountdownActive(true);
    }
  }, [isLevelPaused, isGameOver]);

  // Fonction pour mettre en pause ou reprendre le timer
  const toggleTimer = useCallback((active: boolean) => {
    setIsCountdownActive(active);
  }, []);

  return {
    timeLeft,
    isCountdownActive,
    setTimeLeft,
    setIsCountdownActive,
    resetTimer,
    handleImageLoad,
    isImageLoaded,
    setIsImageLoaded,
    toggleTimer // Fonction pour contrôler le timer
  };
}
