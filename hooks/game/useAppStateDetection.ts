/**
 * Hook pour détecter quand l'utilisateur sort de l'application pendant une partie
 * et appliquer automatiquement un malus (considérer l'événement comme échoué)
 */

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { FirebaseAnalytics } from '@/lib/firebase';

interface UseAppStateDetectionProps {
  /**
   * Callback appelé quand l'utilisateur sort de l'application pendant une partie active
   */
  onAppBackgrounded: () => void;

  /**
   * Si true, la détection est active (partie en cours, pas en pause, pas de game over)
   */
  isActive: boolean;

  /**
   * Identifiant unique de l'événement actuel (pour le logging)
   */
  currentEventId?: string;
}

/**
 * Hook qui surveille l'état de l'application et déclenche un callback
 * quand l'utilisateur quitte l'app pendant une partie active
 */
export function useAppStateDetection({
  onAppBackgrounded,
  isActive,
  currentEventId,
}: UseAppStateDetectionProps) {
  const appState = useRef(AppState.currentState);
  const wasActiveRef = useRef(false);

  useEffect(() => {
    // Mettre à jour la ref quand isActive change
    wasActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const previousState = appState.current;

      // Détecter le passage de 'active' vers 'background' ou 'inactive'
      if (
        previousState === 'active' &&
        (nextAppState === 'background' || nextAppState === 'inactive') &&
        wasActiveRef.current // Vérifier qu'on était en partie active
      ) {
        // L'utilisateur a quitté l'application pendant une partie active
        console.log('[AppStateDetection] User left app during active game');

        // Logger l'événement
        FirebaseAnalytics.logEvent('app_backgrounded_during_game', {
          event_id: currentEventId || 'unknown',
          previous_state: previousState,
          next_state: nextAppState,
        });

        // Déclencher le callback de malus
        onAppBackgrounded();
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [onAppBackgrounded, currentEventId]);

  return {
    currentAppState: appState.current,
  };
}
