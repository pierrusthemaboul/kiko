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
  isImageLoaded: initialImageLoaded = false
}: {
  user: { level: number; points: number; lives: number; };
  isLevelPaused: boolean;
  isGameOver: boolean;
  handleTimeout: () => void;
  isImageLoaded?: boolean;
}) {
  // console.log('[useTimer] Initialisation du hook'); // Supprimé

  const [timeLeft, setTimeLeft] = useState(20);
  const [isCountdownActive, setIsCountdownActive] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(initialImageLoaded);
  const { playCountdownSound } = useAudio();

  // Référence pour suivre si l'application vient d'une publicité
  const comingFromAdRef = useRef(false);
  // Référence pour suivre l'état de l'application
  const appStateRef = useRef(AppState.currentState);
  // Référence pour le dernier temps enregistré avant mise en arrière-plan
  const lastTimeRef = useRef(20);

  // Gestion du compte à rebours
  useEffect(() => {
    // console.log('[useTimer] Effet de compte à rebours, actif:', isCountdownActive, 'pause:', isLevelPaused, 'gameover:', isGameOver); // Supprimé

    let timer: NodeJS.Timeout | undefined;

    if (isCountdownActive && timeLeft > 0 && !isLevelPaused && !isGameOver) {
      // console.log('[useTimer] Démarrage du compte à rebours à partir de', timeLeft, 'secondes'); // Supprimé

      timer = setInterval(() => {
        setTimeLeft((prevTime) => {
          const nextTime = prevTime - 1;

          if (nextTime <= 0) {
            clearInterval(timer);
            // console.log('[useTimer] Fin du temps, déclenchement du timeout'); // Supprimé
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
      // console.log('[useTimer] Arrêt du compte à rebours'); // Supprimé
      clearInterval(timer);
    }

    // Nettoyage si le timer est actif mais les conditions ne sont plus remplies
    return () => {
      if (timer) {
        // console.log('[useTimer] Nettoyage du timer'); // Supprimé
        clearInterval(timer);
      }
    };
  }, [isCountdownActive, isLevelPaused, isGameOver, timeLeft, playCountdownSound, handleTimeout]);

  // Surveillance de l'état de l'application (premier plan / arrière-plan)
  useEffect(() => {
    // console.log('[useTimer] Configuration de la surveillance AppState'); // Supprimé

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      // console.log('[useTimer] Changement AppState:', previousAppState, '->', nextAppState); // Supprimé

      if (nextAppState.match(/inactive|background/)) {
        if (nextAppState === 'background') {
          // Sauvegarde du temps actuel pour appliquer le malus au retour
          lastTimeRef.current = timeLeft;
          // console.log('[useTimer] Application mise en arrière-plan, temps sauvegardé:', lastTimeRef.current); // Supprimé

          // Marquer que l'application est potentiellement en train d'afficher une publicité
          comingFromAdRef.current = true;

          if (!isLevelPaused && !isGameOver) {
            // CORRECTION: On ne modifie pas directement le temps ici, on le fera au retour
            // pour appliquer le malus de manière visible

            // L'appel à FirebaseAnalytics.appState a été supprimé ici
            // FirebaseAnalytics.appState('background', timeLeft, user.level, user.points);
          }
        }
      } else if (nextAppState === 'active') {
        // console.log('[useTimer] Application revenue au premier plan'); // Supprimé

        // Si l'app revient au premier plan après une mise en arrière-plan,
        // et que le jeu est actif, appliquer le malus
        if (comingFromAdRef.current && !isLevelPaused && !isGameOver) {
          const savedTime = lastTimeRef.current;

          // CORRECTION: Application du malus au retour, avec un temps minimal de 1 seconde
          // pour donner une chance au joueur de voir le changement
          setTimeLeft(prevTime => {
            // Appliquer un malus de 18 secondes (ou jusqu'à 1 seconde restante)
            const newTime = Math.max(1, savedTime - 18);
            // console.log('[useTimer] Application du malus:', savedTime, '->', newTime); // Supprimé
            return newTime;
          });
        }

        // Réinitialiser le flag
        comingFromAdRef.current = false;

        // L'appel à FirebaseAnalytics.appState a été supprimé ici
        // FirebaseAnalytics.appState('active', undefined, user.level, user.points);
      }
    });

    return () => {
      // console.log('[useTimer] Nettoyage des listeners AppState'); // Supprimé
      subscription.remove();
    };
  }, [timeLeft, user.level, user.points, isLevelPaused, isGameOver]); // user.level et user.points peuvent être retirés des dépendances si plus utilisés ici

  // Fonction pour initialiser ou réinitialiser le timer
  const resetTimer = useCallback((time: number = 20) => {
    // console.log('[useTimer] Réinitialisation du timer à', time, 'secondes'); // Supprimé
    setTimeLeft(time);
    setIsCountdownActive(false);
    // Réinitialiser aussi le flag comingFromAd
    comingFromAdRef.current = false;
  }, []);

  // Fonction pour démarrer le timer quand l'image est chargée
  const handleImageLoad = useCallback(() => {
    // console.log('[useTimer] Image chargée'); // Supprimé
    setIsImageLoaded(true);

    if (!isLevelPaused && !isGameOver) {
      // console.log('[useTimer] Activation du compte à rebours après chargement image'); // Supprimé
      setIsCountdownActive(true);
    } else {
      // console.log('[useTimer] Compte à rebours non activé (jeu en pause ou terminé)'); // Supprimé
    }
  }, [isLevelPaused, isGameOver]);

  // Fonction pour mettre en pause ou reprendre le timer
  const toggleTimer = useCallback((active: boolean) => {
    // console.log('[useTimer] Toggle timer:', active); // Supprimé
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
    toggleTimer // Nouvelle fonction pour contrôler le timer
  };
}