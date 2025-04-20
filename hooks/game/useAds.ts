import { useState, useEffect, useCallback } from 'react';
import {
  InterstitialAd,
  RewardedAd,
  AdEventType,
  RewardedAdEventType
} from 'react-native-google-mobile-ads';
import { getAdUnitId } from '../../lib/config/adConfig';
import { FirebaseAnalytics } from '../../lib/firebase';
import { MAX_LIVES } from '../types';

// Création d'instances (au niveau supérieur)
const genericInterstitial = InterstitialAd.createForAdRequest(getAdUnitId('INTERSTITIAL_GENERIC'), {
  requestNonPersonalizedAdsOnly: true,
});

const levelUpInterstitial = InterstitialAd.createForAdRequest(getAdUnitId('INTERSTITIAL_LEVEL_UP'), {
  requestNonPersonalizedAdsOnly: true,
});

const gameOverInterstitial = InterstitialAd.createForAdRequest(getAdUnitId('INTERSTITIAL_GAME_OVER'), {
  requestNonPersonalizedAdsOnly: true,
});

const rewardedAd = RewardedAd.createForAdRequest(getAdUnitId('REWARDED_EXTRA_LIFE'), {
  requestNonPersonalizedAdsOnly: true,
});

// Interface pour l'état publicitaire
interface AdState {
  interstitialLoaded: boolean;
  gameOverInterstitialLoaded: boolean;
  levelUpInterstitialLoaded: boolean;
  rewardedLoaded: boolean;
  lastInterstitialTime: number;
  hasWatchedRewardedAd: boolean;
}

/**
 * Hook pour gérer les publicités dans le jeu
 */
export function useAds({
  user,
  setUser,
  previousEvent,
  allEvents,
  selectNewEvent,
  resetTimer,
  setIsGameOver,
  setIsLevelPaused,
  setIsWaitingForCountdown,
  setError, // Ajouté pour la gestion d'erreur
}: {
  user: { level: number; points: number; lives: number; };
  setUser: (updater: (prev: any) => any) => void;
  previousEvent: any;
  allEvents: any[];
  selectNewEvent: (events: any[], referenceEvent: any) => Promise<any>;
  resetTimer: (time?: number) => void;
  setIsGameOver: (isGameOver: boolean) => void;
  setIsLevelPaused: (isPaused: boolean) => void;
  setIsWaitingForCountdown: (isWaiting: boolean) => void;
  setError?: (error: string) => void; // Optionnel
}) {
  console.log('[useAds] Initialisation du hook');
  
  const [adState, setAdState] = useState<AdState>({
    interstitialLoaded: false,
    gameOverInterstitialLoaded: false,
    levelUpInterstitialLoaded: false,
    rewardedLoaded: false,
    lastInterstitialTime: 0,
    hasWatchedRewardedAd: false
  });
  
  const [pendingAdDisplay, setPendingAdDisplay] = useState<"interstitial" | "rewarded" | "gameOver" | "levelUp" | null>(null);

  // Gestion des événements publicitaires
  useEffect(() => {
    console.log('[useAds] Configuration des listeners de publicités');
    
    // --- Generic Interstitial ---
    const unsubscribeGenericLoaded = genericInterstitial.addAdEventListener(AdEventType.LOADED, () => {
      console.log('[useAds] Publicité générique chargée');
      setAdState(prev => ({ ...prev, interstitialLoaded: true }));
      FirebaseAnalytics.ad('interstitial', 'loaded', 'generic', user.level);
    });
    
    const unsubscribeGenericError = genericInterstitial.addAdEventListener(AdEventType.ERROR, error => {
      console.log('[useAds] Erreur de chargement de publicité générique:', error.message);
      setAdState(prev => ({ ...prev, interstitialLoaded: false }));
      FirebaseAnalytics.ad('interstitial', 'failed', 'generic', user.level);
      FirebaseAnalytics.error('ad_load_error', `Generic Interstitial: ${error.message}`, 'Game');
      setTimeout(() => { genericInterstitial.load(); }, 5000);
    });
    
    const unsubscribeGenericClosed = genericInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('[useAds] Publicité générique fermée');
      genericInterstitial.load();
      setAdState(prev => ({ ...prev, interstitialLoaded: false, lastInterstitialTime: Date.now() }));
      
      // Réinitialiser le timer après la fermeture de la publicité
      resetTimer(20);
      
      FirebaseAnalytics.ad('interstitial', 'closed', 'generic', user.level);
    });

    // --- LevelUp Interstitial ---
    const unsubscribeLevelUpLoaded = levelUpInterstitial.addAdEventListener(AdEventType.LOADED, () => {
      console.log('[useAds] Publicité level-up chargée');
      setAdState(prev => ({ ...prev, levelUpInterstitialLoaded: true }));
      FirebaseAnalytics.ad('interstitial', 'loaded', 'level_up', user.level);
    });
    
    const unsubscribeLevelUpError = levelUpInterstitial.addAdEventListener(AdEventType.ERROR, error => {
      console.log('[useAds] Erreur de chargement de publicité level-up:', error.message);
      setAdState(prev => ({ ...prev, levelUpInterstitialLoaded: false }));
      FirebaseAnalytics.ad('interstitial', 'failed', 'level_up', user.level);
      FirebaseAnalytics.error('ad_load_error', `LevelUp Interstitial: ${error.message}`, 'Game');
      setTimeout(() => { levelUpInterstitial.load(); }, 5000);
    });
    
    const unsubscribeLevelUpClosed = levelUpInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('[useAds] Publicité level-up fermée');
      levelUpInterstitial.load();
      setAdState(prev => ({ ...prev, levelUpInterstitialLoaded: false, lastInterstitialTime: Date.now() }));
      
      // Réinitialiser le timer après la fermeture de la publicité de niveau
      resetTimer(20);
      
      FirebaseAnalytics.ad('interstitial', 'closed', 'level_up', user.level);
    });

    // --- GameOver Interstitial ---
    const unsubscribeGameOverLoaded = gameOverInterstitial.addAdEventListener(AdEventType.LOADED, () => {
      console.log('[useAds] Publicité game-over chargée');
      setAdState(prev => ({ ...prev, gameOverInterstitialLoaded: true }));
      FirebaseAnalytics.ad('interstitial', 'loaded', 'game_over', user.level);
    });
    
    const unsubscribeGameOverError = gameOverInterstitial.addAdEventListener(AdEventType.ERROR, error => {
      console.log('[useAds] Erreur de chargement de publicité game-over:', error.message);
      setAdState(prev => ({ ...prev, gameOverInterstitialLoaded: false }));
      FirebaseAnalytics.ad('interstitial', 'failed', 'game_over', user.level);
      FirebaseAnalytics.error('ad_load_error', `GameOver Interstitial: ${error.message}`, 'Game');
      setTimeout(() => { gameOverInterstitial.load(); }, 5000);
    });
    
    const unsubscribeGameOverClosed = gameOverInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('[useAds] Publicité game-over fermée');
      gameOverInterstitial.load();
      setAdState(prev => ({ ...prev, gameOverInterstitialLoaded: false, lastInterstitialTime: Date.now() }));
      
      // Réinitialiser le timer après la fermeture de la publicité de fin de partie
      resetTimer(20);
      
      FirebaseAnalytics.ad('interstitial', 'closed', 'game_over', user.level);
    });

    // --- Rewarded Ad ---
    const unsubscribeRewardedLoaded = rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      console.log('[useAds] Publicité récompensée chargée');
      setAdState(prev => ({ ...prev, rewardedLoaded: true }));
      FirebaseAnalytics.ad('rewarded', 'loaded', 'generic', user.level);
    });
    
    const unsubscribeRewardedError = rewardedAd.addAdEventListener(AdEventType.ERROR, error => {
      console.log('[useAds] Erreur de chargement de publicité récompensée:', error.message);
      setAdState(prev => ({ ...prev, rewardedLoaded: false }));
      FirebaseAnalytics.ad('rewarded', 'failed', 'generic', user.level);
      FirebaseAnalytics.error('ad_load_error', `Rewarded Ad: ${error.message}`, 'Game');
      setTimeout(() => { rewardedAd.load(); }, 5000);
    });
    
    const unsubscribeRewardedClosed = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('[useAds] Publicité récompensée fermée');
      rewardedAd.load();
      setAdState(prev => ({ ...prev, rewardedLoaded: false }));
      
      // Réinitialiser le timer après la fermeture de la publicité récompensée
      resetTimer(20);
      
      FirebaseAnalytics.ad('rewarded', 'closed', 'generic', user.level);
    });
    
    const unsubscribeRewardedEarned = rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, reward => {
      console.log('[useAds] Récompense obtenue après la pub:', reward);
      
      // CORRECTION: Utilisation d'une fonction pour s'assurer que la vie est bien ajoutée
      // avant de continuer avec la logique de jeu
      const addLifeAndContinue = async () => {
        // 1. Appliquer la récompense (vie supplémentaire)
        await new Promise<void>((resolve) => {
          setUser(prev => {
            const updatedLives = Math.min(prev.lives + 1, MAX_LIVES);
            console.log('[useAds] Vie ajoutée:', prev.lives, '→', updatedLives);
            return {
              ...prev,
              lives: updatedLives
            };
          });
          // Petit délai pour s'assurer que l'état est bien mis à jour
          setTimeout(resolve, 100);
        });

        // 2. Annuler l'état de Game Over et la pause
        console.log('[useAds] Réinitialisation des états de jeu');
        setIsGameOver(false);
        setIsLevelPaused(false);
        setIsWaitingForCountdown(false);

        // 3. Mettre à jour l'état AdMob pour limiter la publicité récompensée à une seule fois par partie
        setAdState(prev => ({ ...prev, hasWatchedRewardedAd: true }));

        // 4. Log Analytics
        FirebaseAnalytics.ad('rewarded', 'earned_reward', 'generic', user.level);
        FirebaseAnalytics.reward('EXTRA_LIFE', 1, 'ad_reward', 'completed', user.level, user.points);

        // 5. Réinitialiser le timer après avoir obtenu la récompense
        resetTimer(20);

        // 6. Relancer le jeu en sélectionnant un nouvel événement
        if (previousEvent) {
          console.log('[useAds] Sélection d\'un nouvel événement après récompense');
          try {
            const newEventSelected = await selectNewEvent(allEvents, previousEvent);
            if (!newEventSelected) {
              console.error('[useAds] Erreur: Aucun événement sélectionné après récompense');
              setIsGameOver(true);
              setIsLevelPaused(true);
              if (setError) setError('Impossible de continuer le jeu après la publicité');
              FirebaseAnalytics.error('rewarded_resume_null_event', 'New event was null after reward', 'Ad Callback');
            }
          } catch (err) {
            console.error('[useAds] Erreur lors de la sélection d\'événement après récompense:', err);
            setIsGameOver(true);
            setIsLevelPaused(true);
            if (setError) setError('Erreur lors de la reprise après publicité');
            FirebaseAnalytics.error('rewarded_resume_error', err instanceof Error ? err.message : 'Unknown error', 'Ad Callback');
          }
        } else {
          // Cas d'erreur : si previousEvent est null, on ne peut pas continuer proprement.
          console.error('[useAds] Erreur critique: previousEvent est null après récompense');
          setIsGameOver(true);
          setIsLevelPaused(true);
          if (setError) setError('Erreur critique lors de la reprise après publicité');
          FirebaseAnalytics.error('rewarded_resume_critical', 'previousEvent is null after reward', 'Ad Callback');
        }
      };

      // Exécuter la fonction avec gestion des erreurs
      addLifeAndContinue().catch(err => {
        console.error('[useAds] Erreur lors de l\'ajout de vie et continuation:', err);
        if (setError) setError('Erreur lors de la reprise du jeu');
        FirebaseAnalytics.error('rewarded_continuation_error', err instanceof Error ? err.message : 'Unknown error', 'Ad Callback');
      });
    });

    // Chargement initial des publicités
    console.log('[useAds] Chargement initial des publicités');
    genericInterstitial.load();
    levelUpInterstitial.load();
    gameOverInterstitial.load();
    rewardedAd.load();

    // Fonction de nettoyage
    return () => {
      console.log('[useAds] Nettoyage des listeners de publicités');
      unsubscribeGenericLoaded();
      unsubscribeGenericError();
      unsubscribeGenericClosed();
      unsubscribeLevelUpLoaded();
      unsubscribeLevelUpError();
      unsubscribeLevelUpClosed();
      unsubscribeGameOverLoaded();
      unsubscribeGameOverError();
      unsubscribeGameOverClosed();
      unsubscribeRewardedLoaded();
      unsubscribeRewardedError();
      unsubscribeRewardedClosed();
      unsubscribeRewardedEarned();
    };
  }, [
    user.level, 
    user.points, 
    previousEvent, 
    allEvents, 
    selectNewEvent, 
    setUser, 
    resetTimer, 
    setIsGameOver, 
    setIsLevelPaused, 
    setIsWaitingForCountdown,
    setError
  ]);

  // Vérifie si une pub peut être affichée
  const canShowAd = useCallback(() => {
    if (adState.hasWatchedRewardedAd) {
      console.log('[useAds] Pub déjà vue dans cette session, pas de nouvelle pub');
      return false;
    }
    // 3 minutes minimum entre les interstitiels
    if (Date.now() - adState.lastInterstitialTime < 3 * 60 * 1000) {
      console.log('[useAds] Temps minimum entre pubs non atteint');
      return false;
    }
    console.log('[useAds] Publicité autorisée');
    return true;
  }, [adState.hasWatchedRewardedAd, adState.lastInterstitialTime]);

  // Affiche une publicité récompensée si disponible
  const showRewardedAd = useCallback(() => {
    console.log('[useAds] Tentative d\'affichage de publicité récompensée');
    
    if (adState.hasWatchedRewardedAd) {
      console.log('[useAds] Publicité récompensée déjà vue cette session, ignoré');
      return false;
    }

    try {
      if (adState.rewardedLoaded) {
        console.log('[useAds] Affichage de la publicité récompensée');
        FirebaseAnalytics.ad('rewarded', 'triggered', 'user_requested', user.level);
        rewardedAd.show();
        return true;
      } else if (adState.interstitialLoaded) {
        console.log('[useAds] Fallback vers interstitiel générique');
        FirebaseAnalytics.ad('interstitial', 'triggered', 'rewarded_fallback', user.level);
        genericInterstitial.show();
        return true;
      } else {
        console.log('[useAds] Aucune publicité disponible');
        FirebaseAnalytics.ad('rewarded', 'not_available', 'user_requested', user.level);
        return false;
      }
    } catch (error) {
      console.error('[useAds] Erreur lors de l\'affichage de la publicité:', error);
      FirebaseAnalytics.ad(adState.rewardedLoaded ? 'rewarded' : 'interstitial', 'error_show', 'user_requested', user.level);
      FirebaseAnalytics.error('ad_show_error', `Show Ad: ${error instanceof Error ? error.message : 'Unknown error'}`, 'Game');
      
      // Tentative de rechargement
      if (adState.rewardedLoaded) rewardedAd.load();
      else if (adState.interstitialLoaded) genericInterstitial.load();
      return false;
    }
  }, [adState.rewardedLoaded, adState.interstitialLoaded, adState.hasWatchedRewardedAd, user.level]);

  // Affiche une publicité interstitielle générique
  const showGenericInterstitial = useCallback(() => {
    console.log('[useAds] Tentative d\'affichage d\'interstitiel générique');
    
    if (!canShowAd()) {
      return false;
    }
    
    try {
      if (adState.interstitialLoaded) {
        console.log('[useAds] Affichage de l\'interstitiel générique');
        FirebaseAnalytics.ad('interstitial', 'triggered', 'generic', user.level);
        genericInterstitial.show();
        return true;
      }
      return false;
    } catch (error) {
      console.error('[useAds] Erreur lors de l\'affichage de l\'interstitiel:', error);
      FirebaseAnalytics.ad('interstitial', 'error_show', 'generic', user.level);
      FirebaseAnalytics.error('ad_show_error', `Generic Interstitial: ${error instanceof Error ? error.message : 'Unknown error'}`, 'Game');
      genericInterstitial.load();
      return false;
    }
  }, [adState.interstitialLoaded, canShowAd, user.level]);

  // Affiche une publicité interstitielle de fin de niveau
  const showLevelUpInterstitial = useCallback(() => {
    console.log('[useAds] Tentative d\'affichage d\'interstitiel level-up');
    
    if (!canShowAd()) {
      return false;
    }
    
    try {
      if (adState.levelUpInterstitialLoaded) {
        console.log('[useAds] Affichage de l\'interstitiel level-up');
        FirebaseAnalytics.ad('interstitial', 'triggered', 'level_up', user.level);
        levelUpInterstitial.show();
        return true;
      } else if (adState.interstitialLoaded) {
        console.log('[useAds] Fallback vers interstitiel générique pour level-up');
        FirebaseAnalytics.ad('interstitial', 'triggered', 'level_up_fallback', user.level);
        genericInterstitial.show();
        return true;
      }
      return false;
    } catch (error) {
      console.error('[useAds] Erreur lors de l\'affichage de l\'interstitiel level-up:', error);
      FirebaseAnalytics.ad('interstitial', 'error_show', 'level_up', user.level);
      FirebaseAnalytics.error('ad_show_error', `LevelUp Interstitial: ${error instanceof Error ? error.message : 'Unknown error'}`, 'Game');
      levelUpInterstitial.load();
      return false;
    }
  }, [adState.levelUpInterstitialLoaded, adState.interstitialLoaded, canShowAd, user.level]);

  // Affiche une publicité interstitielle de fin de partie
  const showGameOverInterstitial = useCallback(() => {
    console.log('[useAds] Tentative d\'affichage d\'interstitiel game-over');
    
    if (!canShowAd()) {
      return false;
    }
    
    try {
      if (adState.gameOverInterstitialLoaded) {
        console.log('[useAds] Affichage de l\'interstitiel game-over');
        FirebaseAnalytics.ad('interstitial', 'triggered', 'game_over', user.level);
        gameOverInterstitial.show();
        return true;
      } else if (adState.interstitialLoaded) {
        console.log('[useAds] Fallback vers interstitiel générique pour game-over');
        FirebaseAnalytics.ad('interstitial', 'triggered', 'game_over_fallback', user.level);
        genericInterstitial.show();
        return true;
      }
      return false;
    } catch (error) {
      console.error('[useAds] Erreur lors de l\'affichage de l\'interstitiel game-over:', error);
      FirebaseAnalytics.ad('interstitial', 'error_show', 'game_over', user.level);
      FirebaseAnalytics.error('ad_show_error', `GameOver Interstitial: ${error instanceof Error ? error.message : 'Unknown error'}`, 'Game');
      gameOverInterstitial.load();
      return false;
    }
  }, [adState.gameOverInterstitialLoaded, adState.interstitialLoaded, canShowAd, user.level]);

  // Réinitialise l'état des publicités pour une nouvelle partie
  const resetAdsState = useCallback(() => {
    console.log('[useAds] Réinitialisation de l\'état des publicités');
    setAdState(prev => ({
      ...prev,
      hasWatchedRewardedAd: false
    }));
  }, []);

  return {
    adState,
    pendingAdDisplay,
    setPendingAdDisplay,
    canShowAd,
    showRewardedAd,
    showGenericInterstitial,
    showLevelUpInterstitial,
    showGameOverInterstitial,
    resetAdsState // Nouvelle fonction pour réinitialiser l'état
  };
}