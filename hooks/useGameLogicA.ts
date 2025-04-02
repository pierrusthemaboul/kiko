/************************************************************************************
 * 1. HOOK PRINCIPAL entier : useGameLogicA
 *
 * 1.A. Description
 *     Hook de logique de jeu principal. Gère la logique de sélection d'événements,
 *     le scoring, la gestion du niveau, l'audio, les récompenses, la fin de partie
 *     et désormais l'intégration d'un système publicitaire complet avec Firebase Analytics.
 *
 * 1.B. Paramètres
 *     @param {string} initialEvent - Identifiant éventuel d'un événement initial.
 *
 * 1.C. Retour
 *     {object} - Ensemble d'états et de fonctions utiles au jeu (user, événements, pub, etc.).
 ************************************************************************************/

/* 1.D. Imports et Types (TOUS les imports sont ici, au niveau supérieur) */

// 1.D.1. Librairies / Modules
import { useState, useEffect, useCallback, useRef } from 'react'; // Ajout de useRef ici
import { AppState, Animated, Dimensions, Platform } from 'react-native'; // Ajout de Platform
import { supabase } from '../lib/supabase/supabaseClients'; // Assurez-vous que ce chemin est correct
import useRewards from './useRewards'; // Assurez-vous que ce chemin est correct
import useAudio from './useAudio'; // Assurez-vous que ce chemin est correct
import {
  Event,
  User,
  ExtendedLevelConfig,
  RewardType,
  MAX_LIVES,
  HistoricalPeriod,
  LevelEventSummary,
  CategoryMastery,
  HistoricalPeriodStats,
  ActiveBonus
} from './types'; // Assurez-vous que ce chemin et les types sont corrects
import { LEVEL_CONFIGS } from './levelConfigs'; // Assurez-vous que ce chemin est correct

// --- MODIFICATION : Import de FirebaseAnalytics et suppression de l'ancien import ---
// import analytics from '@react-native-firebase/analytics'; // <-- SUPPRIMER CETTE LIGNE
import { FirebaseAnalytics } from '../lib/firebase'; // <-- AJOUTER CET IMPORT (Vérifier le chemin)
// ------------------------------------------------------------------------------------

// ------------------ INTÉGRATION DE LA PUBLICITÉ AVANCÉE (Importations ici) ------------------
import {
  InterstitialAd,
  RewardedAd,
  AdEventType,
  RewardedAdEventType,
  TestIds
} from 'react-native-google-mobile-ads';

// Création d'instances (Déclarations de constantes ici, au niveau supérieur)
const genericInterstitial = InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL, {
  requestNonPersonalizedAdsOnly: true,
});
const levelUpInterstitial = InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL, {
  requestNonPersonalizedAdsOnly: true,
});
const gameOverInterstitial = InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL, {
  requestNonPersonalizedAdsOnly: true,
});
const rewardedAd = RewardedAd.createForAdRequest(TestIds.REWARDED, {
  requestNonPersonalizedAdsOnly: true,
});

// Interface pour l'état publicitaire (Définition d'interface ici)
interface AdState {
  interstitialLoaded: boolean;
  gameOverInterstitialLoaded: boolean;
  levelUpInterstitialLoaded: boolean;
  rewardedLoaded: boolean;
  lastInterstitialTime: number;
  adFreeUntil: number;
}
// ------------------------------------------------------------------

// Nouvelle interface pour l'historique des événements par niveau (Définition d'interface ici)
interface LevelHistory {
  level: number;
  events: LevelEventSummary[];
}

// Constante globale (Déclaration ici)
const screenWidth = Dimensions.get('window').width;

// Constantes pour limiter les événements antiques
const ANTIQUE_EVENTS_LIMITS = {
  1: 1, // Niveau 1: max 1 événement antique
  2: 2, // Niveau 2: max 2 événements antiques
  3: 3, // Niveau 3: max 3 événements antiques
  4: 4, // Niveau 4: max 4 événements antiques
  5: 5, // Niveau 5 et plus: max 5 événements antiques
};

// Année limite pour les événements "antiques"
const ANTIQUE_YEAR_THRESHOLD = 500;

/* 1.E. Hook : useGameLogicA (Début de la fonction hook) */

/**
 * Hook de logique de jeu (quiz historique) intégrant le système publicitaire et Firebase Analytics.
 * @function useGameLogicA
 * @param {string} initialEvent - Optionnel, événement de départ.
 * @returns {Object} - Toutes les données et fonctions nécessaires au jeu.
 */
export function useGameLogicA(initialEvent?: string) { // Rendu initialEvent optionnel

  /* --- Début des déclarations INTERNES au hook (useState, hooks custom, etc.) --- */

  /* 1.E.1. (Récompenses - système) */
  const {
    currentReward,
    checkRewards,
    completeRewardAnimation,
    updateRewardPosition
  } = useRewards({
    onRewardEarned: (reward) => {
      if (!reward.targetPosition) {
        if (reward.type === RewardType.EXTRA_LIFE) {
          reward.targetPosition = { x: screenWidth * 0.45, y: 50 };
        } else {
          reward.targetPosition = { x: 80, y: 30 };
        }
      }
      applyReward(reward); // applyReward appellera FirebaseAnalytics.reward
    },
  });

  /* 1.E.2. (Audio - sons) */
  const {
    playCorrectSound,
    playIncorrectSound,
    playLevelUpSound,
    playCountdownSound,
    playGameOverSound,
  } = useAudio();

  /* 1.E.3. (Profil utilisateur de base) */
  const [user, setUser] = useState<User>({
    name: '',
    points: 0,
    lives: MAX_LIVES,
    level: 1,
    eventsCompletedInLevel: 0,
    totalEventsCompleted: 0,
    streak: 0,
    maxStreak: 0,
    performanceStats: { // Ces stats pourraient être dépréciées si tu utilises Firebase
      typeSuccess: {},
      periodSuccess: {},
      overallAccuracy: 0,
      averageResponseTime: 0
    }
  });

  /* 1.E.4. (États du jeu) */
  const [activeBonus, setActiveBonus] = useState<ActiveBonus[]>([]);
  const [periodStats, setPeriodStats] = useState<Record<HistoricalPeriod, HistoricalPeriodStats>>({}); // Pourrait être déprécié
  const [categoryMastery, setCategoryMastery] = useState<Record<string, CategoryMastery>>({}); // Pourrait être déprécié
  const [eventHistory, setEventHistory] = useState<{ type: string; period: string; success: boolean; }[]>([]); // Pourrait être déprécié
  const [performanceStats, setPerformanceStats] = useState<{ // Pourrait être déprécié
    typeSuccess: Record<string, number>;
    periodSuccess: Record<string, number>;
    overallAccuracy: number;
  }>({
    typeSuccess: {},
    periodSuccess: {},
    overallAccuracy: 0
  });

  /* 1.E.5. (Événements) */
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [previousEvent, setPreviousEvent] = useState<Event | null>(null);
  const [newEvent, setNewEvent] = useState<Event | null>(null);
  const [usedEvents, setUsedEvents] = useState<Set<string>>(new Set());

  /* NOUVEAU: Compteur pour limiter les événements antiques */
  const [antiqueEventsCount, setAntiqueEventsCount] = useState<number>(0);

  /* 1.E.6. (Interface utilisateur) */
  const [timeLeft, setTimeLeft] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);

  /* 1.E.7. (Chargement d'image) */
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  /* 1.E.8. (Affichage de dates, correctitude) */
  const [showDates, setShowDates] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | undefined>(undefined);

  /* 1.E.9. (Progression) */
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(0);

  /* 1.E.10. (Contrôle du jeu) */
  const [isCountdownActive, setIsCountdownActive] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [isLevelPaused, setIsLevelPaused] = useState(true);
  const [currentLevelConfig, setCurrentLevelConfig] = useState<ExtendedLevelConfig>({
    ...LEVEL_CONFIGS[1], // Start with level 1 config
    eventsSummary: [] // Ensure eventsSummary is initialized
  });
  const [leaderboardsReady, setLeaderboardsReady] = useState(false);
  const [isWaitingForCountdown, setIsWaitingForCountdown] = useState(false);

  /* 1.E.11. (Classement) */
  const [leaderboards, setLeaderboards] = useState({ daily: [], monthly: [], allTime: [] });

  /* 1.E.12. (Événements de niveau) */
  const [currentLevelEvents, setCurrentLevelEvents] = useState<LevelEventSummary[]>([]);

  /* 1.E.13. (Fallback countdown) */
  const [fallbackCountdown, setFallbackCountdown] = useState<number>(() => {
    return Math.floor(Math.random() * (25 - 12 + 1)) + 12;
  });

  /* 1.E.14. (Animation - streak bar) */
  const [progressAnim] = useState(() => new Animated.Value(0));

  const [levelCompletedEvents, setLevelCompletedEvents] = useState<LevelEventSummary[]>([]);

  /* ---- Nouveau : Historique des niveaux complet ---- */
  const [levelsHistory, setLevelsHistory] = useState<LevelHistory[]>([]);
  /* ----------------------------------------------------- */

  const [forcedJumpEventCount, setForcedJumpEventCount] = useState<number>(() => {
    return Math.floor(Math.random() * (19 - 12 + 1)) + 12;
  });

  const [eventCount, setEventCount] = useState<number>(0);
  const [hasFirstForcedJumpHappened, setHasFirstForcedJumpHappened] = useState<boolean>(false);

  /* ******* INTÉGRATION DE LA PUBLICITÉ AVANCÉE (Logique INTERNE au hook ici) ******* */
  // Nouvel état publicitaire et type d'annonce en attente d'affichage
  const [adState, setAdState] = useState<AdState>({
    interstitialLoaded: false,
    gameOverInterstitialLoaded: false,
    levelUpInterstitialLoaded: false,
    rewardedLoaded: false,
    lastInterstitialTime: 0,
    adFreeUntil: 0,
  });
  const [pendingAdDisplay, setPendingAdDisplay] = useState<"interstitial" | "rewarded" | "gameOver" | "levelUp" | null>(null);

  // --- MODIFICATION : Utilisation de FirebaseAnalytics.ad dans useEffect ---
  // Gestionnaire d'événements amélioré pour les publicités
  useEffect(() => {
    // --- LOGS POUR VÉRIFIER LES VALEURS DES TYPES D'ÉVÉNEMENTS ---
    console.log('--- [useGameLogicA] Ad Event Type Values ---');
    console.log('AdEventType.LOADED:', AdEventType.LOADED);
    console.log('AdEventType.ERROR:', AdEventType.ERROR);
    console.log('AdEventType.CLOSED:', AdEventType.CLOSED);
    console.log('RewardedAdEventType.LOADED:', RewardedAdEventType.LOADED);
    console.log('RewardedAdEventType.ERROR:', RewardedAdEventType.ERROR);
    console.log('RewardedAdEventType.CLOSED:', RewardedAdEventType.CLOSED);
    console.log('RewardedAdEventType.EARNED_REWARD:', RewardedAdEventType.EARNED_REWARD);
    console.log('---------------------------------------------');

    // --- Generic Interstitial ---
    const unsubscribeGenericLoaded = genericInterstitial.addAdEventListener(AdEventType.LOADED, () => {
      console.log('[useGameLogicA] Generic interstitial loaded');
      setAdState(prev => ({ ...prev, interstitialLoaded: true }));
      FirebaseAnalytics.ad('interstitial', 'loaded', 'generic', user.level); // Track ad loaded
    });
    const unsubscribeGenericError = genericInterstitial.addAdEventListener(AdEventType.ERROR, error => {
      console.error('[useGameLogicA] Generic interstitial error:', error);
      setAdState(prev => ({ ...prev, interstitialLoaded: false }));
      FirebaseAnalytics.ad('interstitial', 'failed', 'generic', user.level); // Track ad failed
      FirebaseAnalytics.error('ad_load_error', `Generic Interstitial: ${error.message}`, 'Game');
      setTimeout(() => { genericInterstitial.load(); }, 5000);
    });
    const unsubscribeGenericClosed = genericInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('[useGameLogicA] Generic interstitial closed');
      genericInterstitial.load();
      setAdState(prev => ({ ...prev, interstitialLoaded: false, lastInterstitialTime: Date.now() }));
      FirebaseAnalytics.ad('interstitial', 'closed', 'generic', user.level); // Track ad closed
    });

    // --- LevelUp Interstitial ---
    const unsubscribeLevelUpLoaded = levelUpInterstitial.addAdEventListener(AdEventType.LOADED, () => {
       console.log('[useGameLogicA] LevelUp interstitial loaded');
       setAdState(prev => ({ ...prev, levelUpInterstitialLoaded: true }));
       FirebaseAnalytics.ad('interstitial', 'loaded', 'level_up', user.level);
    });
    const unsubscribeLevelUpError = levelUpInterstitial.addAdEventListener(AdEventType.ERROR, error => {
       console.error('[useGameLogicA] LevelUp interstitial error:', error);
       setAdState(prev => ({ ...prev, levelUpInterstitialLoaded: false }));
       FirebaseAnalytics.ad('interstitial', 'failed', 'level_up', user.level);
       FirebaseAnalytics.error('ad_load_error', `LevelUp Interstitial: ${error.message}`, 'Game');
       setTimeout(() => { levelUpInterstitial.load(); }, 5000);
    });
    const unsubscribeLevelUpClosed = levelUpInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
       console.log('[useGameLogicA] LevelUp interstitial closed');
       levelUpInterstitial.load();
       setAdState(prev => ({ ...prev, levelUpInterstitialLoaded: false, lastInterstitialTime: Date.now() }));
       FirebaseAnalytics.ad('interstitial', 'closed', 'level_up', user.level);
    });

    // --- GameOver Interstitial ---
    const unsubscribeGameOverLoaded = gameOverInterstitial.addAdEventListener(AdEventType.LOADED, () => {
       console.log('[useGameLogicA] GameOver interstitial loaded');
       setAdState(prev => ({ ...prev, gameOverInterstitialLoaded: true }));
       FirebaseAnalytics.ad('interstitial', 'loaded', 'game_over', user.level);
    });
    const unsubscribeGameOverError = gameOverInterstitial.addAdEventListener(AdEventType.ERROR, error => {
       console.error('[useGameLogicA] GameOver interstitial error:', error);
       setAdState(prev => ({ ...prev, gameOverInterstitialLoaded: false }));
       FirebaseAnalytics.ad('interstitial', 'failed', 'game_over', user.level);
       FirebaseAnalytics.error('ad_load_error', `GameOver Interstitial: ${error.message}`, 'Game');
       setTimeout(() => { gameOverInterstitial.load(); }, 5000);
    });
    const unsubscribeGameOverClosed = gameOverInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
       console.log('[useGameLogicA] GameOver interstitial closed');
       gameOverInterstitial.load();
       setAdState(prev => ({ ...prev, gameOverInterstitialLoaded: false, lastInterstitialTime: Date.now() }));
       FirebaseAnalytics.ad('interstitial', 'closed', 'game_over', user.level);
    });

    // --- Rewarded Ad ---
    const unsubscribeRewardedLoaded = rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
        console.log('[useGameLogicA] Rewarded ad loaded');
        setAdState(prev => ({ ...prev, rewardedLoaded: true }));
        FirebaseAnalytics.ad('rewarded', 'loaded', 'generic', user.level);
    });
    const unsubscribeRewardedError = rewardedAd.addAdEventListener(AdEventType.ERROR, error => { // Utilisation de AdEventType.ERROR semble correct ici
        console.error('[useGameLogicA] Rewarded ad error:', error);
        setAdState(prev => ({ ...prev, rewardedLoaded: false }));
        FirebaseAnalytics.ad('rewarded', 'failed', 'generic', user.level);
        FirebaseAnalytics.error('ad_load_error', `Rewarded Ad: ${error.message}`, 'Game');
        setTimeout(() => { rewardedAd.load(); }, 5000);
    });
    const unsubscribeRewardedClosed = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => { // Utilisation de AdEventType.CLOSED semble correct ici
        console.log('[useGameLogicA] Rewarded ad closed');
        rewardedAd.load(); // Recharger après fermeture
        setAdState(prev => ({ ...prev, rewardedLoaded: false }));
        FirebaseAnalytics.ad('rewarded', 'closed', 'generic', user.level);
    });
    const unsubscribeRewardedEarned = rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, reward => {
        console.log('[useGameLogicA] User earned reward:', reward);
        // Appliquer la récompense (vie supplémentaire)
        setUser(prev => ({
          ...prev,
          lives: Math.min(prev.lives + 1, MAX_LIVES)
        }));
        setAdState(prev => ({ ...prev, adFreeUntil: Date.now() + 5 * 60 * 1000 })); // 5 min sans pub
        FirebaseAnalytics.ad('rewarded', 'earned_reward', 'generic', user.level);
        // Tracker aussi la récompense spécifique obtenue
        FirebaseAnalytics.reward('EXTRA_LIFE', 1, 'ad_reward', 'completed', user.level, user.points);
    });

    // Chargement initial des publicités
    console.log('[useGameLogicA] Initial ad loading...');
    genericInterstitial.load();
    levelUpInterstitial.load();
    gameOverInterstitial.load();
    rewardedAd.load();

    // Fonction de nettoyage
    return () => {
      console.log('[useGameLogicA] Cleaning up ad listeners...');
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
  // La dépendance à user.level et user.points est ajoutée car ces valeurs sont utilisées
  // dans les appels FirebaseAnalytics.ad et FirebaseAnalytics.reward à l'intérieur de l'effet.
  }, [user.level, user.points]);
  // --- FIN MODIFICATION useEffect Pubs ---


  // Vérifie si une pub peut être affichée
  const canShowAd = useCallback(() => {
    const now = Date.now();
    if (now < adState.adFreeUntil) {
      console.log('[useGameLogicA] canShowAd: false - in ad-free period');
      return false;
    }
    // 3 minutes minimum entre les interstitiels
    if (now - adState.lastInterstitialTime < 3 * 60 * 1000) {
      console.log('[useGameLogicA] canShowAd: false - last ad shown too recently');
      return false;
    }
    console.log('[useGameLogicA] canShowAd: true');
    return true;
  }, [adState.adFreeUntil, adState.lastInterstitialTime]);

  // Affiche une publicité récompensée si disponible
  const showRewardedAd = useCallback(() => {
    console.log('[useGameLogicA] showRewardedAd called - rewardedLoaded:', adState.rewardedLoaded);
    try {
      if (adState.rewardedLoaded) {
        console.log('[useGameLogicA] Attempting to show rewarded ad');
        FirebaseAnalytics.ad('rewarded', 'triggered', 'user_requested', user.level); // Track trigger
        rewardedAd.show();
        return true;
      } else if (adState.interstitialLoaded) { // Fallback vers interstitiel générique
        console.log('[useGameLogicA] Rewarded ad not loaded, falling back to generic interstitial');
        FirebaseAnalytics.ad('interstitial', 'triggered', 'rewarded_fallback', user.level); // Track trigger
        genericInterstitial.show();
        return true;
      } else {
        console.log('[useGameLogicA] No rewarded or generic interstitial ad available to show');
        FirebaseAnalytics.ad('rewarded', 'not_available', 'user_requested', user.level); // Track not available
        return false;
      }
    } catch (error) {
      console.error('[useGameLogicA] Error showing ad in showRewardedAd:', error);
      FirebaseAnalytics.ad(adState.rewardedLoaded ? 'rewarded' : 'interstitial', 'error_show', 'user_requested', user.level); // Track show error
      FirebaseAnalytics.error('ad_show_error', `Show Ad: ${error.message}`, 'Game');
      // Tentative de rechargement
      if (adState.rewardedLoaded) rewardedAd.load();
      else if (adState.interstitialLoaded) genericInterstitial.load();
      return false;
    }
  }, [adState.rewardedLoaded, adState.interstitialLoaded, user.level]); // dépend de user.level pour le tracking
  /* ******* FIN INTÉGRATION PUBLICITÉ AVANCÉE ******* */

  // --- MODIFICATION : Utilisation de FirebaseAnalytics.appState dans useEffect ---
  /* Effet pour suivre l'état de l'application */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState.match(/inactive|background/)) {
        // Appliquer un malus : on retire 5 secondes au compte à rebours si l'app va en arrière-plan
        // Note: 'inactive' sur iOS précède souvent 'background'
        if(nextAppState === 'background') {
            setTimeLeft((prevTime) => Math.max(prevTime - 5, 0));
        }
        // Tracking de la mise en arrière-plan
        FirebaseAnalytics.appState('background', timeLeft, user.level, user.points);
      } else if (nextAppState === 'active') {
        // Tracking du retour au premier plan
        FirebaseAnalytics.appState('active', undefined, user.level, user.points);
      }
    });
    return () => {
      subscription.remove();
    };
  // timeLeft, user.level, user.points sont nécessaires pour les paramètres de FirebaseAnalytics.appState
  }, [timeLeft, user.level, user.points]);
  // --- FIN MODIFICATION useEffect AppState ---

  /* 1.F. Effet d'initialisation */
  useEffect(() => {
    initGame();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // initGame est défini avec useCallback mais le faire tourner une seule fois au montage est l'intention ici.

  // 1.G. Compte à rebours
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;

    if (isCountdownActive && timeLeft > 0 && !isLevelPaused && !isGameOver) {
      timer = setInterval(() => {
        setTimeLeft((prevTime) => {
          const nextTime = prevTime - 1;
          if (nextTime <= 0) { // Utiliser <= 0 pour être sûr de déclencher handleTimeout
            clearInterval(timer); // Arrêter le timer avant d'appeler handleTimeout
            handleTimeout();
            return 0;
          }
          if (nextTime === 4) { // Jouer le son à 4 secondes restantes (car il dure 1s)
            playCountdownSound();
          }
          return nextTime;
        });
      }, 1000);
    }

    // Nettoyage si le timer est actif mais les conditions ne sont plus remplies
    // Ou si le composant est démonté
    return () => {
      if (timer) clearInterval(timer);
    };
  // handleTimeout est maintenant dans les dépendances car il est appelé depuis l'intervalle
  }, [isCountdownActive, isLevelPaused, isGameOver, timeLeft, playCountdownSound, handleTimeout]);

  /*
   *  Ajout d'un effet pour suivre l'évolution de levelsHistory.
   *  Utile pour voir si l'état se met bien à jour.
   */
  useEffect(() => {
    console.log('[useGameLogicA] levelsHistory updated:', levelsHistory);
  }, [levelsHistory]);

  // Effet pour réinitialiser le compteur d'événements antiques lors du changement de niveau
  useEffect(() => {
    // Réinitialiser le compteur d'événements antiques quand le niveau change
    setAntiqueEventsCount(0);
    console.log(`[useGameLogicA] Niveau changé à ${user.level}, compteur d'événements antiques réinitialisé`);
  }, [user.level]);

/* 1.H. Regroupement des fonctions internes */

  // Fonction pour obtenir la période historique (déplacée ici pour être utilisée avant sa définition dans useCallback)
  const getPeriod = useCallback((date: string): HistoricalPeriod => {
    try {
      const year = new Date(date).getFullYear();
      if (year < 500) return HistoricalPeriod.ANTIQUITY;
      if (year < 1500) return HistoricalPeriod.MIDDLE_AGES;
      if (year < 1800) return HistoricalPeriod.RENAISSANCE;
      if (year < 1900) return HistoricalPeriod.NINETEENTH;
      if (year < 2000) return HistoricalPeriod.TWENTIETH;
      return HistoricalPeriod.TWENTYFIRST;
    } catch {
      // Fallback raisonnable si la date est invalide
      return HistoricalPeriod.TWENTIETH;
    }
  }, []);

  // Fonction qui vérifie si un événement est antique (avant 500)
  const isAntiqueEvent = useCallback((event: Event): boolean => {
    try {
      const year = new Date(event.date).getFullYear();
      return year < ANTIQUE_YEAR_THRESHOLD;
    } catch {
      return false; // En cas d'erreur, on considère que ce n'est pas un événement antique
    }
  }, []);

  // Fonction qui vérifie si on peut encore ajouter un événement antique
  const canAddAntiqueEvent = useCallback((level: number): boolean => {
    // Déterminer la limite pour ce niveau
    const currentLimit = level <= 5 ? ANTIQUE_EVENTS_LIMITS[level as keyof typeof ANTIQUE_EVENTS_LIMITS] : 5;
    
    // Vérifier si on est sous la limite
    return antiqueEventsCount < currentLimit;
  }, [antiqueEventsCount]);

  // ---------------------- Nouvelle fonction : finalizeCurrentLevelHistory ----------------------
  // Modifiée pour accepter en paramètre les événements à finaliser et mettre à jour l'historique global
  const finalizeCurrentLevelHistory = useCallback((eventsToFinalize: LevelEventSummary[]) => {
    console.log('[useGameLogicA] finalizeCurrentLevelHistory called, eventsToFinalize length:', eventsToFinalize.length);

    if (!eventsToFinalize || eventsToFinalize.length === 0) {
      console.log('[useGameLogicA] No events to finalize; returning.');
      return;
    }
    const currentLvl = user.level; // Utilise user.level de l'état actuel
    setLevelsHistory((prevHistory) => {
      const existingLevelIndex = prevHistory.findIndex((lh) => lh.level === currentLvl);
      if (existingLevelIndex > -1) {
        // Si le niveau existe déjà (ne devrait pas arriver si on finalise une seule fois), on met à jour
        const updatedHistory = [...prevHistory];
        updatedHistory[existingLevelIndex] = {
           level: currentLvl,
           // Concaténer au cas où, mais normalement on remplace/ajoute une seule fois
           events: [...updatedHistory[existingLevelIndex].events, ...eventsToFinalize]
         };
        console.log('[useGameLogicA] Updating existing levelHistory entry for level', currentLvl);
        return updatedHistory;
      } else {
        // Ajoute une nouvelle entrée pour le niveau terminé
        const newHistoryEntry = { level: currentLvl, events: eventsToFinalize };
        console.log('[useGameLogicA] Adding new levelHistory entry:', newHistoryEntry);
        return [...prevHistory, newHistoryEntry];
      }
    });
    // On ne vide PAS levelCompletedEvents ici, il sert pour l'affichage du modal de fin de niveau
    console.log('[useGameLogicA] finalizeCurrentLevelHistory completed.');
  }, [user.level]); // Dépend de user.level pour savoir quel niveau finaliser

  // --- MODIFICATION : Utilisation de FirebaseAnalytics dans initGame ---
  // 1.H.1. initGame
  const initGame = useCallback(async () => {
    console.log('[useGameLogicA] initGame started');
    try {
      setLoading(true);
      setError(null); // Réinitialiser l'erreur
      setIsGameOver(false); // Réinitialiser game over
      setLeaderboardsReady(false); // Réinitialiser leaderboards
      setLevelsHistory([]); // Vider l'historique des niveaux précédents
      setUsedEvents(new Set()); // Vider les événements utilisés
      setAntiqueEventsCount(0); // Réinitialiser le compteur d'événements antiques
      setUser(prev => ({ // Réinitialiser l'utilisateur (sauf nom et high score)
        ...prev,
        points: 0,
        lives: MAX_LIVES,
        level: 1,
        eventsCompletedInLevel: 0,
        totalEventsCompleted: 0, // Réinitialiser aussi ? À discuter.
        streak: 0,
        maxStreak: 0, // Réinitialiser maxStreak pour la nouvelle partie
      }));
      setStreak(0); // Réinitialiser l'état de streak local
      setCurrentLevelEvents([]); // Vider les événements du niveau en cours
      setLevelCompletedEvents([]); // Vider les événements complétés

      await fetchUserData(); // Récupérer nom/high score

      const initialConfig = LEVEL_CONFIGS[1];
      if (!initialConfig) {
        throw new Error('Configuration du niveau 1 manquante');
      }
      // S'assurer que eventsSummary est bien un tableau vide au début
      setCurrentLevelConfig({ ...initialConfig, eventsSummary: [] });

      console.log('[useGameLogicA] Fetching events from Supabase...');
      const { data: events, error: eventsError } = await supabase
        .from('evenements')
        .select('*')
        .order('date', { ascending: true }); // Charger tous les événements une fois

      if (eventsError) throw eventsError;
      if (!events?.length) throw new Error('Aucun événement disponible dans la base');

      // Filtrer les événements valides une seule fois
      const validEvents = events.filter(
        (event): event is Event => // Type guard pour s'assurer que les champs existent
          !!event.id &&
          !!event.date &&
          !!event.titre &&
          !!event.illustration_url &&
          event.niveau_difficulte !== null && event.niveau_difficulte !== undefined &&
          !!event.types_evenement && Array.isArray(event.types_evenement)
      );
      setAllEvents(validEvents);
      console.log(`[useGameLogicA] Total valid events loaded: ${validEvents.length}`);

      if (validEvents.length < 2) throw new Error("Pas assez d'événements valides disponibles");

      // --- Sélection des événements initiaux (Niveau 1) ---
      const level1Events = validEvents.filter((e) => e.niveau_difficulte === 1);
      if (level1Events.length < 2) throw new Error("Pas assez d'événements de niveau 1 disponibles");

      // Pour éviter trop d'événements antiques au début, on commence par un événement non-antique
      const nonAntiqueLevel1Events = level1Events.filter(event => !isAntiqueEvent(event));
      
      // Si nous avons des événements non-antiques de niveau 1, choisissons-en un
      // Sinon, utilisez n'importe quel événement de niveau 1
      const firstIndex = nonAntiqueLevel1Events.length > 0 
        ? Math.floor(Math.random() * nonAntiqueLevel1Events.length) 
        : Math.floor(Math.random() * level1Events.length);
      
      const firstEvent = nonAntiqueLevel1Events.length > 0 
        ? nonAntiqueLevel1Events[firstIndex] 
        : level1Events[firstIndex];

      const referenceYear = new Date(firstEvent.date).getFullYear();

      // Filtre pour le deuxième événement (différent et écart > 500 ans)
      // Privilégier les non-antiques pour le niveau 1
      let potentialSecondEvents = level1Events.filter(
        (e) => e.id !== firstEvent.id && Math.abs(new Date(e.date).getFullYear() - referenceYear) >= 500
      );

      // Si nous avons trop peu d'options, assouplir la contrainte d'écart temporel
      if (potentialSecondEvents.length < 3) {
        potentialSecondEvents = level1Events.filter(
          (e) => e.id !== firstEvent.id && Math.abs(new Date(e.date).getFullYear() - referenceYear) >= 300
        );
      }

      if (potentialSecondEvents.length === 0) {
        // Fallback : prendre n'importe quel autre événement de niveau 1
        console.warn("No second event found with >500 year gap for level 1, selecting randomly.");
        const fallbackSecondEvents = level1Events.filter(e => e.id !== firstEvent.id);
        if (fallbackSecondEvents.length === 0) {
           // Si vraiment il n'y a qu'un seul event niveau 1, on le duplique (cas très improbable)
           console.error("Only one level 1 event available! This should not happen.");
           setPreviousEvent(firstEvent);
           setNewEvent(firstEvent); // Dupliquer pour éviter crash, mais logique à revoir
           setUsedEvents(new Set([firstEvent.id]));
        } else {
           const secondIndex = Math.floor(Math.random() * fallbackSecondEvents.length);
           let secondEvent = fallbackSecondEvents[secondIndex];
           setPreviousEvent(firstEvent);
           setNewEvent(secondEvent);
           setUsedEvents(new Set([firstEvent.id, secondEvent.id]));
           
           // Mise à jour du compteur d'événements antiques
           if (isAntiqueEvent(firstEvent)) {
             setAntiqueEventsCount(prev => prev + 1);
           }
           if (isAntiqueEvent(secondEvent)) {
             setAntiqueEventsCount(prev => prev + 1);
           }
        }
      } else {
        // Privilégier un événement non-antique comme second événement
        const nonAntiqueSecondEvents = potentialSecondEvents.filter(event => !isAntiqueEvent(event));
        
        const secondEvent = nonAntiqueSecondEvents.length > 0
          ? nonAntiqueSecondEvents[Math.floor(Math.random() * nonAntiqueSecondEvents.length)]
          : potentialSecondEvents[Math.floor(Math.random() * potentialSecondEvents.length)];
        
        setPreviousEvent(firstEvent);
        setNewEvent(secondEvent);
        setUsedEvents(new Set([firstEvent.id, secondEvent.id]));
        
        // Mise à jour du compteur d'événements antiques
        if (isAntiqueEvent(firstEvent)) {
          setAntiqueEventsCount(prev => prev + 1);
        }
        if (isAntiqueEvent(secondEvent)) {
          setAntiqueEventsCount(prev => prev + 1);
        }
      }

      setIsLevelPaused(false); // Démarrer le jeu
      setIsCountdownActive(true); // Démarrer le compte à rebours
      setTimeLeft(20); // Temps initial

      // --- Utilisation de FirebaseAnalytics ---
      FirebaseAnalytics.gameStarted(user.name, !user.name || user.name.startsWith('Voyageur'), 1); // Track game started
      FirebaseAnalytics.levelStarted(1, initialConfig.name || 'Niveau 1', initialConfig.eventsNeeded, 0); // Track level 1 started

      console.log('[useGameLogicA] initGame finished successfully.');

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erreur inconnue lors de l'initialisation";
      console.error('[useGameLogicA] Error during initGame:', err);
      setError(errorMsg);
      setIsGameOver(true); // Mettre en game over si l'init échoue

      // --- Utilisation de FirebaseAnalytics ---
      FirebaseAnalytics.error('game_initialization', errorMsg, 'Initialization');
    } finally {
      setLoading(false);
    }
  }, [fetchUserData, user.name, isAntiqueEvent]); // Ajouter fetchUserData, user.name et isAntiqueEvent comme dépendances
  // --- FIN MODIFICATION initGame ---

  // 1.H.2. fetchUserData
  const fetchUserData = useCallback(async () => {
    // Cette fonction récupère le nom et le high score, elle n'a pas besoin de tracking direct ici.
    // Le tracking de connexion/invité est géré dans index.tsx ou là où la session change.
    console.log('[useGameLogicA] fetchUserData called');
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      // Si erreur d'authentification, on considère l'utilisateur comme invité pour ce hook
      if (authError || !authUser) {
        console.log('[useGameLogicA] No authenticated user found or auth error.');
         setUser((prev) => ({
            ...prev,
            name: prev.name || '' // Garde le nom si déjà défini (ex: invité)
         }));
         setHighScore(0); // Pas de high score pour invité ou erreur
        return;
      }

      // Utilisateur authentifié trouvé
      console.log('[useGameLogicA] Authenticated user found:', authUser.id);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('display_name, high_score')
        .eq('id', authUser.id)
        .single();

      if (profileError) {
        console.error('[useGameLogicA] Error fetching profile:', profileError);
        // Garder l'état user actuel mais sans high score
        setUser((prev) => ({ ...prev, name: prev.name || '' }));
        setHighScore(0);
        // Tracker l'erreur de profil
        FirebaseAnalytics.error('profile_fetch_error', profileError.message, 'fetchUserData');
        return;
      }

      if (profileData) {
        console.log('[useGameLogicA] Profile data fetched:', profileData);
        setUser((prev) => ({
          ...prev,
          // Utilise le display_name du profil, fallback sur l'email si besoin (improbable)
          name: profileData.display_name || authUser.email || '',
        }));
        setHighScore(profileData.high_score || 0);
        // Mettre à jour la propriété utilisateur dans Analytics (peut être redondant si fait dans index.tsx)
        FirebaseAnalytics.setUserProperty('display_name', profileData.display_name);
      } else {
         console.warn('[useGameLogicA] Profile not found for user:', authUser.id);
         // Fallback si le profil n'existe pas (ne devrait pas arriver avec les triggers Supabase)
         setUser((prev) => ({ ...prev, name: authUser.email || '' }));
         setHighScore(0);
      }

    } catch (error) {
      // Erreur inattendue
      console.error('[useGameLogicA] Unexpected error in fetchUserData:', error);
      setUser((prev) => ({ ...prev, name: prev.name || '' }));
      setHighScore(0);
      FirebaseAnalytics.error('unexpected_fetch_user', error instanceof Error ? error.message : 'Unknown', 'fetchUserData');
    }
  }, []); // Pas de dépendances externes nécessaires pour useCallback ici

  // 1.H.3. handleImageLoad
  const handleImageLoad = useCallback(() => {
    // Cette fonction est purement UI, pas de tracking nécessaire ici en général.
    setIsImageLoaded(true);
    if (!isLevelPaused) {
      setIsCountdownActive(true); // Réactive le compte à rebours si l'image est chargée et le jeu n'est pas en pause
    }
  }, [isLevelPaused]);

  // 1.H.4.a. getTimeDifference
  const getTimeDifference = useCallback((date1: string, date2: string): number => {
    try {
      // Vérifier si les dates sont valides avant de créer des objets Date
      if (!date1 || !date2 || isNaN(new Date(date1).getTime()) || isNaN(new Date(date2).getTime())) {
        console.warn(`Invalid date encountered in getTimeDifference: d1=${date1}, d2=${date2}`);
        return Infinity; // Retourner Infinity si une date est invalide
      }
      const d1 = new Date(date1).getTime();
      const d2 = new Date(date2).getTime();
      if (!isFinite(d1) || !isFinite(d2)) return Infinity; // Vérif supplémentaire
      const diffInMilliseconds = Math.abs(d1 - d2);
      const diffInYears = diffInMilliseconds / (365.25 * 24 * 60 * 60 * 1000);
      return diffInYears;
    } catch (error) {
      console.error("Error in getTimeDifference:", error);
      return Infinity;
    }
  }, []);


  // 1.H.4.c. updateGameState (Pas de tracking direct ici, le tracking se fait à la réponse/sélection)
  const updateGameState = useCallback(async (selectedEvent: Event) => {
    try {
      setUsedEvents((prev) => new Set([...prev, selectedEvent.id]));
      setNewEvent(selectedEvent);
      setIsImageLoaded(false); // Réinitialiser pour la nouvelle image
      setShowDates(false); // Cacher les dates pour la nouvelle question
      setIsCorrect(undefined); // Réinitialiser l'état de correction

      setIsCountdownActive(false); // Arrêter le compte à rebours précédent
      setTimeLeft(20); // Réinitialiser le temps pour la nouvelle question

      // Mise à jour du compteur d'événements antiques si nécessaire
      if (isAntiqueEvent(selectedEvent)) {
        setAntiqueEventsCount(prev => prev + 1);
        console.log(`[useGameLogicA] Événement antique ajouté, compteur: ${antiqueEventsCount + 1}`);
      }

      const period = getPeriod(selectedEvent.date);
      // Mise à jour de l'historique interne (peut être déprécié si non utilisé)
      setEventHistory((prev) => [
        ...prev,
        {
          type: selectedEvent.types_evenement?.[0] || 'unknown', // Utiliser le premier type ou 'unknown'
          period,
          success: false // Sera mis à jour lors de la réponse
        }
      ]);
    } catch (err) {
       console.error("Error in updateGameState:", err);
       // On pourrait tracker une erreur ici si elle est critique
       FirebaseAnalytics.error('update_game_state_error', err instanceof Error ? err.message : 'Unknown', 'updateGameState');
    }
  }, [getPeriod, isAntiqueEvent, antiqueEventsCount]); // Dépend de getPeriod, isAntiqueEvent et antiqueEventsCount

  // 1.H.4.d.0 getNextForcedJumpIncrement (Logique interne, pas de tracking)
  function getNextForcedJumpIncrement(year: number): number {
    if (year < 500) return Math.floor(Math.random() * (5 - 1 + 1)) + 1;
    if (year < 700) return Math.floor(Math.random() * (9 - 6 + 1)) + 6;
    if (year < 1000) return Math.floor(Math.random() * (9 - 6 + 1)) + 6;
    if (year < 1500) return Math.floor(Math.random() * (9 - 6 + 1)) + 6;
    if (year < 1800) return Math.floor(Math.random() * (11 - 7 + 1)) + 7;
    if (year <= 2024) return Math.floor(Math.random() * (19 - 12 + 1)) + 12;
    return 15; // Fallback
  }

  // 1.H.4.d. selectNewEvent (Logique complexe de sélection, avec intégration de la logique de limitation d'événements antiques)
  const selectNewEvent = useCallback(
    async (events: Event[], referenceEvent: Event | null) => { // referenceEvent peut être null au début
      console.log('[useGameLogicA] selectNewEvent called');
      if (!events || events.length === 0) {
        console.error("selectNewEvent: No events available!");
        setError("Aucun événement disponible pour continuer.");
        setIsGameOver(true); // Marquer comme game over si pas d'événements
        FirebaseAnalytics.error('no_events_available', 'All events used or empty list', 'selectNewEvent');
        return null;
      }
      if (!referenceEvent) {
         console.error("selectNewEvent: referenceEvent is null!");
         // Gérer ce cas: peut-être sélectionner un événement aléatoire?
         // Pour l'instant, on retourne null et on signale une erreur.
         setError("Erreur interne: événement de référence manquant.");
         setIsGameOver(true);
         FirebaseAnalytics.error('null_reference_event', 'Reference event was null in selectNewEvent', 'selectNewEvent');
         return null;
      }

      setEventCount((prev) => prev + 1);
      const localEventCount = eventCount + 1; // Utilise la valeur mise à jour localement

      const referenceYear = new Date(referenceEvent.date).getFullYear();
      if (isNaN(referenceYear)) {
          console.error("selectNewEvent: Invalid reference date!", referenceEvent);
          setError("Erreur interne: date de référence invalide.");
          setIsGameOver(true);
          FirebaseAnalytics.error('invalid_reference_date', `Invalid date: ${referenceEvent.date}`, 'selectNewEvent');
          return null;
      }

      // --- Logique de saut temporel forcé ---
      const checkTimeJump = (): number => {
        let jumpDistance = 0;
        const isForcedJumpTriggered = localEventCount === forcedJumpEventCount;

        if (isForcedJumpTriggered) {
          const forcedDistances = [500, 750, 1000];
          jumpDistance = forcedDistances[Math.floor(Math.random() * forcedDistances.length)];
          console.log(`[useGameLogicA] Forced jump triggered! Count: ${localEventCount}, Distance: ${jumpDistance}`);
        }

        // Logique de sauts contextuels (peut être simplifiée ou ajustée)
        if (referenceYear < 500 && localEventCount <= 5) {
           const chosen = [750, 1000][Math.floor(Math.random() * 2)];
           jumpDistance = Math.max(jumpDistance, chosen);
        } else if (referenceYear >= 500 && referenceYear < 1000 && localEventCount >= 7 && localEventCount <= 12) {
           const chosen = [500, 1000][Math.random() < 0.5 ? 0 : 1];
           jumpDistance = Math.max(jumpDistance, chosen);
        } else if (referenceYear >= 1000 && referenceYear < 1800 && localEventCount >= 7 && localEventCount <= 12) {
           const chosen = [400, 750][Math.random() < 0.5 ? 0 : 1];
           jumpDistance = Math.max(jumpDistance, chosen);
        }
        // Pas de logique spécifique pour 1800+ ici, seul le saut forcé compte

        if (jumpDistance > 0 && !isForcedJumpTriggered) {
            console.log(`[useGameLogicA] Contextual jump triggered! Ref Year: ${referenceYear}, Count: ${localEventCount}, Distance: ${jumpDistance}`);
        }

        return jumpDistance;
      };

      const timeJump = checkTimeJump();

      if (timeJump > 0) {
        const isForcedJump = localEventCount === forcedJumpEventCount;
        let mainDirection: "past" | "future" = Math.random() < 0.5 ? "past" : "future"; // Direction aléatoire par défaut
        // Première fois qu'un saut forcé arrive? Aller dans le passé.
        if (isForcedJump && !hasFirstForcedJumpHappened) {
          mainDirection = "past";
          console.log("[useGameLogicA] First forced jump: forcing 'past' direction.");
        }

        const getTargetEvents = (direction: "past" | "future", dist: number): Event[] => {
          const targetYear = direction === "past" ? referenceYear - dist : referenceYear + dist;
          const comparison = direction === "past" ? (y: number) => y <= targetYear : (y: number) => y >= targetYear;
          
          // Filtrer les événements déjà utilisés
          const unusedEvents = events.filter(evt => !usedEvents.has(evt.id));
          
          // Vérifier si l'événement est antique et si nous pouvons encore en ajouter
          const filteredEvents = unusedEvents.filter(evt => {
            if (isAntiqueEvent(evt) && !canAddAntiqueEvent(user.level)) {
              return false; // Exclure les événements antiques si on a atteint la limite
            }
            
            try {
              const y = new Date(evt.date).getFullYear();
              return !isNaN(y) && comparison(y);
            } catch {
              return false;
            }
          });
          
          return filteredEvents;
        };

        let possibleEvents = getTargetEvents(mainDirection, timeJump);
        console.log(`[useGameLogicA] Time jump search: ${mainDirection}, dist ${timeJump}. Found ${possibleEvents.length} events.`);

        // Si la direction principale ne donne rien, essayer l'autre
        if (possibleEvents.length === 0) {
          const alternateDirection = mainDirection === "past" ? "future" : "past";
          console.log(`[useGameLogicA] No events in main direction, trying alternate: ${alternateDirection}`);
          possibleEvents = getTargetEvents(alternateDirection, timeJump);
          console.log(`[useGameLogicA] Alternate direction search found ${possibleEvents.length} events.`);
        }

        if (possibleEvents.length > 0) {
          // NOUVELLE LOGIQUE: Préférer les événements moins fréquemment utilisés
          
          // 1. Classer les événements en fonction de leur frequency_score
          const eventsWithFrequencyScore = possibleEvents.map(evt => {
            const frequencyScore = (evt as any).frequency_score || 0;
            return { event: evt, frequencyScore };
          });
          
          // 2. Trier par frequency_score croissant (préférer les moins fréquents)
          eventsWithFrequencyScore.sort((a, b) => a.frequencyScore - b.frequencyScore);
          
          // 3. Prendre les 30% des événements les moins utilisés
          const topPercentage = 0.3; // Prendre les 30% supérieurs
          const numTopEvents = Math.max(1, Math.ceil(eventsWithFrequencyScore.length * topPercentage));
          const topEvents = eventsWithFrequencyScore.slice(0, numTopEvents);
          
          // 4. Choisir aléatoirement parmi ces événements moins fréquents
          const selectedEventWithScore = topEvents[Math.floor(Math.random() * topEvents.length)];
          const chosenEvent = selectedEventWithScore.event;
          
          console.log(`[useGameLogicA] Time jump successful! Selected event: ${chosenEvent.id} - ${chosenEvent.titre} (frequency score: ${selectedEventWithScore.frequencyScore})`);

          await updateGameState(chosenEvent); // Met à jour l'état avec le nouvel événement

          // Mise à jour Supabase (optionnel, peut ralentir)
          supabase.from("evenements").update({
              frequency_score: selectedEventWithScore.frequencyScore + 1,
              last_used: new Date().toISOString(),
          }).eq("id", chosenEvent.id).then(({ error }) => {
              if (error) console.error("Supabase update error (time jump):", error);
          });

          // Si c'était un saut forcé, calculer le prochain
          if (isForcedJump) {
            if (!hasFirstForcedJumpHappened) setHasFirstForcedJumpHappened(true);
            const landingYear = new Date(chosenEvent.date).getFullYear();
            const nextIncrement = getNextForcedJumpIncrement(landingYear);
            const newForcedCount = localEventCount + nextIncrement;
            setForcedJumpEventCount(newForcedCount);
            console.log(`[useGameLogicA] Next forced jump set to event count: ${newForcedCount} (increment: ${nextIncrement})`);
          }
          return chosenEvent; // Retourne l'événement choisi
        } else {
           console.warn(`[useGameLogicA] Time jump failed! No suitable events found for distance ${timeJump}. Falling back to normal selection.`);
           // Si le saut échoue, on continue avec la sélection normale ci-dessous
        }
      }

      // --- Sélection Normale (si pas de saut temporel réussi) ---
      const config = LEVEL_CONFIGS[user.level];
      if (!config) {
          console.error(`selectNewEvent: Config not found for level ${user.level}`);
          setError(`Configuration manquante pour le niveau ${user.level}`);
          setIsGameOver(true);
          FirebaseAnalytics.error('missing_level_config', `Config not found for level ${user.level}`, 'selectNewEvent');
          return null;
      }

      // Calcul dynamique de l'écart temporel basé sur la date de référence
      const calculateDynamicTimeGap = (refDate: string) => {
        const nowY = new Date().getFullYear();
        const refY = new Date(refDate).getFullYear();
        // Proximité = 1 pour les événements récents, diminue pour les anciens (jusqu'à 0.2)
        const proximityFactor = Math.max(0.2, Math.min(1, 1 - (nowY - refY) / 2000)); // Ex: /2000 ans

        const baseGap = config.timeGap.base * proximityFactor;
        // Assurer un minimum et un maximum raisonnables
        const minGap = Math.max(10, config.timeGap.minimum * proximityFactor); // Ex: min 10 ans
        const maxGap = Math.max(minGap + 50, baseGap * 1.5); // Ex: max au moins 50 ans de plus que min

        // console.log(`[DEBUG] TimeGap - RefY: ${refY}, Prox: ${proximityFactor.toFixed(2)}, Base: ${baseGap.toFixed(0)}, Min: ${minGap.toFixed(0)}, Max: ${maxGap.toFixed(0)}`);
        return { base: baseGap, min: minGap, max: maxGap };
      };

      const timeGap = calculateDynamicTimeGap(referenceEvent.date);

      // Fonction de scoring pour évaluer les événements candidats
const scoreEvent = (evt: Event, timeDiff: number): number => {
  const randomFactor = 0.9 + Math.random() * 0.2; // Légère randomisation (0.9 - 1.1)

  // Score basé sur l'écart temporel (proche de l'idéal = mieux)
  const idealGap = timeGap.base;
  let gapScore = 0;
  if (idealGap > 0) { // Éviter division par zéro
      // Pénalise plus si on est TROP loin que si on est TROP près
      const diffRatio = Math.abs(timeDiff - idealGap) / idealGap;
      gapScore = 35 * Math.max(0, 1 - diffRatio) * randomFactor;
  }

  // Score basé sur la difficulté (proche de l'idéal = mieux)
  // MODIFICATION: Adapter l'échelle pour 7 niveaux de difficulté au lieu de 3
  const idealDifficulty = Math.min(7, Math.max(1, Math.ceil(user.level / 2)));
  // Cette formule donne:
  // - Niveau 1-2: difficulté idéale = 1
  // - Niveau 3-4: difficulté idéale = 2
  // - Niveau 5-6: difficulté idéale = 3
  // - Niveau 7-8: difficulté idéale = 4
  // - Niveau 9-10: difficulté idéale = 5
  // - Niveau 11-12: difficulté idéale = 6
  // - Niveau 13+: difficulté idéale = 7
  
  let difficultyScore = 0;
  if(evt.niveau_difficulte !== null && evt.niveau_difficulte !== undefined){
      // MODIFICATION: Diviseur 7 au lieu de 3 pour répartir sur l'ensemble des niveaux
      difficultyScore = 25 * (1 - Math.abs(evt.niveau_difficulte - idealDifficulty) / 7) * randomFactor;
  }

  // NOUVEAU: Bonus inversement proportionnel à la fréquence d'utilisation
  const frequencyScore = (evt as any).frequency_score || 0;
  // Plus le frequency_score est élevé, plus le malus est important (jusqu'à -20 points)
  const frequencyMalus = Math.min(20, frequencyScore * 2);
  
  // Bonus de variation (pour éviter de répéter les mêmes types/périodes ?) - Simple pour l'instant
  const variationBonus = Math.random() * 10;

  // Malus pour les événements antiques si on approche de la limite
  const antiqueLimit = user.level <= 5 ? ANTIQUE_EVENTS_LIMITS[user.level as keyof typeof ANTIQUE_EVENTS_LIMITS] : 5;
  const antiqueMalus = isAntiqueEvent(evt) && antiqueEventsCount >= (antiqueLimit - 1) ? 50 : 0;

  return Math.max(0, gapScore + difficultyScore + variationBonus - frequencyMalus - antiqueMalus);
};


      const availableEvents = events.filter((e) => !usedEvents.has(e.id));
      if(availableEvents.length === 0) {
          console.error("selectNewEvent: No more available events after filtering used ones!");
          setError("Vous avez exploré tous les événements disponibles !");
          setIsGameOver(true);
          FirebaseAnalytics.error('no_more_available_events', 'All events have been used', 'selectNewEvent');
          return null;
      }

      // NOUVELLE LOGIQUE: Filtrer les événements antiques si on a atteint la limite
      const canAddMoreAntiques = canAddAntiqueEvent(user.level);
      const filteredAvailableEvents = canAddMoreAntiques 
        ? availableEvents 
        : availableEvents.filter(e => !isAntiqueEvent(e));
      
      if (filteredAvailableEvents.length === 0) {
        console.warn("No more non-antique events available! Using all available events.");
        // Si on n'a vraiment plus d'événements non-antiques, on utilise quand même les antiques
        // (mieux que de ne plus avoir d'événements du tout)
      }
      
      const eventsToScore = filteredAvailableEvents.length > 0 ? filteredAvailableEvents : availableEvents;

      // Calculer le score pour les événements disponibles
      let scoredEvents = eventsToScore.map((e) => {
          const diff = getTimeDifference(e.date, referenceEvent.date);
          const score = scoreEvent(e, diff);
          return { event: e, timeDiff: diff, score: score };
        })
        // Filtrer par écart temporel acceptable
        .filter(({ timeDiff }) => timeDiff >= timeGap.min && timeDiff <= timeGap.max)
        .sort((a, b) => b.score - a.score); // Trier par score décroissant

      console.log(`[useGameLogicA] Found ${scoredEvents.length} events within time gap [${timeGap.min.toFixed(0)}, ${timeGap.max.toFixed(0)}]`);

      // Si aucun événement ne correspond à l'écart strict, élargir la recherche
      if (scoredEvents.length === 0) {
        console.warn("[useGameLogicA] No events in strict time gap, relaxing constraints...");
        const relaxedMin = timeGap.min * 0.5;
        const relaxedMax = timeGap.max * 1.5;
        scoredEvents = eventsToScore
          .map(e => ({ event: e, timeDiff: getTimeDifference(e.date, referenceEvent.date), score: scoreEvent(e, getTimeDifference(e.date, referenceEvent.date)) }))
          .filter(({ timeDiff }) => timeDiff >= relaxedMin && timeDiff <= relaxedMax)
          .sort((a, b) => b.score - a.score);
        console.log(`[useGameLogicA] Found ${scoredEvents.length} events within relaxed gap [${relaxedMin.toFixed(0)}, ${relaxedMax.toFixed(0)}]`);
      }

      // Si toujours aucun événement, prendre le meilleur parmi tous les disponibles (hors utilisés)
      if (scoredEvents.length === 0) {
          console.error("[useGameLogicA] No events found even with relaxed constraints! Selecting best scored available event.");
          
          // Dernier recours: utiliser tous les événements disponibles (antiques inclus si nécessaire)
          scoredEvents = availableEvents
              .map(e => ({ event: e, timeDiff: getTimeDifference(e.date, referenceEvent.date), score: scoreEvent(e, getTimeDifference(e.date, referenceEvent.date)) }))
              .sort((a, b) => b.score - a.score);
              
          if (scoredEvents.length === 0) { // Cas extrême: plus aucun événement dispo
              setError("Erreur critique: Impossible de sélectionner un nouvel événement.");
              setIsGameOver(true);
              FirebaseAnalytics.error('event_selection_failed', 'No scorable events left', 'selectNewEvent');
              return null;
          }
      }

      // Sélection finale: prendre un des X meilleurs événements (ex: top 5)
      // Augmenter le pool de sélection pour plus de variété
      const selectionPoolSize = Math.min(5, scoredEvents.length);
      const topEvents = scoredEvents.slice(0, selectionPoolSize);
      const selectedScoredEvent = topEvents[Math.floor(Math.random() * topEvents.length)];
      const selectedEvent = selectedScoredEvent.event;

      console.log(`[useGameLogicA] Final selection: ${selectedEvent.id} - ${selectedEvent.titre} (Score: ${selectedScoredEvent.score.toFixed(2)}, TimeDiff: ${selectedScoredEvent.timeDiff.toFixed(0)})`);
      
      if (isAntiqueEvent(selectedEvent)) {
        console.log(`[useGameLogicA] Selected an antique event. Current count: ${antiqueEventsCount}, max for level: ${user.level <= 5 ? ANTIQUE_EVENTS_LIMITS[user.level as keyof typeof ANTIQUE_EVENTS_LIMITS] : 5}`);
      }

      await updateGameState(selectedEvent);
      // setIsCountdownActive(true); // Géré par handleImageLoad ou délai

      // Mise à jour Supabase (optionnel)
      const newFrequencyScore = ((selectedEvent as any).frequency_score || 0) + 1;
      supabase.from("evenements").update({
          frequency_score: newFrequencyScore,
          last_used: new Date().toISOString(),
      }).eq("id", selectedEvent.id).then(({ error }) => {
          if (error) console.error("Supabase update error (normal selection):", error);
      });

      // Décrémenter le compteur de fallback (si utilisé)
      setFallbackCountdown((prev) => Math.max(0, prev - 1));

      return selectedEvent;
    },
    [
      user.level, // Pour config et difficulté cible
      usedEvents,
      fallbackCountdown,
      updateGameState, // Fonction interne
      getTimeDifference, // Fonction interne
      getPeriod, // Fonction interne (utilisée indirectement via scoreEvent si on ajoutait période)
      eventCount, // Pour les sauts forcés
      forcedJumpEventCount, // Pour les sauts forcés
      hasFirstForcedJumpHappened, // Pour la direction du premier saut forcé
      isAntiqueEvent, // Pour vérifier les événements antiques
      canAddAntiqueEvent, // Pour vérifier si on peut ajouter un événement antique
      antiqueEventsCount // Pour le compteur d'événements antiques
    ]
  );

  // 1.H.5. updatePerformanceStats (Peut être déprécié si non utilisé pour l'UI)
  const updatePerformanceStats = useCallback((type: string, period: string, success: boolean) => {
    setPerformanceStats((prev) => {
      // Logique de calcul interne, pas de tracking ici
      const typeAttempts = (prev.typeSuccess[type] ? prev.typeSuccess[type][1] : 0) + 1;
      const typeSuccesses = (prev.typeSuccess[type] ? prev.typeSuccess[type][0] : 0) + (success ? 1 : 0);
      const periodAttempts = (prev.periodSuccess[period] ? prev.periodSuccess[period][1] : 0) + 1;
      const periodSuccesses = (prev.periodSuccess[period] ? prev.periodSuccess[period][0] : 0) + (success ? 1 : 0);
      const totalAttempts = eventHistory.length; // Utiliser eventHistory.length avant la mise à jour
      const totalSuccesses = eventHistory.filter(e => e.success).length + (success ? 1 : 0);

      return {
        typeSuccess: {
          ...prev.typeSuccess,
          [type]: [typeSuccesses, typeAttempts], // Stocke [successes, attempts]
        },
        periodSuccess: {
          ...prev.periodSuccess,
          [period]: [periodSuccesses, periodAttempts], // Stocke [successes, attempts]
        },
        overallAccuracy: totalAttempts > 0 ? totalSuccesses / totalAttempts : 0,
      };
    });
  }, [eventHistory]); // Dépend de eventHistory

  // 1.H.6. calculatePoints (Logique pure, pas de tracking)
  const calculatePoints = useCallback(
    (timeLeft: number, difficulty: number, currentStreak: number): number => {
      try {
        const config = LEVEL_CONFIGS[user.level];
        if (!config) return 0; // Sécurité

        // Points de base augmentent avec la difficulté
        const basePoints = (config.scoring.basePoints || 50) * (difficulty || 1);

        // Multiplicateur temps (max 2.5)
        const timeMultiplier = Math.max(1, Math.min(1 + (timeLeft / 20) * (config.scoring.timeMultiplier || 1), 2.5));

        // Multiplicateur streak (max 3.0)
        const streakMultiplier = Math.max(1, Math.min(1 + Math.floor(currentStreak / (config.scoring.comboThreshold || 5)) * (config.scoring.streakMultiplier || 0.2), 3.0));

        const calculatedPoints = Math.floor(basePoints * timeMultiplier * streakMultiplier);
        return Math.max(10, calculatedPoints); // Minimum 10 points pour une bonne réponse
      } catch (error) {
        console.error("Error calculating points:", error);
        return 10; // Retourner un minimum en cas d'erreur
      }
    },
    [user.level] // Dépend du niveau pour la config
  );

  // --- MODIFICATION : Utilisation de FirebaseAnalytics.reward dans applyReward ---
  // 1.H.7. applyReward
  const applyReward = useCallback((reward: { type: RewardType; amount: number }) => {
    console.log(`[useGameLogicA] applyReward called: type=${reward.type}, amount=${reward.amount}`);
    try {
      const safeAmount = Math.max(0, Math.floor(Number(reward.amount) || 0));

      // Mise à jour de l'état utilisateur
      setUser((prev) => {
        const currentPoints = Math.max(0, Number(prev.points) || 0);
        const updatedPoints = currentPoints + (reward.type === RewardType.POINTS ? safeAmount : 0);
        const updatedLives = reward.type === RewardType.EXTRA_LIFE
            ? Math.min(prev.lives + 1, MAX_LIVES)
            : prev.lives;

    

        return {
          ...prev,
          points: updatedPoints,
          lives: updatedLives
        };
      });

    } catch (error) {
      console.error("Error applying reward:", error);
      FirebaseAnalytics.error('apply_reward_error', error instanceof Error ? error.message : 'Unknown', 'applyReward');
    }
  }, []); // Pas de dépendances externes, user.level/points sont lus via le prev state de setUser
  // --- FIN MODIFICATION applyReward ---


  // --- MODIFICATION : Utilisation de FirebaseAnalytics.logEvent dans handleTimeout ---
  // 1.H.8. handleTimeout
  const handleTimeout = useCallback(() => {
    console.log('[useGameLogicA] handleTimeout called');
    if (isLevelPaused || isGameOver) return; // Ne rien faire si jeu en pause ou terminé

    // --- Utilisation de FirebaseAnalytics ---
    FirebaseAnalytics.logEvent('timeout', { // Événement personnalisé
      level_id: user.level,
      events_completed_in_level: user.eventsCompletedInLevel,
      current_streak: streak // Streak avant la réinitialisation
    });
    // --- Fin Utilisation ---

    playIncorrectSound(); // Son d'erreur pour timeout
    setStreak(0); // Réinitialiser la série

    // Animation de la barre de streak
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false
    }).start();

    // Perdre une vie
    setUser((prev) => {
      const newLives = prev.lives - 1;
      console.log('[useGameLogicA] Timeout => User lives going from', prev.lives, 'to', newLives);

      // Tracker la perte de vie (aussi un événement personnalisé)
      FirebaseAnalytics.logEvent('life_lost', {
           reason: 'timeout',
           remaining_lives: newLives,
           level_id: prev.level,
           event_id: newEvent?.id || 'unknown', // ID de l'événement manqué
      });

      if (newLives <= 0) {
        console.log('[useGameLogicA] Timeout => User has 0 lives => endGame() called.');
        // endGame sera appelé à l'extérieur du setUser pour éviter les problèmes d'état
        return { ...prev, lives: 0, streak: 0 }; // Mettre à 0 vie, streak 0
      }
      return { ...prev, lives: newLives, streak: 0 }; // Mettre à jour vies, streak 0
    });

    // Si l'utilisateur n'a plus de vie après la mise à jour, déclencher endGame
    if (user.lives <= 1) { // Vérifier si la vie VA passer à 0
       endGame();
    } else if (newEvent) {
       // S'il reste des vies, passer à la question suivante
       // Afficher brièvement les dates avant de passer (optionnel)
       setIsCorrect(false); // Marquer comme incorrect pour l'UI
       setShowDates(true);
       setTimeout(() => {
           if (!isGameOver) { // Vérifier à nouveau si le jeu n'est pas terminé entre-temps
               setPreviousEvent(newEvent);
               selectNewEvent(allEvents, newEvent);
           }
       }, 1500); // Délai pour montrer la réponse
    } else {
        // Cas où newEvent serait null (ne devrait pas arriver ici)
        console.error("handleTimeout: newEvent is null, cannot proceed!");
        setError("Erreur interne: impossible de charger l'événement suivant.");
        setIsGameOver(true);
        FirebaseAnalytics.error('timeout_null_event', 'newEvent was null in handleTimeout', 'handleTimeout');
    }

  }, [
      isLevelPaused, isGameOver, user.level, user.eventsCompletedInLevel, user.lives, streak,
      newEvent, allEvents, selectNewEvent, endGame, playIncorrectSound, progressAnim
  ]); // Ajouter user.lives et endGame aux dépendances
  // --- FIN MODIFICATION handleTimeout ---
     // --- MODIFICATION : Utilisation de FirebaseAnalytics dans handleChoice ---
  // 1.H.9. handleChoice
  const handleChoice = useCallback(
    (choice: 'avant' | 'après') => {
      // --- AJOUT DE LOGS DE DÉBOGAGE (Pour la première question) ---
      const isFirstQuestionOfLevel = user.eventsCompletedInLevel === 0;
      if (isFirstQuestionOfLevel) {
        console.log(`\n--- DEBUG: PREMIÈRE QUESTION (Niveau ${user.level}) ---`);
        console.log(`Choix utilisateur: ${choice}`);
        if (previousEvent) {
          console.log(`Previous Event (Référence): ID=${previousEvent.id}, Titre=${previousEvent.titre}, DATE=${previousEvent.date}`);
        } else {
          console.log('Previous Event (Référence): NULL (!! Problème potentiel à l\'init !!)');
        }
        if (newEvent) {
          console.log(`New Event (Question actuelle): ID=${newEvent.id}, Titre=${newEvent.titre}, DATE=${newEvent.date}`);
        } else {
          console.log('New Event (Question actuelle): NULL (!! Problème potentiel !!)');
        }
      }
      // --- FIN DES LOGS DE DÉBOGAGE ---

      if (!previousEvent || !newEvent || isLevelPaused || isGameOver || isWaitingForCountdown) {
        // Ne rien faire si pas prêt, en pause, terminé ou déjà en attente
        console.log(`[useGameLogicA] handleChoice ignored: p=${!!previousEvent}, n=${!!newEvent}, pause=${isLevelPaused}, over=${isGameOver}, wait=${isWaitingForCountdown}`);
        if (isFirstQuestionOfLevel) { // Log spécifique si ignoré pour la première question
             console.log(`[DEBUG 1ère Q] handleChoice ignoré (Conditions initiales non remplies).`);
        }
        return;
      }

      console.log(`[useGameLogicA] handleChoice: '${choice}' for event ${newEvent.id} (${newEvent.titre})`);
      setIsCountdownActive(false); // Arrêter le compte à rebours immédiatement

      const responseTime = 20 - timeLeft; // Calculer le temps de réponse

      const previousDate = new Date(previousEvent.date);
      const newDate = new Date(newEvent.date);
      const isNewDateValid = !isNaN(newDate.getTime());
      const isPreviousDateValid = !isNaN(previousDate.getTime());

      if (!isNewDateValid || !isPreviousDateValid) {
          console.error("Invalid date detected in handleChoice!", {prev: previousEvent.date, new: newEvent.date});
          setError("Erreur interne: date d'événement invalide.");
          FirebaseAnalytics.error('invalid_event_date', `Invalid date(s): p=${previousEvent.date}, n=${newEvent.date}`, 'handleChoice');
          setIsWaitingForCountdown(false); // Débloquer si erreur
          return;
      }

      const isActuallyBefore = newDate < previousDate;
      const isAnswerCorrect = (choice === 'avant' && isActuallyBefore) || (choice === 'après' && !isActuallyBefore);

      // --- AJOUT DE LOGS DE COMPARAISON (Pour la première question) ---
      if (isFirstQuestionOfLevel) {
          console.log(`[DEBUG 1ère Q] Comparaison Dates: newDate (${newDate.toISOString()}) < previousDate (${previousDate.toISOString()}) ? ${isActuallyBefore}`);
          const expectedChoice = isActuallyBefore ? 'avant' : 'après';
          console.log(`[DEBUG 1ère Q] Réponse attendue basée sur les dates: '${expectedChoice}'`);
          console.log(`[DEBUG 1ère Q] Résultat calculé (isAnswerCorrect): ${isAnswerCorrect}`);
          if ( (choice === expectedChoice && !isAnswerCorrect) || (choice !== expectedChoice && isAnswerCorrect) ) {
               console.error(`[DEBUG 1ère Q] !!! LOGIQUE INVERSÉE OU CALCUL INCORRECT DÉTECTÉ !!! Choix: '${choice}', Attendu: '${expectedChoice}', Calculé correct: ${isAnswerCorrect}`);
          }
           console.log(`--- FIN DEBUG PREMIÈRE QUESTION ---\n`);
      }
      // --- FIN LOGS COMPARAISON ---

      console.log(`[useGameLogicA] Answer is ${isAnswerCorrect ? 'CORRECT' : 'INCORRECT'}`);

      // --- Utilisation de FirebaseAnalytics ---
      FirebaseAnalytics.question(
        newEvent.id,
        newEvent.titre,
        getPeriod(newEvent.date),
        newEvent.niveau_difficulte,
        choice,
        isAnswerCorrect,
        responseTime,
        user.level,
        streak // Streak *avant* la mise à jour
      );
      // --- Fin Utilisation ---

      setIsCorrect(isAnswerCorrect); // Mettre à jour l'UI
      setShowDates(true); // Montrer les dates

      // Créer le résumé de l'événement pour l'historique du niveau
      const eventSummaryItem: LevelEventSummary = {
        id: newEvent.id,
        titre: newEvent.titre,
        date: newEvent.date,
        date_formatee: newEvent.date_formatee || new Date(newEvent.date).toLocaleDateString('fr-FR'), // Fallback formatage
        illustration_url: newEvent.illustration_url,
        wasCorrect: isAnswerCorrect,
        responseTime: responseTime,
        description_detaillee: newEvent.description_detaillee,
      };

      // Mettre à jour l'historique local (peut être déprécié si non utilisé ailleurs)
      // (La logique ici peut être simplifiée ou supprimée si eventHistory n'est plus utilisé ailleurs)
      setEventHistory(prev => {
         const lastEntryIndex = prev.length - 1;
         // Essayer de trouver l'événement correspondant dans l'historique pour mettre à jour 'success'
         // Si on se base sur updateGameState qui l'ajoute avant, on met à jour le dernier.
         if (lastEntryIndex >= 0 && prev[lastEntryIndex].success === false) { // Assume le dernier ajouté est celui joué
             const updatedHistory = [...prev];
             updatedHistory[lastEntryIndex] = { ...prev[lastEntryIndex], success: isAnswerCorrect };
             return updatedHistory;
         }
         // Fallback: ajouter si non trouvé (devrait être rare avec le flux actuel)
         console.warn("[handleChoice] Could not update last event history item, adding new entry.");
         return [...prev, { type: newEvent.types_evenement?.[0] || 'unknown', period: getPeriod(newEvent.date), success: isAnswerCorrect }];
      });

      // --- MODIFICATION CLÉ : Mettre à jour previousEvent IMMÉDIATEMENT ---
      // L'événement actuel (`newEvent`) devient la référence (`previousEvent`) pour la *prochaine* question ou pour `handleLevelUp`.
      const eventJustPlayed = newEvent; // Garde une référence claire pour les logs et la sélection suivante
      console.log(`[handleChoice] Setting PreviousEvent state to: ID=${eventJustPlayed?.id} ('${eventJustPlayed?.titre}')`);
      setPreviousEvent(eventJustPlayed);
      // ---------------------------------------------------------------------

      // Marquer qu'on attend avant de passer à la suite (pour les animations/délais)
      setIsWaitingForCountdown(true);

      if (isAnswerCorrect) {
        // --- BONNE RÉPONSE ---
        playCorrectSound();
        const newStreak = streak + 1;
        setStreak(newStreak);

        FirebaseAnalytics.streak(newStreak, user.level);
        Animated.timing(progressAnim, { toValue: newStreak, duration: 300, useNativeDriver: false }).start();
        updatePerformanceStats(newEvent.types_evenement?.[0] || 'default', getPeriod(newEvent.date), true);

        const pointsEarned = calculatePoints(timeLeft, newEvent.niveau_difficulte || 1, newStreak);
        FirebaseAnalytics.reward('POINTS', pointsEarned, 'correct_answer', newEvent.niveau_difficulte || 1, user.level, user.points + pointsEarned);
        checkRewards({ type: 'streak', value: newStreak }, user);

        const updatedLevelEventsSummary = [...currentLevelEvents, eventSummaryItem];
        setCurrentLevelEvents(updatedLevelEventsSummary);
        setLevelCompletedEvents(updatedLevelEventsSummary);

        // Mise à jour de l'état utilisateur (points, streak, niveau?)
        setUser((prev) => {
          const updatedPoints = prev.points + pointsEarned;
          const eventsCompleted = prev.eventsCompletedInLevel + 1;
          let updatedUser = {
            ...prev,
            points: updatedPoints,
            streak: newStreak,
            maxStreak: Math.max(prev.maxStreak, newStreak),
            eventsCompletedInLevel: eventsCompleted,
            totalEventsCompleted: prev.totalEventsCompleted + 1,
          };

          const currentLevelConfig = LEVEL_CONFIGS[prev.level];
          // Vérifier si le niveau est terminé
          if (currentLevelConfig && eventsCompleted >= currentLevelConfig.eventsNeeded) {
            // --- LEVEL UP ---
            const nextLevel = prev.level + 1;
            const nextLevelConfig = LEVEL_CONFIGS[nextLevel];
            console.log(`[handleChoice - Correct] Level Up triggered! Level ${prev.level} completed.`);

            updatedUser = {
              ...updatedUser,
              level: nextLevel,
              eventsCompletedInLevel: 0, // Réinitialiser compteur du niveau
            };

            FirebaseAnalytics.levelCompleted(prev.level, currentLevelConfig.name || `Niveau ${prev.level}`, eventsCompleted, updatedPoints);
            finalizeCurrentLevelHistory(updatedLevelEventsSummary);
            
            // Réinitialiser le compteur d'événements antiques pour le nouveau niveau
            setAntiqueEventsCount(0);

            if (nextLevelConfig) {
                console.log(`[handleChoice - Correct] Preparing for next level: ${nextLevel}`);
                setCurrentLevelConfig({ ...nextLevelConfig, eventsSummary: [] });
            } else {
                console.warn(`[handleChoice - Correct] No config found for level ${nextLevel}. Ending game?`);
                // endGame(); // Envisager d'appeler endGame ici si c'est la fin définitive
            }
            setCurrentLevelEvents([]);
            setShowLevelModal(true); // Afficher le modal de succès
            setIsLevelPaused(true); // Mettre en pause EN ATTENTE de handleLevelUp
            playLevelUpSound();

            // Logique pub pour level up
            if (prev.level === 1 || prev.level === 6 || prev.level % 5 === 0) {
              console.log(`[handleChoice - Correct] Setting pending ad display for level up.`);
              setPendingAdDisplay("levelUp");
              FirebaseAnalytics.ad('interstitial', 'triggered', 'level_up', prev.level);
            }

            checkRewards({ type: 'level', value: nextLevel }, updatedUser);
            if (nextLevelConfig?.pointsReward) {
               FirebaseAnalytics.reward('LEVEL_UP_BONUS', nextLevelConfig.pointsReward, 'level_up', nextLevel, prev.level, updatedPoints);
            }
            // PAS D'APPEL à selectNewEvent ici, handleLevelUp s'en chargera

          } else {
            // --- NIVEAU NON TERMINÉ ---
            console.log(`[handleChoice - Correct] Level ${prev.level} continues. Events completed: ${eventsCompleted}/${currentLevelConfig?.eventsNeeded}`);
            // Planifier la sélection du prochain événement après un délai
            setTimeout(() => {
              setIsWaitingForCountdown(false); // Fin de l'attente
              if (!isGameOver && !showLevelModal) { // Double check (surtout !showLevelModal)
                console.log(`[handleChoice - Correct] Timeout finished. Selecting next event using reference: ${eventJustPlayed?.id}`);
                // previousEvent est déjà à jour. eventJustPlayed est la référence correcte.
                selectNewEvent(allEvents, eventJustPlayed);
              } else {
                console.log(`[handleChoice - Correct] Timeout finished but game is over or level modal is shown. No event selection.`);
              }
            }, 750); // Délai court pour bonne réponse
         }
         return updatedUser;
       });

     } else {
       // --- MAUVAISE RÉPONSE ---
       playIncorrectSound();
       setStreak(0); // Réinitialiser la série

       Animated.timing(progressAnim, { toValue: 0, duration: 300, useNativeDriver: false }).start();
       updatePerformanceStats(newEvent.types_evenement?.[0] || 'default', getPeriod(newEvent.date), false);

       setCurrentLevelEvents((prev) => [...prev, eventSummaryItem]);
       setLevelCompletedEvents((prev) => [...prev, eventSummaryItem]);

       // Perdre une vie
       setUser((prev) => {
         const newLives = prev.lives - 1;
         console.log('[useGameLogicA] Incorrect answer => User lives going from', prev.lives, 'to', newLives);
         FirebaseAnalytics.logEvent('life_lost', { reason: 'incorrect_answer', remaining_lives: newLives, level_id: prev.level, event_id: newEvent.id });

         if (newLives <= 0) {
           console.log('[handleChoice - Incorrect] User has 0 lives => endGame() will be called shortly.');
           return { ...prev, lives: 0, streak: 0 };
         }
         return { ...prev, lives: newLives, streak: 0 };
       });

       // Vérifier si le jeu est terminé APRES la mise à jour de l'état (via lecture de user.lives qui sera mis à jour)
        if (user.lives <= 1) { // Condition: si la vie VA passer à 0 (était à 1 avant setUser)
           // Déclencher endGame après un court délai pour voir la réponse
           console.log('[handleChoice - Incorrect] Scheduling endGame due to 0 lives.');
           setTimeout(() => {
               if (!isGameOver) { // Vérifier à nouveau au cas où
                  endGame();
               }
           }, 500); // Délai avant game over
        } else {
           // --- CONTINUER APRÈS MAUVAISE RÉPONSE (S'IL RESTE DES VIES) ---
            console.log(`[handleChoice - Incorrect] Level ${user.level} continues. Remaining lives: ${user.lives - 1}`); // Log la vie restante après décrémentation
            // Planifier la sélection du prochain événement après un délai plus long
           setTimeout(() => {
               setIsWaitingForCountdown(false); // Fin de l'attente
               if (!isGameOver && !showLevelModal) { // Double check
                   console.log(`[handleChoice - Incorrect] Timeout finished. Selecting next event using reference: ${eventJustPlayed?.id}`);
                   // previousEvent est déjà à jour. eventJustPlayed est la référence correcte.
                   selectNewEvent(allEvents, eventJustPlayed);
               } else {
                    console.log(`[handleChoice - Incorrect] Timeout finished but game is over or level modal is shown. No event selection.`);
               }
           }, 1500); // Délai plus long pour mauvaise réponse
        }
     }

     // L'appel à endGame si 0 vies est géré dans le bloc "Mauvaise Réponse" ci-dessus.

   },
   [ // --- Dépendances de handleChoice ---
     // États lus directement :
     previousEvent, newEvent, isLevelPaused, isGameOver, isWaitingForCountdown,
     timeLeft, streak, user, // L'objet user entier inclut level, points, lives, eventsCompletedInLevel etc.
     allEvents, progressAnim, currentLevelEvents,

     // Fonctions appelées :
     getPeriod, calculatePoints, checkRewards, selectNewEvent, finalizeCurrentLevelHistory,
     playCorrectSound, playIncorrectSound, playLevelUpSound, // Sons
     updatePerformanceStats, // Fonction interne (si utilisée)
     endGame, // Fonction interne
     setAntiqueEventsCount // Fonction pour réinitialiser le compteur d'événements antiques
   ]
 );
 // --- FIN MODIFICATION handleChoice ---


 // --- MODIFICATION : Utilisation de FirebaseAnalytics dans handleLevelUp ---
 // 1.H.10. handleLevelUp (Appelé par le Modal de fin de niveau pour démarrer le suivant)
 const handleLevelUp = useCallback(() => {
   // --- DEBUG LOGS ---
   console.log(`[handleLevelUp] >>> FUNCTION CALLED <<<`);
   // Capture l'état AU MOMENT de l'appel
   const currentLevelState = user.level;
   const currentPointsState = user.points;
   const referenceEvent = previousEvent; // Capture la référence ACTUELLE

   console.log(`[handleLevelUp] State before starting: user.level=${currentLevelState} (This is the NEW level ID), user.points=${currentPointsState}`);

   // --- Vérification CRITIQUE de l'événement de référence ---
   if (!referenceEvent) {
       console.error("[handleLevelUp] !!! CRITICAL: previousEvent is NULL! Cannot select new event. Ending game. !!!");
       setError("Erreur interne critique: impossible de démarrer le niveau suivant (référence manquante).");
       FirebaseAnalytics.error('levelup_null_prev_event', 'previousEvent was null when handleLevelUp called', 'handleLevelUp');
       setIsGameOver(true); // Mettre fin au jeu immédiatement
       // On ne peut pas continuer sans référence
       return;
   }
   console.log(`[handleLevelUp] >>> Using previousEvent as reference: ID=${referenceEvent.id}, Date=${referenceEvent.date}, Titre='${referenceEvent.titre}' <<<`);
   // --- Fin Vérification ---

   console.log(`[handleLevelUp] Ad State Check: Pending Ad=${pendingAdDisplay}, Can Show Ad=${canShowAd()}, LevelUp Ad Loaded=${adState.levelUpInterstitialLoaded}, Generic Ad Loaded=${adState.interstitialLoaded}`);
   // --- FIN DEBUG LOGS ---

   const nextLevel = currentLevelState; // Utilise la valeur capturée
   const nextLevelConfig = LEVEL_CONFIGS[nextLevel];

   if (!nextLevelConfig) {
       console.error(`[handleLevelUp] Config not found for level ${nextLevel}! Ending game.`);
       setError(`Félicitations ! Vous avez terminé tous les niveaux disponibles !`);
       FirebaseAnalytics.error('config_missing_on_levelup', `Level ${nextLevel} config missing`, 'handleLevelUp');
       endGame(); // Terminer le jeu si pas de niveau suivant
       return;
   }

   console.log(`[handleLevelUp] Config found for level ${nextLevel}: '${nextLevelConfig.name}'. Resetting UI states...`);

   // Préparer l'UI pour le nouveau niveau
   setShowLevelModal(false);
   setIsLevelPaused(false);      // <-- Le jeu REDÉMARRE ici logiquement
   setIsCountdownActive(true);   // <-- Le compte à rebours est prêt à démarrer (démarrera vraiment après chargement image)
   setTimeLeft(20);
   setLevelCompletedEvents([]);
   setIsWaitingForCountdown(false); // <-- Autorise handleChoice (après chargement image)
   setShowDates(false);
   setIsCorrect(undefined);
   setIsImageLoaded(false);      // <-- Important: attendre le chargement de la nouvelle image
   console.log(`[handleLevelUp] UI states reset for level ${nextLevel}.`);

   // Réinitialiser le compteur d'événements antiques pour le nouveau niveau
   setAntiqueEventsCount(0);
   console.log(`[handleLevelUp] Antique events counter reset to 0 for new level ${nextLevel}`);

   // --- Utilisation de FirebaseAnalytics ---
   FirebaseAnalytics.levelStarted(
       nextLevel,
       nextLevelConfig.name || `Niveau ${nextLevel}`,
       nextLevelConfig.eventsNeeded,
       currentPointsState // Utilise les points capturés
   );
   // --- Fin Utilisation ---

   // Afficher la pub LevelUp si elle est en attente
   // (La logique existante semble correcte, ajout de logs mineurs)
   if (pendingAdDisplay === "levelUp" && canShowAd()) {
     console.log(`[handleLevelUp] Attempting to show LevelUp Ad...`);
     if (adState.levelUpInterstitialLoaded) {
       try {
         console.log('[handleLevelUp] Showing level up interstitial ad NOW.');
         levelUpInterstitial.show();
         // Note: L'état de l'ad sera mis à jour par les listeners (closed, error)
       } catch (error) {
         console.error('[handleLevelUp] Error showing level up ad:', error);
         FirebaseAnalytics.ad('interstitial', 'error_show', 'level_up', nextLevel -1); // Log error for previous level completion
         FirebaseAnalytics.error('ad_show_error', `LevelUp Interstitial: ${error.message}`, 'handleLevelUp');
         levelUpInterstitial.load(); // Attempt reload
       }
     } else if (adState.interstitialLoaded) {
       console.log('[handleLevelUp] Level up ad not loaded, showing generic interstitial fallback.');
       FirebaseAnalytics.ad('interstitial', 'triggered', 'level_up_fallback', nextLevel -1);
       try {
           genericInterstitial.show();
       } catch (error) {
           console.error('[handleLevelUp] Error showing generic fallback ad:', error);
           FirebaseAnalytics.ad('interstitial', 'error_show', 'level_up_fallback', nextLevel -1);
           FirebaseAnalytics.error('ad_show_error', `Generic Fallback Ad: ${error.message}`, 'handleLevelUp');
           genericInterstitial.load(); // Attempt reload
       }
     } else {
       console.log('[handleLevelUp] No ads (LevelUp or Generic) available to show for level up.');
       FirebaseAnalytics.ad('interstitial', 'not_available', 'level_up', nextLevel -1);
     }
   } else {
       console.log(`[handleLevelUp] Not showing LevelUp Ad (Pending: ${pendingAdDisplay}, Can Show: ${canShowAd()})`);
   }
   setPendingAdDisplay(null); // Toujours réinitialiser l'intention d'afficher la pub

   // Sélectionner le premier événement du nouveau niveau en utilisant la référence capturée
   console.log(`[handleLevelUp] === Calling selectNewEvent(allEvents, referenceEvent: ${referenceEvent.id}) ===`);
   selectNewEvent(allEvents, referenceEvent) // Utilise la référence capturée plus tôt
     .then(selectedEvent => {
       // --- DEBUG LOGS ---
       if (selectedEvent) {
         console.log(`[handleLevelUp] <<< selectNewEvent successfuly returned event: ID=${selectedEvent.id}, Titre='${selectedEvent.titre}'. Waiting for image load... >>>`);
         // La suite (timer start) dépendra de handleImageLoad qui met isCountdownActive à true
         // updateGameState (appelé dans selectNewEvent) aura mis à jour `newEvent`.
       } else {
         // selectNewEvent a échoué à trouver un événement (potentiellement fin de partie ou erreur)
         console.warn('[handleLevelUp] <<< selectNewEvent returned NULL. The game might be stuck or over. Check selectNewEvent logs for details. >>>');
         if (!isGameOver && !error) { // Si le jeu n'est pas déjà marqué comme terminé par selectNewEvent
            setError("Impossible de trouver un événement valide pour continuer le jeu.");
            setIsGameOver(true); // Forcer Game Over ici si selectNewEvent échoue silencieusement
            FirebaseAnalytics.error('select_event_null_levelup', 'selectNewEvent returned null unexpectedly after level up', 'handleLevelUp');
         }
       }
       // --- FIN DEBUG LOGS ---
     })
     .catch(err => {
       // --- DEBUG LOGS ---
       console.error('[handleLevelUp] !!! Catastrophic Error during selectNewEvent call:', err);
       setError(`Erreur critique lors du chargement du niveau suivant: ${err.message}`);
       FirebaseAnalytics.error('select_event_error_levelup', err instanceof Error ? err.message : 'Unknown', 'handleLevelUp');
       setIsGameOver(true); // Mettre fin au jeu si selectNewEvent lance une exception
       // --- FIN DEBUG LOGS ---
     });

   console.log("[handleLevelUp] Function execution finished (selectNewEvent call is asynchronous and image loading is pending).");

 }, [
     // Dépendances directes lues au début ou utilisées dans la logique:
     user.level, user.points, // Pour lecture initiale et logs/Firebase
     previousEvent, // CRUCIAL comme référence
     pendingAdDisplay, // Pour logique pub
     adState.levelUpInterstitialLoaded, adState.interstitialLoaded, // Pour logique pub
     allEvents, // Pour selectNewEvent
     
     // Fonctions appelées :
     canShowAd, // Pour logique pub
     endGame, // Pour gérer fin si pas de config / erreur critique
     selectNewEvent, // Pour sélectionner le prochain event
     setAntiqueEventsCount, // Pour réinitialiser le compteur d'événements antiques

     // Fonctions setState (normalement stables, mais listées pour clarté)
     // setError, setIsGameOver, setShowLevelModal, setIsLevelPaused, setIsCountdownActive,
     // setTimeLeft, setLevelCompletedEvents, setIsWaitingForCountdown, setShowDates,
     // setIsCorrect, setIsImageLoaded, setPendingAdDisplay

     // Note: FirebaseAnalytics est stable. LEVEL_CONFIGS est une constante.
 ]);
 // --- FIN MODIFICATION handleLevelUp ---


 // --- MODIFICATION : Utilisation de FirebaseAnalytics dans endGame ---
 // 1.H.11. endGame
 const endGame = useCallback(async () => {
   // S'assurer qu'on ne déclenche pas endGame plusieurs fois
   if (isGameOver) {
       console.log("[useGameLogicA] endGame called but already game over. Skipping.");
       return;
   }
   console.log('[useGameLogicA] endGame called.');

   setIsGameOver(true); // Mettre l'état immédiatement
   setIsCountdownActive(false); // Arrêter tout compte à rebours
   setIsLevelPaused(true); // Mettre en pause
   playGameOverSound();
   setLeaderboardsReady(false); // Préparer l'attente des scores

   // --- Utilisation de FirebaseAnalytics ---
   // Tracker l'événement game_over AVANT les appels asynchrones
   FirebaseAnalytics.gameOver(
       user.points,
       user.level, // Le niveau maximum atteint
       user.totalEventsCompleted,
       user.maxStreak,
       user.points > highScore // Si c'est un nouveau high score perso
   );
   // --- Fin Utilisation ---

   // Finaliser l'historique du dernier niveau joué (potentiellement incomplet)
   console.log('[useGameLogicA] Finalizing history for last level played:', user.level);
   // Utiliser currentLevelEvents car le niveau n'a peut-être pas été complété
   finalizeCurrentLevelHistory(currentLevelEvents);

   // Affichage de la pub de fin de jeu après un délai
   setTimeout(() => {
     if (canShowAd()) {
       FirebaseAnalytics.ad('interstitial', 'triggered', 'game_over', user.level); // Track trigger
       if (adState.gameOverInterstitialLoaded) {
         try {
           console.log('[useGameLogicA] Showing game over interstitial ad');
           gameOverInterstitial.show();
         } catch (error) {
           console.error('Error showing game over ad:', error);
           FirebaseAnalytics.ad('interstitial', 'error_show', 'game_over', user.level);
           FirebaseAnalytics.error('ad_show_error', `GameOver Interstitial: ${error.message}`, 'endGame');
           gameOverInterstitial.load(); // Recharger
         }
       } else if (adState.interstitialLoaded) { // Fallback
         console.log('[useGameLogicA] Game over ad not loaded, showing generic interstitial fallback');
         FirebaseAnalytics.ad('interstitial', 'triggered', 'game_over_fallback', user.level);
         genericInterstitial.show();
       } else {
         console.log('[useGameLogicA] No ads available for game over');
         FirebaseAnalytics.ad('interstitial', 'not_available', 'game_over', user.level);
       }
     } else {
       console.log('[useGameLogicA] Cannot show ad at game over due to ad-free period or frequency cap');
     }
   }, 1500); // Délai pour laisser l'écran de fin apparaître un peu

   // --- Chargement des classements et sauvegarde ---
   try {
     const { data: { user: authUser } } = await supabase.auth.getUser();

     // Si joueur invité, afficher des scores fictifs/locaux
     if (!authUser?.id) {
       console.log("[useGameLogicA] Guest player detected in endGame. Showing placeholder scores.");
       const guestScores = {
         daily: [{ name: user.name || 'Voyageur', score: user.points, rank: 1 }],
         monthly: [{ name: "👑 Meilleur score", score: highScore || user.points, rank: 1 }], // Utilise le high score local si dispo
         allTime: [{ name: "🏆 Record", score: highScore || user.points, rank: 1 }]
       };
       setLeaderboards(guestScores);
       setLeaderboardsReady(true); // Prêt à afficher
       return; // Pas de sauvegarde pour invité
     }

     // Joueur connecté : sauvegarder le score et charger les classements
     console.log("[useGameLogicA] Registered player. Saving score and fetching leaderboards...");
     const userId = authUser.id;
     const currentDisplayName = user.name || 'Joueur'; // Utiliser le nom du state `user`

     // 1. Insérer le nouveau score
     await supabase.from('game_scores').insert({
       user_id: userId,
       display_name: currentDisplayName,
       score: user.points,
       // created_at est géré par Supabase
     });
     console.log("[useGameLogicA] New score inserted.");

     // 2. Vérifier et mettre à jour le high score personnel dans 'profiles'
     const { data: currentProfile, error: profileError } = await supabase
       .from('profiles')
       .select('high_score')
       .eq('id', userId)
       .single();

     if (profileError) {
         console.error("Error fetching current high score:", profileError);
         FirebaseAnalytics.error('profile_fetch_error', profileError.message, 'endGame');
         // Continuer sans mise à jour du high score
     } else if (currentProfile && user.points > (currentProfile.high_score || 0)) {
         console.log(`[useGameLogicA] New high score! ${user.points} > ${currentProfile.high_score || 0}`);
         const { error: updateError } = await supabase
           .from('profiles')
           .update({ high_score: user.points, last_played: new Date().toISOString() }) // Mettre à jour aussi last_played
           .eq('id', userId);

         if (updateError) {
             console.error("Error updating high score:", updateError);
             FirebaseAnalytics.error('profile_update_error', updateError.message, 'endGame');
         } else {
             // --- Utilisation de FirebaseAnalytics ---
             FirebaseAnalytics.highScore(currentProfile.high_score || 0, user.points);
             // Mettre à jour le high score local pour l'affichage immédiat
             setHighScore(user.points);
             // --- Fin Utilisation ---
         }
     } else if (currentProfile) {
         // Si pas de nouveau high score, juste mettre à jour last_played
         await supabase.from('profiles').update({ last_played: new Date().toISOString() }).eq('id', userId);
     }

     // 3. Charger les classements (peut être optimisé avec des RPC Supabase)
     console.log("[useGameLogicA] Fetching leaderboards...");
     const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
     const firstDayOfMonth = `${today.substring(0, 7)}-01`; // YYYY-MM-01

     // Paralléliser les requêtes de classement
     const [dailyRes, monthlyRes, allTimeRes] = await Promise.all([
       supabase.from('game_scores').select('display_name, score').gte('created_at', `${today}T00:00:00.000Z`).order('score', { ascending: false }).limit(5),
       supabase.from('game_scores').select('display_name, score').gte('created_at', `${firstDayOfMonth}T00:00:00.000Z`).order('score', { ascending: false }).limit(5),
       // Pour allTime, on prend les high_scores des profils
       supabase.from('profiles').select('display_name, high_score').not('high_score', 'is', null).order('high_score', { ascending: false }).limit(5)
     ]);

     // Vérifier les erreurs potentielles (non bloquant pour l'affichage partiel)
     if(dailyRes.error) { console.error("Error fetching daily scores:", dailyRes.error); FirebaseAnalytics.error('leaderboard_fetch_error', `Daily: ${dailyRes.error.message}`, 'endGame'); }
     if(monthlyRes.error) { console.error("Error fetching monthly scores:", monthlyRes.error); FirebaseAnalytics.error('leaderboard_fetch_error', `Monthly: ${monthlyRes.error.message}`, 'endGame'); }
     if(allTimeRes.error) { console.error("Error fetching allTime scores:", allTimeRes.error); FirebaseAnalytics.error('leaderboard_fetch_error', `AllTime: ${allTimeRes.error.message}`, 'endGame'); }

     console.log("[useGameLogicA] Leaderboards fetched.");
     // Afficher les scores même si certains ont échoué
     setScoresAndShow(dailyRes.data || [], monthlyRes.data || [], allTimeRes.data || []);

     // La fonction saveProgress n'est plus nécessaire car on sauvegarde ici

   } catch (error) {
     // Erreur générale pendant la sauvegarde/chargement des scores
     console.error('[useGameLogicA] Error during endGame score processing:', error);
     FirebaseAnalytics.error('endgame_processing_error', error instanceof Error ? error.message : 'Unknown', 'endGame');

     // Afficher des scores fallback même en cas d'erreur
     const fallbackScores = {
       daily: [{ name: user.name || 'Voyageur', score: user.points, rank: 1 }],
       monthly: [{ name: "👑 Meilleur score", score: highScore || user.points, rank: 1 }],
       allTime: [{ name: "🏆 Record", score: highScore || user.points, rank: 1 }]
     };
     setLeaderboards(fallbackScores);
     setLeaderboardsReady(true); // Afficher les fallbacks
   }
 }, [
     isGameOver, // Pour éviter exécutions multiples
     user.points, user.level, user.totalEventsCompleted, user.maxStreak, user.name, // Données user pour score et tracking
     highScore, // Pour comparer et tracker nouveau record
     playGameOverSound, finalizeCurrentLevelHistory, currentLevelEvents, // Fonctions internes / état
     canShowAd, adState.gameOverInterstitialLoaded, adState.interstitialLoaded, // Logique pub
     setScoresAndShow // Fonction interne
 ]);
 // --- FIN MODIFICATION endGame ---

 // 1.H.12. saveProgress (DEPRECATED - La logique est maintenant dans endGame)
 // const saveProgress = useCallback(async () => { ... }, []);

 // --- MODIFICATION : Utilisation de FirebaseAnalytics.leaderboard dans setScoresAndShow ---
 // 1.H.13. setScoresAndShow
 const setScoresAndShow = useCallback((
   dailyScores: any[],
   monthlyScores: any[],
   allTimeScores: any[]
 ) => {
   const formatScores = (scores: any[], scoreField: string = 'score') =>
       scores.map((s, index) => ({
           name: s.display_name?.trim() || 'Joueur',
           score: s[scoreField] || 0,
           rank: index + 1
       }));

   const formatted = {
     daily: formatScores(dailyScores, 'score'),
     monthly: formatScores(monthlyScores, 'score'),
     allTime: formatScores(allTimeScores, 'high_score') // Utilise high_score pour allTime
   };
   setLeaderboards(formatted);
   setLeaderboardsReady(true);

   // --- Utilisation de FirebaseAnalytics ---
   // Tracker que les classements sont affichés (on pourrait être plus spécifique)
   FirebaseAnalytics.leaderboard('summary'); // Indique que l'écran résumé est montré
   // --- Fin Utilisation ---

 }, []); // Pas de dépendances externes nécessaires
  // --- FIN MODIFICATION setScoresAndShow ---

 // 1.H.15. startLevel (DEPRECATED - Remplacé par handleLevelUp qui est appelé par le modal)
 // const startLevel = useCallback(() => { ... }, []);

 /* 1.I. Retour du hook */
 return {
   // États utilisateur et jeu
   user,
   previousEvent,
   newEvent,
   timeLeft,
   loading,
   error,
   isGameOver: isGameOver && leaderboardsReady, // Vrai seulement quand terminé ET classements prêts
   showDates,
   isCorrect,
   isImageLoaded,
   streak,
   highScore, // Le high score perso (mis à jour après endGame)
   showLevelModal,
   isLevelPaused,
   currentLevelConfig,
   leaderboards, // Classements formatés pour affichage
   // performanceStats, // Déprécié ?
   // categoryMastery, // Déprécié ?
   // periodStats, // Déprécié ?
   // activeBonus, // Déprécié ?

   // Récompenses
   currentReward,

   // Fonctions de jeu principales à exposer aux composants UI
   handleChoice,
   // startLevel, // Remplacé par handleLevelUp
   handleLevelUp, // À appeler depuis le bouton "Niveau Suivant" du modal
   showRewardedAd, // Pour déclencher une pub récompensée (ex: bouton "Vie supplémentaire?")
   initGame, // Exposer initGame pour permettre un bouton "Rejouer"
   completeRewardAnimation, // Pour l'animation de récompense
   updateRewardPosition, // Pour l'animation de récompense

   // Infos diverses
   remainingEvents: allEvents.length - usedEvents.size, // Nombre d'événements restants (approximatif)

   // Animations et callbacks UI
   progressAnim, // Pour la barre de streak
   onImageLoad: handleImageLoad, // Callback pour le chargement d'image

   // Données pour affichage spécifique
   levelCompletedEvents, // Pour afficher le résumé dans LevelUpModalBis
   levelsHistory, // Pour afficher l'historique complet dans GameOverScreen

   // État publicitaire simplifié pour l'UI
   adState: {
     hasRewardedAd: adState.rewardedLoaded, // Y a-t-il une pub récompensée prête ?
     isAdFree: Date.now() < adState.adFreeUntil, // L'utilisateur est-il dans une période sans pub ?
     adFreeTimeRemaining: Math.max(0, Math.round((adState.adFreeUntil - Date.now()) / 1000)) // Temps restant sans pub en secondes
   }
 };
}

export default useGameLogicA;