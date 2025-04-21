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
// Mettre à true pour utiliser les ID de test pendant le développement
const USE_TEST_IDS = __DEV__; // Utilise la variable globale de Metro Bundler

// --- Création d'instances (au niveau supérieur) ---
// Utilise les ID de test si USE_TEST_IDS est true, sinon les ID réels
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
  hasWatchedRewardedAd: boolean; // A-t-il regardé une pub récompensée DANS CETTE PARTIE ?
}

// Interface pour les props attendues par le hook
interface UseAdsProps {
  // Données utilisateur et jeu
  user: User;
  previousEvent: Event | null;
  allEvents: Event[] | null;
  pendingAdDisplay?: "interstitial" | "rewarded" | "gameOver" | "levelUp" | null;
  
  // Setters pour modifier l'état du jeu
  setUser: (updater: (prev: User) => User) => void;
  resetTimer: (time?: number, skipNextMalus?: boolean) => void; // Ajout du paramètre skipNextMalus
  setIsGameOver: (isGameOver: boolean) => void;
  setIsLevelPaused: (isPaused: boolean) => void;
  setIsWaitingForCountdown: (isWaiting: boolean) => void;
  setError?: (error: string) => void;
  setPendingAdDisplay?: (display: "interstitial" | "rewarded" | "gameOver" | "levelUp" | null) => void;

  // Fonction pour sélectionner un nouvel événement
  selectNewEvent: (events: Event[], referenceEvent: Event | null) => Promise<Event | null>;
}

/**
 * Hook pour gérer les publicités dans le jeu (interstitiels et récompensées).
 */
export function useAds({
  // Données utilisateur et jeu
  user,
  previousEvent,
  allEvents,
  pendingAdDisplay,
  
  // Setters
  setUser,
  resetTimer,
  setIsGameOver,
  setIsLevelPaused,
  setIsWaitingForCountdown,
  setError,
  setPendingAdDisplay,
  
  // Fonction de sélection d'événement
  selectNewEvent
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
    console.log('[useAds] Initializing ad listeners...');

    // Fonction pour obtenir le niveau actuel pour les logs
    const getCurrentLevelForLog = (): number => {
        return user?.level || 0;
    };

    // --- Generic Interstitial Listeners ---
    const unsubGenericLoaded = genericInterstitial.addAdEventListener(AdEventType.LOADED, () => {
      console.log('[useAds] Generic Interstitial Loaded');
      setAdState(prev => ({ ...prev, interstitialLoaded: true }));
      FirebaseAnalytics.ad('interstitial', 'loaded', 'generic', getCurrentLevelForLog());
    });
    
    const unsubGenericError = genericInterstitial.addAdEventListener(AdEventType.ERROR, error => {
      console.error('[useAds] Generic Interstitial Load Error:', error);
      setAdState(prev => ({ ...prev, interstitialLoaded: false }));
      FirebaseAnalytics.ad('interstitial', 'failed', 'generic', getCurrentLevelForLog());
      FirebaseAnalytics.error('ad_load_error', `Generic Interstitial: ${error.message}`, 'useAds');
      setTimeout(() => genericInterstitial.load(), 15000); // Délai plus long pour éviter spam
    });
    
    const unsubGenericOpened = genericInterstitial.addAdEventListener(AdEventType.OPENED, () => {
        console.log('[useAds] Generic Interstitial Opened');
        setIsLevelPaused(true); // Mettre en pause quand la pub s'ouvre
        FirebaseAnalytics.ad('interstitial', 'opened', 'generic', getCurrentLevelForLog());
    });
    
    const unsubGenericClosed = genericInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('[useAds] Generic Interstitial Closed');
      setIsLevelPaused(false); // Reprendre le jeu
      genericInterstitial.load(); // Recharger pour la prochaine fois
      setAdState(prev => ({ ...prev, interstitialLoaded: false, lastInterstitialTime: Date.now() }));
      resetTimer(20); // Réinitialiser le timer
      FirebaseAnalytics.ad('interstitial', 'closed', 'generic', getCurrentLevelForLog());
    });

    // --- LevelUp Interstitial Listeners ---
    const unsubLevelUpLoaded = levelUpInterstitial.addAdEventListener(AdEventType.LOADED, () => {
        console.log('[useAds] LevelUp Interstitial Loaded');
        setAdState(prev => ({ ...prev, levelUpInterstitialLoaded: true }));
        FirebaseAnalytics.ad('interstitial', 'loaded', 'level_up', getCurrentLevelForLog());
    });
    
    const unsubLevelUpError = levelUpInterstitial.addAdEventListener(AdEventType.ERROR, error => {
        console.error('[useAds] LevelUp Interstitial Load Error:', error);
        setAdState(prev => ({ ...prev, levelUpInterstitialLoaded: false }));
        FirebaseAnalytics.ad('interstitial', 'failed', 'level_up', getCurrentLevelForLog());
        FirebaseAnalytics.error('ad_load_error', `LevelUp Interstitial: ${error.message}`, 'useAds');
        setTimeout(() => levelUpInterstitial.load(), 15000);
    });
    
    const unsubLevelUpOpened = levelUpInterstitial.addAdEventListener(AdEventType.OPENED, () => {
        console.log('[useAds] LevelUp Interstitial Opened');
        setIsLevelPaused(true); // Mettre en pause
        FirebaseAnalytics.ad('interstitial', 'opened', 'level_up', getCurrentLevelForLog());
    });
    
    const unsubLevelUpClosed = levelUpInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('[useAds] LevelUp Interstitial Closed');
        setIsLevelPaused(false); // Reprendre
        levelUpInterstitial.load();
        setAdState(prev => ({ ...prev, levelUpInterstitialLoaded: false, lastInterstitialTime: Date.now() }));
        resetTimer(20);
        FirebaseAnalytics.ad('interstitial', 'closed', 'level_up', getCurrentLevelForLog());
    });

    // --- GameOver Interstitial Listeners ---
    const unsubGameOverLoaded = gameOverInterstitial.addAdEventListener(AdEventType.LOADED, () => {
        console.log('[useAds] GameOver Interstitial Loaded');
        setAdState(prev => ({ ...prev, gameOverInterstitialLoaded: true }));
        FirebaseAnalytics.ad('interstitial', 'loaded', 'game_over', getCurrentLevelForLog());
    });
    
    const unsubGameOverError = gameOverInterstitial.addAdEventListener(AdEventType.ERROR, error => {
        console.error('[useAds] GameOver Interstitial Load Error:', error);
        setAdState(prev => ({ ...prev, gameOverInterstitialLoaded: false }));
        FirebaseAnalytics.ad('interstitial', 'failed', 'game_over', getCurrentLevelForLog());
        FirebaseAnalytics.error('ad_load_error', `GameOver Interstitial: ${error.message}`, 'useAds');
        setTimeout(() => gameOverInterstitial.load(), 15000);
    });
    
    const unsubGameOverOpened = gameOverInterstitial.addAdEventListener(AdEventType.OPENED, () => {
        console.log('[useAds] GameOver Interstitial Opened');
        FirebaseAnalytics.ad('interstitial', 'opened', 'game_over', getCurrentLevelForLog());
    });
    
    const unsubGameOverClosed = gameOverInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('[useAds] GameOver Interstitial Closed');
        gameOverInterstitial.load();
        setAdState(prev => ({ ...prev, gameOverInterstitialLoaded: false, lastInterstitialTime: Date.now() }));
        FirebaseAnalytics.ad('interstitial', 'closed', 'game_over', getCurrentLevelForLog());
    });

    // --- Rewarded Ad Listeners ---
    const unsubRewardedLoaded = rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      console.log('[useAds] Rewarded Ad Loaded');
      setAdState(prev => ({ ...prev, rewardedLoaded: true }));
      FirebaseAnalytics.ad('rewarded', 'loaded', 'extra_life', getCurrentLevelForLog());
    });
    
    const unsubRewardedError = rewardedAd.addAdEventListener(AdEventType.ERROR, error => {
      console.error('[useAds] Rewarded Ad Load Error:', error);
      setAdState(prev => ({ ...prev, rewardedLoaded: false }));
      FirebaseAnalytics.ad('rewarded', 'failed', 'extra_life', getCurrentLevelForLog());
      FirebaseAnalytics.error('ad_load_error', `Rewarded Ad: ${error.message}`, 'useAds');
      setTimeout(() => rewardedAd.load(), 15000);
    });
    
    const unsubRewardedOpened = rewardedAd.addAdEventListener(AdEventType.OPENED, () => {
        console.log('[useAds] Rewarded Ad Opened');
        setIsLevelPaused(true); // Mettre en pause pendant l'affichage
        FirebaseAnalytics.ad('rewarded', 'opened', 'extra_life', getCurrentLevelForLog());
    });
    
    const unsubRewardedClosed = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('[useAds] Rewarded Ad Closed');
      // Si la pub est fermée SANS avoir donné de récompense
      // On reprend le jeu et on réinitialise le timer.
      setIsLevelPaused(false);
      resetTimer(20);
      
      rewardedAd.load(); // Recharger pour la prochaine fois
      setAdState(prev => ({ ...prev, rewardedLoaded: false }));
      FirebaseAnalytics.ad('rewarded', 'closed', 'extra_life', getCurrentLevelForLog());
    });

    // --- Callback quand la récompense est obtenue ---
    const unsubRewardedEarned = rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, reward => {
      console.log(`[useAds] Rewarded Ad Earned Reward: ${JSON.stringify(reward)}`);

      // Détermine si la récompense doit donner une vie
      const shouldGrantLife = reward?.type === RewardType.EXTRA_LIFE || reward?.type === 'coins';
      console.log(`[useAds] Should grant life based on reward type? ${shouldGrantLife}`);

      // Utilise une fonction async pour garantir l'ordre et les délais
      const continueGameAfterReward = async () => {
        console.log('[useAds] Applying reward and continuing game (async)...');
        const currentLevel = user?.level || 0;
        const currentPoints = user?.points || 0;

        // 1. METTRE À JOUR L'ÉTAT USER (vie) EN PREMIER
        console.log(`[useAds] Attempting to update user state...`);
        try {
            await new Promise<void>((resolve) => {
                setUser(prevUser => {
                    const currentLives = prevUser.lives;
                    const livesToAdd = shouldGrantLife ? 1 : 0;
                    console.log(`[useAds] SETTER: Adding ${livesToAdd} life to ${currentLives} lives.`);

                    return {
                        ...prevUser,
                        lives: Math.min(currentLives + livesToAdd, MAX_LIVES),
                    };
                });
                // Délai pour laisser React traiter la mise à jour
                setTimeout(resolve, 100);
            });
            console.log(`[useAds] User state update processed.`);

        } catch(updateError) {
            console.error("[useAds] Failed to update user state:", updateError);
            if (setError) setError("Erreur lors de l'application de la récompense.");
            setIsLevelPaused(false); // Libérer la pause
            return; // Arrêter ici
        }

        // 2. Mettre à jour l'état local AdMob
        setAdState(prev => ({ ...prev, hasWatchedRewardedAd: true, rewardedLoaded: false }));

        // 3. Mettre à jour l'état du jeu
        console.log(`[useAds] Setting isGameOver=false, isLevelPaused=false`);
        setIsGameOver(false); // Important: annule le game over
        setIsLevelPaused(false); // Reprend le jeu
        setIsWaitingForCountdown(false); // Assure qu'on n'attend pas

        // 4. Log Analytics
        FirebaseAnalytics.ad('rewarded', 'earned_reward', 'extra_life', currentLevel);
        if (shouldGrantLife) {
            FirebaseAnalytics.reward('EXTRA_LIFE', 1, 'ad_reward', 'completed', currentLevel, currentPoints);
        } else {
             FirebaseAnalytics.reward(reward?.type || 'unknown', reward?.amount || 0, 'ad_reward_unexpected', 'completed', currentLevel, currentPoints);
        }

        // 5. Réinitialiser le timer avec skipNextMalus=true pour éviter le malus de temps
        console.log(`[useAds] Resetting timer with skipNextMalus=true to avoid time penalty`);
        resetTimer(20, true);  // MODIFICATION ICI: ajout du paramètre skipNextMalus=true

        // 6. Déclencher la sélection du nouvel événement
        console.log(`[useAds] Triggering new event selection with ref: ${previousEvent?.id}`);
        try {
          if (!allEvents || !previousEvent) {
            throw new Error("Missing required data for event selection");
          }
          
          const result = await selectNewEvent(allEvents, previousEvent);
          
          if (result === null) {
             console.error("[useAds] selectNewEvent failed after reward.");
             throw new Error("Failed to select next event after reward.");
          }
          console.log("[useAds] Game resumed successfully after reward.");
        } catch (err) {
          // Erreur critique pendant la reprise
          console.error("[useAds] Error resuming game after rewarded ad:", err);
          setIsGameOver(true); // Remettre en Game Over
          setIsLevelPaused(true); // Garder en pause
          if (setError) setError('Erreur lors de la reprise du jeu après la publicité.');
          FirebaseAnalytics.error('rewarded_resume_error', err instanceof Error ? err.message : 'Unknown error', 'useAds:EARNED_REWARD');
        }
      };

      // Exécuter la fonction de reprise après récompense
      continueGameAfterReward();
    });

    // --- Chargement initial des publicités ---
    console.log('[useAds] Loading initial ads...');
    if (!genericInterstitial.loaded) genericInterstitial.load();
    if (!levelUpInterstitial.loaded) levelUpInterstitial.load();
    if (!gameOverInterstitial.loaded) gameOverInterstitial.load();
    if (!rewardedAd.loaded) rewardedAd.load();

    // --- Fonction de nettoyage (désabonnements) ---
    return () => {
      console.log('[useAds] Cleaning up ad listeners...');
      // Interstitiels
      unsubGenericLoaded(); unsubGenericError(); unsubGenericOpened(); unsubGenericClosed();
      unsubLevelUpLoaded(); unsubLevelUpError(); unsubLevelUpOpened(); unsubLevelUpClosed();
      unsubGameOverLoaded(); unsubGameOverError(); unsubGameOverOpened(); unsubGameOverClosed();
      // Récompensée
      unsubRewardedLoaded(); unsubRewardedError(); unsubRewardedOpened(); unsubRewardedClosed(); unsubRewardedEarned();
    };
  }, [
    user,
    previousEvent,
    allEvents,
    setUser,
    resetTimer,
    setIsGameOver,
    setIsLevelPaused,
    setIsWaitingForCountdown,
    setError,
    selectNewEvent
  ]);

  // --- Fonctions pour afficher les publicités ---

  // Vérifie si un interstitiel peut être montré
  const canShowAd = useCallback(() => {
    const canShow = Date.now() - adState.lastInterstitialTime >= 3 * 60 * 1000;
    if (!canShow) {
        console.log(`[useAds] Interstitial blocked: Too soon since last ad (last: ${adState.lastInterstitialTime}, now: ${Date.now()})`);
    }
    return canShow;
  }, [adState.lastInterstitialTime]);

  // Affiche la pub récompensée si possible
  const showRewardedAd = useCallback(() => {
    const currentLevel = user?.level || 0;

    if (adState.hasWatchedRewardedAd) {
      console.log('[useAds] Rewarded ad blocked: Already watched in this session.');
      FirebaseAnalytics.ad('rewarded', 'blocked', 'already_watched', currentLevel);
      return false;
    }

    try {
      if (adState.rewardedLoaded) {
        console.log('[useAds] Showing Rewarded Ad...');
        FirebaseAnalytics.ad('rewarded', 'triggered', 'user_request_extra_life', currentLevel);
        rewardedAd.show();
        return true; // Tentative faite
      } else {
        console.log('[useAds] Rewarded ad requested but not loaded.');
        FirebaseAnalytics.ad('rewarded', 'not_available', 'user_request_extra_life', currentLevel);
        // Tenter de recharger explicitement si non chargé
        rewardedAd.load();
        return false;
      }
    } catch (error) {
      console.error('[useAds] Error trying to show Rewarded Ad:', error);
      FirebaseAnalytics.ad('rewarded', 'error_show', 'user_request_extra_life', currentLevel);
      FirebaseAnalytics.error('ad_show_error', `Rewarded Ad: ${error instanceof Error ? error.message : 'Unknown error'}`, 'useAds');
      rewardedAd.load(); // Recharger après erreur
      return false;
    }
  }, [adState.rewardedLoaded, adState.hasWatchedRewardedAd, user?.level]);

  // Affiche l'interstitiel générique
  const showGenericInterstitial = useCallback(() => {
    const currentLevel = user?.level || 0;
    if (!canShowAd()) {
      FirebaseAnalytics.ad('interstitial', 'blocked', 'rate_limit_generic', currentLevel);
      return false;
    }
    try {
      if (adState.interstitialLoaded) {
        console.log('[useAds] Showing Generic Interstitial...');
        FirebaseAnalytics.ad('interstitial', 'triggered', 'generic', currentLevel);
        genericInterstitial.show();
        return true;
      } else {
        console.log('[useAds] Generic Interstitial requested but not loaded.');
        FirebaseAnalytics.ad('interstitial', 'not_available', 'generic', currentLevel);
        genericInterstitial.load();
        return false;
      }
    } catch (error) {
      console.error('[useAds] Error trying to show Generic Interstitial:', error);
      FirebaseAnalytics.ad('interstitial', 'error_show', 'generic', currentLevel);
      FirebaseAnalytics.error('ad_show_error', `Generic Interstitial: ${error instanceof Error ? error.message : 'Unknown error'}`, 'useAds');
      genericInterstitial.load();
      return false;
    }
  }, [adState.interstitialLoaded, canShowAd, user?.level]);

 // Affiche l'interstitiel de level up (avec fallback générique)
 const showLevelUpInterstitial = useCallback(() => {
  const currentLevel = user?.level || 0;
  if (!canShowAd()) {
    FirebaseAnalytics.ad('interstitial', 'blocked', 'rate_limit_level_up', currentLevel);
    return false;
  }
  try {
    if (adState.levelUpInterstitialLoaded) {
      console.log('[useAds] Showing LevelUp Interstitial...');
      FirebaseAnalytics.ad('interstitial', 'triggered', 'level_up', currentLevel);
      levelUpInterstitial.show();
      return true;
    } else if (adState.interstitialLoaded) {
      console.log('[useAds] LevelUp Interstitial not loaded, falling back to Generic...');
      FirebaseAnalytics.ad('interstitial', 'triggered', 'level_up_fallback', currentLevel);
      genericInterstitial.show();
      return true;
    } else {
      console.log('[useAds] LevelUp/Generic Interstitial requested but none loaded.');
      FirebaseAnalytics.ad('interstitial', 'not_available', 'level_up', currentLevel);
      levelUpInterstitial.load(); genericInterstitial.load(); // Tenter de recharger les deux
      return false;
    }
  } catch (error) {
    console.error('[useAds] Error trying to show LevelUp/Generic Interstitial:', error);
    FirebaseAnalytics.ad('interstitial', 'error_show', 'level_up', currentLevel);
    FirebaseAnalytics.error('ad_show_error', `LevelUp/Generic Interstitial: ${error instanceof Error ? error.message : 'Unknown error'}`, 'useAds');
    if (adState.levelUpInterstitialLoaded) levelUpInterstitial.load(); else genericInterstitial.load();
    return false;
  }
}, [adState.levelUpInterstitialLoaded, adState.interstitialLoaded, canShowAd, user?.level]);

// Affiche l'interstitiel de game over (avec fallback générique)
const showGameOverInterstitial = useCallback(() => {
  const currentLevel = user?.level || 0;
  // Pour le Game Over, on n'applique pas le rate limit
  try {
    if (adState.gameOverInterstitialLoaded) {
      console.log('[useAds] Showing GameOver Interstitial...');
      FirebaseAnalytics.ad('interstitial', 'triggered', 'game_over', currentLevel);
      gameOverInterstitial.show();
      return true;
    } else if (adState.interstitialLoaded) {
      console.log('[useAds] GameOver Interstitial not loaded, falling back to Generic...');
      FirebaseAnalytics.ad('interstitial', 'triggered', 'game_over_fallback', currentLevel);
      genericInterstitial.show();
      return true;
    } else {
      console.log('[useAds] GameOver/Generic Interstitial requested but none loaded.');
      FirebaseAnalytics.ad('interstitial', 'not_available', 'game_over', currentLevel);
      gameOverInterstitial.load(); genericInterstitial.load();
      return false;
    }
  } catch (error) {
    console.error('[useAds] Error trying to show GameOver/Generic Interstitial:', error);
    FirebaseAnalytics.ad('interstitial', 'error_show', 'game_over', currentLevel);
    FirebaseAnalytics.error('ad_show_error', `GameOver/Generic Interstitial: ${error instanceof Error ? error.message : 'Unknown error'}`, 'useAds');
    if (adState.gameOverInterstitialLoaded) gameOverInterstitial.load(); else genericInterstitial.load();
    return false;
  }
}, [adState.gameOverInterstitialLoaded, adState.interstitialLoaded, user?.level]);

// Pour gérer pendingAdDisplay
useEffect(() => {
  if (pendingAdDisplay && setPendingAdDisplay) {
    if (pendingAdDisplay === 'levelUp' && canShowAd()) {
      showLevelUpInterstitial();
      setPendingAdDisplay(null);
    } else if (pendingAdDisplay === 'gameOver' && canShowAd()) {
      showGameOverInterstitial();
      setPendingAdDisplay(null);
    } else if (pendingAdDisplay === 'interstitial' && canShowAd()) {
      showGenericInterstitial();
      setPendingAdDisplay(null);
    } else if (pendingAdDisplay === 'rewarded') {
      showRewardedAd();
      setPendingAdDisplay(null);
    }
  }
}, [
  pendingAdDisplay,
  setPendingAdDisplay,
  canShowAd,
  showLevelUpInterstitial,
  showGameOverInterstitial,
  showGenericInterstitial,
  showRewardedAd
]);

// --- Fonction pour réinitialiser l'état pour une nouvelle partie ---
const resetAdsState = useCallback(() => {
  console.log('[useAds] Resetting ad session state (hasWatchedRewardedAd).');
  setAdState(prev => ({
    ...prev,
    hasWatchedRewardedAd: false, // Permet de revoir une pub récompensée
  }));
  // Relancer le chargement des pubs
  if (!genericInterstitial.loaded) genericInterstitial.load();
  if (!levelUpInterstitial.loaded) levelUpInterstitial.load();
  if (!gameOverInterstitial.loaded) gameOverInterstitial.load();
  if (!rewardedAd.loaded) rewardedAd.load();
}, []);

// --- Retour du Hook ---
return {
  adState, // État complet pour debugging
  canShowAd, // Utile pour vérifier avant de déclencher une pub
  showRewardedAd,
  showGenericInterstitial,
  showLevelUpInterstitial,
  showGameOverInterstitial,
  resetAdsState, // Pour réinitialiser entre les parties
};
}

export default useAds;