import { useState, useEffect, useCallback } from 'react';
import {
  InterstitialAd,
  RewardedAd,
  AdEventType,
  RewardedAdEventType,
  TestIds, // Import TestIds for development
} from 'react-native-google-mobile-ads';
import { getAdUnitId } from '../../lib/config/adConfig';
import { FirebaseAnalytics } from '../../lib/firebase';
import { MAX_LIVES, User, Event, RewardType } from '../types';

// --- Configuration ---
const USE_TEST_IDS = __DEV__; // Utilise la variable globale de Metro Bundler

// --- Création d'instances (au niveau supérieur) ---
const genericInterstitial = InterstitialAd.createForAdRequest(
  USE_TEST_IDS ? TestIds.INTERSTITIAL : getAdUnitId('INTERSTITIAL_GENERIC'),
  { requestNonPersonalizedAdsOnly: true }
);

const levelUpInterstitial = InterstitialAd.createForAdRequest(
  USE_TEST_IDS ? TestIds.INTERSTITIAL : getAdUnitId('INTERSTITIAL_LEVEL_UP'),
  { requestNonPersonalizedAdsOnly: true }
);

const gameOverInterstitial = InterstitialAd.createForAdRequest(
  USE_TEST_IDS ? TestIds.INTERSTITIAL : getAdUnitId('INTERSTITIAL_GAME_OVER'),
  { requestNonPersonalizedAdsOnly: true }
);

const rewardedAd = RewardedAd.createForAdRequest(
  USE_TEST_IDS ? TestIds.REWARDED : getAdUnitId('REWARDED_EXTRA_LIFE'),
  { requestNonPersonalizedAdsOnly: true }
);

// --- Interfaces ---
interface AdState {
  interstitialLoaded: boolean;
  gameOverInterstitialLoaded: boolean;
  levelUpInterstitialLoaded: boolean;
  rewardedLoaded: boolean;
  lastInterstitialTime: number;
  hasWatchedRewardedAd: boolean;
}

interface UseAdsProps {
  user: User;
  previousEvent: Event | null;
  allEvents: Event[] | null;
  pendingAdDisplay?: "interstitial" | "rewarded" | "gameOver" | "levelUp" | null;
  setUser: (updater: (prev: User) => User) => void;
  resetTimer: (time?: number, skipNextMalus?: boolean) => void;
  setIsGameOver: (isGameOver: boolean) => void;
  setIsLevelPaused: (isPaused: boolean) => void;
  setIsWaitingForCountdown: (isWaiting: boolean) => void;
  setError?: (error: string) => void;
  setPendingAdDisplay?: (display: "interstitial" | "rewarded" | "gameOver" | "levelUp" | null) => void;
  selectNewEvent: (events: Event[], referenceEvent: Event | null) => Promise<Event | null>;
  // --- AJOUT DU CALLBACK ---
  onLevelUpAdClosed?: () => void;
}

/**
 * Hook pour gérer les publicités dans le jeu (interstitiels et récompensées).
 */
export function useAds({
  user,
  previousEvent,
  allEvents,
  pendingAdDisplay,
  setUser,
  resetTimer,
  setIsGameOver,
  setIsLevelPaused,
  setIsWaitingForCountdown,
  setError,
  setPendingAdDisplay,
  selectNewEvent,
  // --- RÉCUPÉRATION DU CALLBACK ---
  onLevelUpAdClosed
}: UseAdsProps) {

  const [adState, setAdState] = useState<AdState>({
    interstitialLoaded: false,
    gameOverInterstitialLoaded: false,
    levelUpInterstitialLoaded: false,
    rewardedLoaded: false,
    lastInterstitialTime: 0,
    hasWatchedRewardedAd: false,
  });

  // --- Gestion des Événements Publicitaires ---
  useEffect(() => {
    // Fonction pour obtenir le niveau actuel pour les logs
    const getCurrentLevelForLog = (): number => {
        return user?.level || 0;
    };

    // --- Generic Interstitial Listeners ---
    const unsubGenericLoaded = genericInterstitial.addAdEventListener(AdEventType.LOADED, () => {
      setAdState(prev => ({ ...prev, interstitialLoaded: true }));
      FirebaseAnalytics.ad('interstitial', 'loaded', 'generic', getCurrentLevelForLog());
    });

    const unsubGenericError = genericInterstitial.addAdEventListener(AdEventType.ERROR, error => {
      setAdState(prev => ({ ...prev, interstitialLoaded: false }));
      FirebaseAnalytics.ad('interstitial', 'failed', 'generic', getCurrentLevelForLog());
      FirebaseAnalytics.error('ad_load_error', `Generic Interstitial: ${error.message}`, 'useAds');
      setTimeout(() => genericInterstitial.load(), 15000);
    });

    const unsubGenericOpened = genericInterstitial.addAdEventListener(AdEventType.OPENED, () => {
        setIsLevelPaused(true);
        FirebaseAnalytics.ad('interstitial', 'opened', 'generic', getCurrentLevelForLog());
    });

    const unsubGenericClosed = genericInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
      // Pour les pubs génériques, on peut probablement garder la reprise ici si c'est le comportement souhaité
      setIsLevelPaused(false);
      genericInterstitial.load();
      setAdState(prev => ({ ...prev, interstitialLoaded: false, lastInterstitialTime: Date.now() }));
      resetTimer(20);
      FirebaseAnalytics.ad('interstitial', 'closed', 'generic', getCurrentLevelForLog());
    });

    // --- LevelUp Interstitial Listeners ---
    const unsubLevelUpLoaded = levelUpInterstitial.addAdEventListener(AdEventType.LOADED, () => {
        setAdState(prev => ({ ...prev, levelUpInterstitialLoaded: true }));
        FirebaseAnalytics.ad('interstitial', 'loaded', 'level_up', getCurrentLevelForLog());
    });

    const unsubLevelUpError = levelUpInterstitial.addAdEventListener(AdEventType.ERROR, error => {
        setAdState(prev => ({ ...prev, levelUpInterstitialLoaded: false }));
        FirebaseAnalytics.ad('interstitial', 'failed', 'level_up', getCurrentLevelForLog());
        FirebaseAnalytics.error('ad_load_error', `LevelUp Interstitial: ${error.message}`, 'useAds');
        setTimeout(() => levelUpInterstitial.load(), 15000);
    });

    const unsubLevelUpOpened = levelUpInterstitial.addAdEventListener(AdEventType.OPENED, () => {
        setIsLevelPaused(true); // <-- Pause quand la pub s'ouvre
        FirebaseAnalytics.ad('interstitial', 'opened', 'level_up', getCurrentLevelForLog());
    });

    const unsubLevelUpClosed = levelUpInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
        console.log("[useAds] LevelUp Ad Closed - Calling onLevelUpAdClosed callback if provided."); // Log ajouté
        // NE PAS retirer la pause ici
        // NE PAS reset le timer ici
        levelUpInterstitial.load();
        setAdState(prev => ({ ...prev, levelUpInterstitialLoaded: false, lastInterstitialTime: Date.now() }));
        FirebaseAnalytics.ad('interstitial', 'closed', 'level_up', getCurrentLevelForLog());
        // --- APPEL DU CALLBACK ---
        if (onLevelUpAdClosed) {
          onLevelUpAdClosed();
        }
    });

    // --- GameOver Interstitial Listeners ---
    const unsubGameOverLoaded = gameOverInterstitial.addAdEventListener(AdEventType.LOADED, () => {
        setAdState(prev => ({ ...prev, gameOverInterstitialLoaded: true }));
        FirebaseAnalytics.ad('interstitial', 'loaded', 'game_over', getCurrentLevelForLog());
    });

    const unsubGameOverError = gameOverInterstitial.addAdEventListener(AdEventType.ERROR, error => {
        setAdState(prev => ({ ...prev, gameOverInterstitialLoaded: false }));
        FirebaseAnalytics.ad('interstitial', 'failed', 'game_over', getCurrentLevelForLog());
        FirebaseAnalytics.error('ad_load_error', `GameOver Interstitial: ${error.message}`, 'useAds');
        setTimeout(() => gameOverInterstitial.load(), 15000);
    });

    const unsubGameOverOpened = gameOverInterstitial.addAdEventListener(AdEventType.OPENED, () => {
         // Pas besoin de mettre en pause ici, endGame le fait déjà
        FirebaseAnalytics.ad('interstitial', 'opened', 'game_over', getCurrentLevelForLog());
    });

    const unsubGameOverClosed = gameOverInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
        // Pas besoin de retirer la pause ici, le jeu est terminé
        gameOverInterstitial.load();
        setAdState(prev => ({ ...prev, gameOverInterstitialLoaded: false, lastInterstitialTime: Date.now() }));
        FirebaseAnalytics.ad('interstitial', 'closed', 'game_over', getCurrentLevelForLog());
    });

    // --- Rewarded Ad Listeners ---
    const unsubRewardedLoaded = rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setAdState(prev => ({ ...prev, rewardedLoaded: true }));
      FirebaseAnalytics.ad('rewarded', 'loaded', 'extra_life', getCurrentLevelForLog());
    });

    const unsubRewardedError = rewardedAd.addAdEventListener(AdEventType.ERROR, error => {
      setAdState(prev => ({ ...prev, rewardedLoaded: false }));
      FirebaseAnalytics.ad('rewarded', 'failed', 'extra_life', getCurrentLevelForLog());
      FirebaseAnalytics.error('ad_load_error', `Rewarded Ad: ${error.message}`, 'useAds');
      setTimeout(() => rewardedAd.load(), 15000);
    });

    const unsubRewardedOpened = rewardedAd.addAdEventListener(AdEventType.OPENED, () => {
        setIsLevelPaused(true); // <-- Pause quand la pub s'ouvre
        FirebaseAnalytics.ad('rewarded', 'opened', 'extra_life', getCurrentLevelForLog());
    });

    const unsubRewardedClosed = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
      // Si fermée SANS obtenir la récompense
      // On doit vérifier si la récompense a été donnée (via un flag peut-être) ou simplement retirer la pause
      // Pour l'instant, on retire la pause, mais la logique EARNED_REWARD prévaut si elle est appelée.
      setIsLevelPaused(false); // <-- A vérifier si c'est le comportement voulu si fermée tôt
      resetTimer(20);
      rewardedAd.load();
      setAdState(prev => ({ ...prev, rewardedLoaded: false }));
      FirebaseAnalytics.ad('rewarded', 'closed', 'extra_life', getCurrentLevelForLog());
    });

    // --- Callback quand la récompense est obtenue ---
    const unsubRewardedEarned = rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, reward => {
      const shouldGrantLife = reward?.type === RewardType.EXTRA_LIFE || reward?.type === 'coins';

      if (shouldGrantLife) {
        setIsGameOver(false); // Annuler l'état de Game Over AVANT de donner la vie
      }

      const continueGameAfterReward = async () => {
        const currentLevel = user?.level || 0;
        const currentPoints = user?.points || 0;

        // 1. Mettre à jour l'état USER (vie)
        try {
            await new Promise<void>((resolve) => {
                setUser(prevUser => {
                    const currentLives = prevUser.lives;
                    const livesToAdd = shouldGrantLife ? 1 : 0;
                    return {
                        ...prevUser,
                        lives: Math.min(currentLives + livesToAdd, MAX_LIVES),
                    };
                });
                setTimeout(resolve, 100); // Laisser le temps à React de traiter
            });
        } catch(updateError) {
            if (setError) setError("Erreur lors de l'application de la récompense.");
            setIsLevelPaused(false);
            return; // Ne pas continuer
        }

        // 2. Mettre à jour l'état AdMob
        setAdState(prev => ({ ...prev, hasWatchedRewardedAd: true, rewardedLoaded: false }));

        // 3. Mettre à jour l'état du jeu
        setIsLevelPaused(false); // <-- Reprise ici DANS le flux récompensé
        setIsWaitingForCountdown(false);

        // 4. Log Analytics
        FirebaseAnalytics.ad('rewarded', 'earned_reward', 'extra_life', currentLevel);
        if (shouldGrantLife) {
            FirebaseAnalytics.reward('EXTRA_LIFE', 1, 'ad_reward', 'completed', currentLevel, currentPoints);
        } else {
             FirebaseAnalytics.reward(reward?.type || 'unknown', reward?.amount || 0, 'ad_reward_unexpected', 'completed', currentLevel, currentPoints);
        }

        // 5. Réinitialiser le timer sans malus
        resetTimer(20, true);

        // 6. Déclencher la sélection du nouvel événement
        try {
          if (!allEvents || !previousEvent) {
            throw new Error("Missing required data for event selection after reward");
          }
          const result = await selectNewEvent(allEvents, previousEvent);
          if (result === null) {
             throw new Error("Failed to select next event after reward.");
          }
        } catch (err) {
          setIsGameOver(true);
          setIsLevelPaused(true);
          if (setError) setError('Erreur lors de la reprise du jeu après la publicité.');
          FirebaseAnalytics.error('rewarded_resume_error', err instanceof Error ? err.message : 'Unknown error', 'useAds:EARNED_REWARD');
        }
      };

      continueGameAfterReward();
    });

    // --- Chargement initial des publicités ---
    if (!genericInterstitial.loaded) genericInterstitial.load();
    if (!levelUpInterstitial.loaded) levelUpInterstitial.load();
    if (!gameOverInterstitial.loaded) gameOverInterstitial.load();
    if (!rewardedAd.loaded) rewardedAd.load();

    // --- Fonction de nettoyage ---
    return () => {
      unsubGenericLoaded(); unsubGenericError(); unsubGenericOpened(); unsubGenericClosed();
      unsubLevelUpLoaded(); unsubLevelUpError(); unsubLevelUpOpened(); unsubLevelUpClosed();
      unsubGameOverLoaded(); unsubGameOverError(); unsubGameOverOpened(); unsubGameOverClosed();
      unsubRewardedLoaded(); unsubRewardedError(); unsubRewardedOpened(); unsubRewardedClosed(); unsubRewardedEarned();
    };
  }, [
    user, // Inclure user directement ici pour getCurrentLevelForLog
    previousEvent,
    allEvents,
    setUser,
    resetTimer,
    setIsGameOver,
    setIsLevelPaused,
    setIsWaitingForCountdown,
    setError,
    selectNewEvent,
    // --- AJOUT DE LA DÉPENDANCE ---
    onLevelUpAdClosed
    // Ne pas inclure adState ici pour éviter les re-créations de listeners inutiles
  ]);

  // --- Fonctions pour afficher les publicités ---

  const canShowAd = useCallback(() => {
    return Date.now() - adState.lastInterstitialTime >= 3 * 60 * 1000;
  }, [adState.lastInterstitialTime]);

  const showRewardedAd = useCallback(() => {
    const currentLevel = user?.level || 0;
    if (adState.hasWatchedRewardedAd) {
      FirebaseAnalytics.ad('rewarded', 'blocked', 'already_watched', currentLevel);
      return false;
    }
    try {
      if (adState.rewardedLoaded) {
        FirebaseAnalytics.ad('rewarded', 'triggered', 'user_request_extra_life', currentLevel);
        rewardedAd.show();
        return true;
      } else {
        FirebaseAnalytics.ad('rewarded', 'not_available', 'user_request_extra_life', currentLevel);
        rewardedAd.load();
        return false;
      }
    } catch (error) {
      FirebaseAnalytics.ad('rewarded', 'error_show', 'user_request_extra_life', currentLevel);
      FirebaseAnalytics.error('ad_show_error', `Rewarded Ad: ${error instanceof Error ? error.message : 'Unknown error'}`, 'useAds');
      rewardedAd.load();
      return false;
    }
  }, [adState.rewardedLoaded, adState.hasWatchedRewardedAd, user?.level]);

  const showGenericInterstitial = useCallback(() => {
    const currentLevel = user?.level || 0;
    if (!canShowAd()) {
      FirebaseAnalytics.ad('interstitial', 'blocked', 'rate_limit_generic', currentLevel);
      return false;
    }
    try {
      if (adState.interstitialLoaded) {
        FirebaseAnalytics.ad('interstitial', 'triggered', 'generic', currentLevel);
        genericInterstitial.show();
        return true;
      } else {
        FirebaseAnalytics.ad('interstitial', 'not_available', 'generic', currentLevel);
        genericInterstitial.load();
        return false;
      }
    } catch (error) {
      FirebaseAnalytics.ad('interstitial', 'error_show', 'generic', currentLevel);
      FirebaseAnalytics.error('ad_show_error', `Generic Interstitial: ${error instanceof Error ? error.message : 'Unknown error'}`, 'useAds');
      genericInterstitial.load();
      return false;
    }
  }, [adState.interstitialLoaded, canShowAd, user?.level]);

 const showLevelUpInterstitial = useCallback(() => {
  const currentLevel = user?.level || 0;
  if (!canShowAd()) {
    FirebaseAnalytics.ad('interstitial', 'blocked', 'rate_limit_level_up', currentLevel);
    return false;
  }
  try {
    if (adState.levelUpInterstitialLoaded) {
      FirebaseAnalytics.ad('interstitial', 'triggered', 'level_up', currentLevel);
      levelUpInterstitial.show();
      return true;
    } else if (adState.interstitialLoaded) {
      FirebaseAnalytics.ad('interstitial', 'triggered', 'level_up_fallback', currentLevel);
      genericInterstitial.show();
      return true;
    } else {
      FirebaseAnalytics.ad('interstitial', 'not_available', 'level_up', currentLevel);
      levelUpInterstitial.load(); genericInterstitial.load();
      return false;
    }
  } catch (error) {
    FirebaseAnalytics.ad('interstitial', 'error_show', 'level_up', currentLevel);
    FirebaseAnalytics.error('ad_show_error', `LevelUp/Generic Interstitial: ${error instanceof Error ? error.message : 'Unknown error'}`, 'useAds');
    if (adState.levelUpInterstitialLoaded) levelUpInterstitial.load(); else genericInterstitial.load();
    return false;
  }
}, [adState.levelUpInterstitialLoaded, adState.interstitialLoaded, canShowAd, user?.level]);

const showGameOverInterstitial = useCallback(() => {
  const currentLevel = user?.level || 0;
  // Pas de rate limit pour Game Over
  try {
    if (adState.gameOverInterstitialLoaded) {
      FirebaseAnalytics.ad('interstitial', 'triggered', 'game_over', currentLevel);
      gameOverInterstitial.show();
      return true;
    } else if (adState.interstitialLoaded) {
      FirebaseAnalytics.ad('interstitial', 'triggered', 'game_over_fallback', currentLevel);
      genericInterstitial.show();
      return true;
    } else {
      FirebaseAnalytics.ad('interstitial', 'not_available', 'game_over', currentLevel);
      gameOverInterstitial.load(); genericInterstitial.load();
      return false;
    }
  } catch (error) {
    FirebaseAnalytics.ad('interstitial', 'error_show', 'game_over', currentLevel);
    FirebaseAnalytics.error('ad_show_error', `GameOver/Generic Interstitial: ${error instanceof Error ? error.message : 'Unknown error'}`, 'useAds');
    if (adState.gameOverInterstitialLoaded) gameOverInterstitial.load(); else genericInterstitial.load();
    return false;
  }
}, [adState.gameOverInterstitialLoaded, adState.interstitialLoaded, user?.level]);

// Pour gérer pendingAdDisplay
useEffect(() => {
  if (pendingAdDisplay && setPendingAdDisplay) {
    let adShown = false;
    if (pendingAdDisplay === 'levelUp') {
        adShown = showLevelUpInterstitial(); // Appelle directement la fonction qui gère le fallback et le canShowAd
    } else if (pendingAdDisplay === 'gameOver') {
        adShown = showGameOverInterstitial(); // Appelle la fonction qui gère le fallback (pas de canShowAd ici)
    } else if (pendingAdDisplay === 'interstitial') {
        adShown = showGenericInterstitial(); // Appelle la fonction qui gère le canShowAd
    } else if (pendingAdDisplay === 'rewarded') {
        adShown = showRewardedAd(); // Appelle la fonction qui gère la vérification 'hasWatched' etc.
    }

    if (adShown || pendingAdDisplay === 'rewarded') { // Pour rewarded, on reset même si la pub n'est pas montrée (ex: pas chargée)
        setPendingAdDisplay(null);
    }
    // Si une pub interstitielle n'a pas été montrée à cause du rate limit, pendingAdDisplay restera actif
    // jusqu'à ce que la condition change ou qu'un autre déclencheur le modifie.
  }
}, [
  pendingAdDisplay,
  setPendingAdDisplay,
  showLevelUpInterstitial,
  showGameOverInterstitial,
  showGenericInterstitial,
  showRewardedAd
]);


const resetAdsState = useCallback(() => {
  setAdState(prev => ({
    ...prev,
    hasWatchedRewardedAd: false,
  }));
  // Relancer le chargement si nécessaire
  if (!genericInterstitial.loaded) genericInterstitial.load();
  if (!levelUpInterstitial.loaded) levelUpInterstitial.load();
  if (!gameOverInterstitial.loaded) gameOverInterstitial.load();
  if (!rewardedAd.loaded) rewardedAd.load();
}, []);

return {
  adState, // Gardé pour fournir l'état détaillé si besoin ailleurs
  canShowAd,
  showRewardedAd,
  showGenericInterstitial,
  showLevelUpInterstitial,
  showGameOverInterstitial,
  resetAdsState,
};
}

export default useAds;