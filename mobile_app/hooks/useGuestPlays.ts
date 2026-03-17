import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GUEST_PLAYS_KEY = '@timalaus_guest_plays';
const GUEST_PLAYS_LIMIT = 3;

interface GuestPlaysData {
  date: string; // Format YYYY-MM-DD
  playsUsed: number;
}

/**
 * Hook pour gérer les parties en mode invité
 * Limite : 3 parties par jour stockées en local
 * Reset automatique à minuit
 */
export function useGuestPlays() {
  const [guestPlaysUsed, setGuestPlaysUsed] = useState<number>(0);
  const [canStartGuestPlay, setCanStartGuestPlay] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Obtenir la date du jour au format YYYY-MM-DD
  const getTodayString = (): string => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  // Charger les données de parties invité depuis AsyncStorage
  const loadGuestPlays = async (): Promise<void> => {
    try {
      const stored = await AsyncStorage.getItem(GUEST_PLAYS_KEY);
      const today = getTodayString();

      if (!stored) {
        // Première utilisation
        setGuestPlaysUsed(0);
        setCanStartGuestPlay(true);
        setIsLoading(false);
        return;
      }

      const data: GuestPlaysData = JSON.parse(stored);

      if (data.date !== today) {
        // Nouveau jour : reset du compteur
        setGuestPlaysUsed(0);
        setCanStartGuestPlay(true);
        // Sauvegarder le reset
        await AsyncStorage.setItem(
          GUEST_PLAYS_KEY,
          JSON.stringify({ date: today, playsUsed: 0 })
        );
      } else {
        // Même jour : utiliser les données existantes
        setGuestPlaysUsed(data.playsUsed);
        setCanStartGuestPlay(data.playsUsed < GUEST_PLAYS_LIMIT);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('[useGuestPlays] Error loading guest plays:', error);
      // En cas d'erreur, on autorise par défaut
      setGuestPlaysUsed(0);
      setCanStartGuestPlay(true);
      setIsLoading(false);
    }
  };

  // Incrémenter le compteur de parties
  const incrementGuestPlays = async (): Promise<boolean> => {
    try {
      const today = getTodayString();
      const newCount = guestPlaysUsed + 1;

      if (newCount > GUEST_PLAYS_LIMIT) {
        console.warn('[useGuestPlays] Limit reached, cannot increment');
        return false;
      }

      // Sauvegarder la nouvelle valeur
      const data: GuestPlaysData = {
        date: today,
        playsUsed: newCount,
      };

      await AsyncStorage.setItem(GUEST_PLAYS_KEY, JSON.stringify(data));

      // Mettre à jour l'état
      setGuestPlaysUsed(newCount);
      setCanStartGuestPlay(newCount < GUEST_PLAYS_LIMIT);

      return true;
    } catch (error) {
      console.error('[useGuestPlays] Error incrementing guest plays:', error);
      return false;
    }
  };

  // Réinitialiser manuellement (pour debug)
  const resetGuestPlays = async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(GUEST_PLAYS_KEY);
      setGuestPlaysUsed(0);
      setCanStartGuestPlay(true);
    } catch (error) {
      console.error('[useGuestPlays] Error resetting guest plays:', error);
    }
  };

  // Charger au montage du hook
  useEffect(() => {
    loadGuestPlays();
  }, []);

  return {
    guestPlaysUsed,
    guestPlaysRemaining: GUEST_PLAYS_LIMIT - guestPlaysUsed,
    guestPlaysLimit: GUEST_PLAYS_LIMIT,
    canStartGuestPlay,
    isLoading,
    incrementGuestPlays,
    resetGuestPlays,
    refreshGuestPlays: loadGuestPlays,
    grantExtraPlay: async () => {
      try {
        const stored = await AsyncStorage.getItem(GUEST_PLAYS_KEY);
        const today = getTodayString();
        const data: GuestPlaysData = stored
          ? JSON.parse(stored)
          : { date: today, playsUsed: 0 };

        // On réduit le nombre de parties utilisées pour donner une partie supplémentaire
        // (Ou on augmente un quota virtuel, mais ici on va juste décrémenter playsUsed s'il est > 0, 
        // sinon on autorise une partie "bonus" en permettant playsUsed d'être négatif ou en changeant la limite)

        // Stratégie simple : décrémenter playsUsed (permet de rejouer une partie consommée)
        const newCount = Math.max(-10, data.playsUsed - 1);

        const newData = { date: today, playsUsed: newCount };
        await AsyncStorage.setItem(GUEST_PLAYS_KEY, JSON.stringify(newData));

        setGuestPlaysUsed(newCount);
        setCanStartGuestPlay(true);
        return true;
      } catch (error) {
        console.error('[useGuestPlays] Error granting extra play:', error);
        return false;
      }
    }
  };
}
