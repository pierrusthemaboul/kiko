/************************************************************************************
 * Publicités - Imports, Instances, État et Logique
 * Extrait de useGameLogicA pour une meilleure organisation.
 * NOTE : Ce code N'EST PAS AUTONOME. Il dépend d'états et de fonctions
 *        (comme user, setUser, FirebaseAnalytics, etc.) définis dans useGameLogicA.
 *        Pour le rendre autonome, il faudrait le transformer en un hook
 *        personnalisé (ex: useAdLogic) qui prendrait ces dépendances en paramètres
 *        ou utiliser un gestionnaire d'état global.
 ************************************************************************************/

/* Imports spécifiques aux publicités */
import { useState, useEffect, useCallback } from 'react'; // Nécessaire pour l'état et les effets
import { getAdUnitId } from '../kiko/lib/config/adConfig';
import { FirebaseAnalytics } from '../kiko/lib/firebase'; // <-- Assurez-vous que ce chemin est correct
import {
  InterstitialAd,
  RewardedAd,
  AdEventType,
  RewardedAdEventType,
  TestIds // Peut être retiré si non utilisé directement ici
} from 'react-native-google-mobile-ads';
import { MAX_LIVES } from '../kiko/hooks/types/index'; // Importé car utilisé dans le callback EARNED_REWARD

/* Création d'instances de publicités */
// Nouveau code avec adConfig
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

/* Interface pour l'état publicitaire */
interface AdState {
  interstitialLoaded: boolean;
  gameOverInterstitialLoaded: boolean;
  levelUpInterstitialLoaded: boolean;
  rewardedLoaded: boolean;
  lastInterstitialTime: number;
  hasWatchedRewardedAd: boolean; // Renommé depuis rewardedWatchedThisGame pour clarté
  // Note: adFreeUntil n'était pas utilisé dans l'extrait, ajouté ici pour référence si besoin
  // adFreeUntil?: number;
}

/* Logique de gestion des publicités (à intégrer dans un hook ou une fonction) */

// Déclaration de l'état (serait DANS le hook useGameLogicA ou un nouveau hook useAdLogic)
/*
const [adState, setAdState] = useState<AdState>({
  interstitialLoaded: false,
  gameOverInterstitialLoaded: false,
  levelUpInterstitialLoaded: false,
  rewardedLoaded: false,
  lastInterstitialTime: 0,
  hasWatchedRewardedAd: false
});
const [pendingAdDisplay, setPendingAdDisplay] = useState<"interstitial" | "rewarded" | "gameOver" | "levelUp" | null>(null);
*/

// --- useEffect pour les listeners de publicités (serait DANS le hook useGameLogicA ou useAdLogic) ---
// NOTE : Ce useEffect dépend de variables externes comme `user`, `setUser`, `setIsGameOver`, etc.
//        Il faudrait les passer en arguments ou dépendances si extrait dans un hook séparé.
/*
useEffect(() => {
    // --- Récupération de dépendances externes (exemple) ---
    // const userLevel = user.level;
    // const userPoints = user.points;
    // const currentPreviousEvent = previousEvent; // Nécessite un accès stable
    // const currentAllEvents = allEvents; // Nécessite un accès stable
    // const doSelectNewEvent = selectNewEvent; // Callback

    // --- Generic Interstitial ---
    const unsubscribeGenericLoaded = genericInterstitial.addAdEventListener(AdEventType.LOADED, () => {
      setAdState(prev => ({ ...prev, interstitialLoaded: true }));
      FirebaseAnalytics.ad('interstitial', 'loaded', 'generic', user.level); // Utilise user.level
    });
    const unsubscribeGenericError = genericInterstitial.addAdEventListener(AdEventType.ERROR, error => {
      setAdState(prev => ({ ...prev, interstitialLoaded: false }));
      FirebaseAnalytics.ad('interstitial', 'failed', 'generic', user.level); // Utilise user.level
      FirebaseAnalytics.error('ad_load_error', `Generic Interstitial: ${error.message}`, 'Game');
      setTimeout(() => { genericInterstitial.load(); }, 5000);
    });
    const unsubscribeGenericClosed = genericInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
      genericInterstitial.load();
      setAdState(prev => ({ ...prev, interstitialLoaded: false, lastInterstitialTime: Date.now() }));
      FirebaseAnalytics.ad('interstitial', 'closed', 'generic', user.level); // Utilise user.level
    });

    // --- LevelUp Interstitial ---
    const unsubscribeLevelUpLoaded = levelUpInterstitial.addAdEventListener(AdEventType.LOADED, () => {
       setAdState(prev => ({ ...prev, levelUpInterstitialLoaded: true }));
       FirebaseAnalytics.ad('interstitial', 'loaded', 'level_up', user.level); // Utilise user.level
    });
    const unsubscribeLevelUpError = levelUpInterstitial.addAdEventListener(AdEventType.ERROR, error => {
       setAdState(prev => ({ ...prev, levelUpInterstitialLoaded: false }));
       FirebaseAnalytics.ad('interstitial', 'failed', 'level_up', user.level); // Utilise user.level
       FirebaseAnalytics.error('ad_load_error', `LevelUp Interstitial: ${error.message}`, 'Game');
       setTimeout(() => { levelUpInterstitial.load(); }, 5000);
    });
    const unsubscribeLevelUpClosed = levelUpInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
       levelUpInterstitial.load();
       setAdState(prev => ({ ...prev, levelUpInterstitialLoaded: false, lastInterstitialTime: Date.now() }));
       FirebaseAnalytics.ad('interstitial', 'closed', 'level_up', user.level); // Utilise user.level
    });

    // --- GameOver Interstitial ---
    const unsubscribeGameOverLoaded = gameOverInterstitial.addAdEventListener(AdEventType.LOADED, () => {
       setAdState(prev => ({ ...prev, gameOverInterstitialLoaded: true }));
       FirebaseAnalytics.ad('interstitial', 'loaded', 'game_over', user.level); // Utilise user.level
    });
    const unsubscribeGameOverError = gameOverInterstitial.addAdEventListener(AdEventType.ERROR, error => {
       setAdState(prev => ({ ...prev, gameOverInterstitialLoaded: false }));
       FirebaseAnalytics.ad('interstitial', 'failed', 'game_over', user.level); // Utilise user.level
       FirebaseAnalytics.error('ad_load_error', `GameOver Interstitial: ${error.message}`, 'Game');
       setTimeout(() => { gameOverInterstitial.load(); }, 5000);
    });
    const unsubscribeGameOverClosed = gameOverInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
       gameOverInterstitial.load();
       setAdState(prev => ({ ...prev, gameOverInterstitialLoaded: false, lastInterstitialTime: Date.now() }));
       FirebaseAnalytics.ad('interstitial', 'closed', 'game_over', user.level); // Utilise user.level
    });

    // --- Rewarded Ad ---
    const unsubscribeRewardedLoaded = rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
        setAdState(prev => ({ ...prev, rewardedLoaded: true }));
        FirebaseAnalytics.ad('rewarded', 'loaded', 'generic', user.level); // Utilise user.level
    });
    const unsubscribeRewardedError = rewardedAd.addAdEventListener(AdEventType.ERROR, error => {
        setAdState(prev => ({ ...prev, rewardedLoaded: false }));
        FirebaseAnalytics.ad('rewarded', 'failed', 'generic', user.level); // Utilise user.level
        FirebaseAnalytics.error('ad_load_error', `Rewarded Ad: ${error.message}`, 'Game');
        setTimeout(() => { rewardedAd.load(); }, 5000);
    });
    const unsubscribeRewardedClosed = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
        rewardedAd.load();
        setAdState(prev => ({ ...prev, rewardedLoaded: false }));
        FirebaseAnalytics.ad('rewarded', 'closed', 'generic', user.level); // Utilise user.level
    });
    const unsubscribeRewardedEarned = rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, reward => {
      // Dépendances externes nécessaires ici : setUser, setIsGameOver, setIsLevelPaused, setIsWaitingForCountdown, setIsCountdownActive, selectNewEvent, allEvents, previousEvent, setError
      // 1. Appliquer la récompense
      setUser(prev => ({ ...prev, lives: Math.min(prev.lives + 1, MAX_LIVES) }));
      // 2. Annuler Game Over / Pause
      setIsGameOver(false);
      setIsLevelPaused(false);
      setIsWaitingForCountdown(false);
      setIsCountdownActive(false);
      // 3. Mettre à jour état AdMob
      setAdState(prev => ({ ...prev, hasWatchedRewardedAd: true }));
      // 4. Log Analytics
      FirebaseAnalytics.ad('rewarded', 'earned_reward', 'generic', user.level); // Utilise user.level
      FirebaseAnalytics.reward('EXTRA_LIFE', 1, 'ad_reward', 'completed', user.level, user.points); // Utilise user.level, user.points
      // 5. Relancer le jeu
      if (previousEvent) { // Dépend de previousEvent
           selectNewEvent(allEvents, previousEvent); // Dépend de selectNewEvent, allEvents, previousEvent
      } else {
           setError("Erreur critique lors de la reprise de la partie après la publicité."); // Dépend de setError
           setIsGameOver(true); // Dépend de setIsGameOver
           setIsLevelPaused(true); // Dépend de setIsLevelPaused
           FirebaseAnalytics.error('rewarded_resume_critical', 'previousEvent is null after reward', 'Ad Callback');
      }
  });

    // Chargement initial
    genericInterstitial.load();
    levelUpInterstitial.load();
    gameOverInterstitial.load();
    rewardedAd.load();

    // Nettoyage
    return () => {
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
// Dépendances externes à gérer si extrait : user.level, user.points, previousEvent, allEvents, selectNewEvent, setUser, setIsGameOver, setIsLevelPaused, setIsWaitingForCountdown, setIsCountdownActive, setError
}, [user.level, user.points, previousEvent, allEvents, selectNewEvent]); // Exemple de dépendances
*/


// --- Fonction pour vérifier si une pub peut être affichée (serait DANS le hook ou exportée) ---
// Dépend de adState
/*
const canShowAd = useCallback(() => {
  // Logique dépendante de l'état adState interne
  if (adState.hasWatchedRewardedAd) {
    return false;
  }
  if (Date.now() - adState.lastInterstitialTime < 3 * 60 * 1000) { // 3 minutes
    return false;
  }
  return true;
}, [adState.hasWatchedRewardedAd, adState.lastInterstitialTime]);
*/

// --- Fonction pour afficher une pub récompensée (serait DANS le hook ou exportée) ---
// Dépend de adState et user.level
/*
const showRewardedAd = useCallback(() => {
  try {
    if (adState.rewardedLoaded) {
      FirebaseAnalytics.ad('rewarded', 'triggered', 'user_requested', user.level); // Utilise user.level
      rewardedAd.show();
      return true;
    } else if (adState.interstitialLoaded) { // Fallback
      FirebaseAnalytics.ad('interstitial', 'triggered', 'rewarded_fallback', user.level); // Utilise user.level
      genericInterstitial.show();
      return true;
    } else {
      FirebaseAnalytics.ad('rewarded', 'not_available', 'user_requested', user.level); // Utilise user.level
      return false;
    }
  } catch (error) {
    FirebaseAnalytics.ad(adState.rewardedLoaded ? 'rewarded' : 'interstitial', 'error_show', 'user_requested', user.level); // Utilise user.level
    FirebaseAnalytics.error('ad_show_error', `Show Ad: ${error.message}`, 'Game');
    if (adState.rewardedLoaded) rewardedAd.load();
    else if (adState.interstitialLoaded) genericInterstitial.load();
    return false;
  }
}, [adState.rewardedLoaded, adState.interstitialLoaded, user.level]); // Exemple dépendances
*/


/* --- Snippets de logique publicitaire DANS D'AUTRES FONCTIONS --- */

// Dans initGame:
// setAdState(prev => ({ ...prev, hasWatchedRewardedAd: false }));

// Dans handleChoice (bonne réponse, fin de niveau):
/*
if (prev.level === 1 || prev.level === 6 || prev.level % 5 === 0) { // Exemple: niveau 1, 6, 11, 16...
  setPendingAdDisplay("levelUp"); // Marquer qu'une pub de level up est attendue
  FirebaseAnalytics.ad('interstitial', 'triggered', 'level_up', prev.level); // Track trigger
}
*/

// Dans handleLevelUp:
/*
if (pendingAdDisplay === "levelUp" && canShowAd()) {
  if (adState.levelUpInterstitialLoaded) {
    try {
      levelUpInterstitial.show();
    } catch (error) {
      FirebaseAnalytics.ad('interstitial', 'error_show', 'level_up', nextLevel -1);
      FirebaseAnalytics.error('ad_show_error', `LevelUp Interstitial: ${error.message}`, 'handleLevelUp');
      levelUpInterstitial.load(); // Recharger en cas d'erreur d'affichage
    }
  } else if (adState.interstitialLoaded) { // Fallback générique
    FirebaseAnalytics.ad('interstitial', 'triggered', 'level_up_fallback', nextLevel -1);
    try {
        genericInterstitial.show();
    } catch (error) {
        FirebaseAnalytics.ad('interstitial', 'error_show', 'level_up_fallback', nextLevel -1);
        FirebaseAnalytics.error('ad_show_error', `Generic Fallback Ad: ${error.message}`, 'handleLevelUp');
        genericInterstitial.load(); // Recharger
    }
  } else {
    FirebaseAnalytics.ad('interstitial', 'not_available', 'level_up', nextLevel -1);
  }
}
setPendingAdDisplay(null); // Réinitialiser l'indicateur
*/

// Dans endGame:
/*
setTimeout(() => {
  if (canShowAd()) {
    FirebaseAnalytics.ad('interstitial', 'triggered', 'game_over', user.level);
    if (adState.gameOverInterstitialLoaded) {
      try {
        gameOverInterstitial.show();
      } catch (error) {
        FirebaseAnalytics.ad('interstitial', 'error_show', 'game_over', user.level);
        FirebaseAnalytics.error('ad_show_error', `GameOver Interstitial: ${error.message}`, 'endGame');
        gameOverInterstitial.load(); // Recharger
      }
    } else if (adState.interstitialLoaded) { // Fallback générique
      FirebaseAnalytics.ad('interstitial', 'triggered', 'game_over_fallback', user.level);
      genericInterstitial.show(); // Pas de try/catch ici dans l'original, pourrait être ajouté
    } else {
      FirebaseAnalytics.ad('interstitial', 'not_available', 'game_over', user.level);
    }
  }
}, 1500); // Délai avant d'afficher la pub de fin de partie
*/


/* --- Partie du retour du hook useGameLogicA relative aux pubs --- */
/*
return {
  // ... autres retours du hook
  showRewardedAd, // Fonction pour déclencher la pub récompensée depuis l'UI
  // État publicitaire simplifié pour l'UI
  adState: {
    hasRewardedAd: adState.rewardedLoaded, // L'UI sait si une pub récompensée *pourrait* être dispo
    hasWatchedRewardedAd: adState.hasWatchedRewardedAd, // L'UI sait si le joueur a DÉJÀ vu la pub récompensée cette partie
  }
  // ... autres retours du hook
};
*/

// Exportations (si transformé en module/hook autonome)
// export { AdState, showRewardedAd, canShowAd, initializeAds /*, etc. */ };