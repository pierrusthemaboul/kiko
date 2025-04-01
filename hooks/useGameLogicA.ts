/************************************************************************************
 * 1. HOOK PRINCIPAL entier : useGameLogicA
 *
 * 1.A. Description
 *     Hook de logique de jeu principal. Gère la logique de sélection d'événements,
 *     le scoring, la gestion du niveau, l'audio, les récompenses, la fin de partie
 *     et désormais l'intégration d'un système publicitaire complet.
 *
 * 1.B. Paramètres
 *     @param {string} initialEvent - Identifiant éventuel d'un événement initial.
 *
 * 1.C. Retour
 *     {object} - Ensemble d'états et de fonctions utiles au jeu (user, événements, pub, etc.).
 ************************************************************************************/

/* 1.D. Imports et Types (TOUS les imports sont ici, au niveau supérieur) */

// 1.D.1. Librairies / Modules
import { useState, useEffect, useCallback } from 'react';
import { AppState, Animated, Dimensions } from 'react-native';
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

// ------------------ INTÉGRATION DE LA PUBLICITÉ AVANCÉE (Importations ici) ------------------
import {
  InterstitialAd,
  RewardedAd,
  AdEventType, // Pour Interstitial et certains Rewarded ?
  RewardedAdEventType, // Pour certains événements Rewarded spécifiques
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

/* 1.E. Hook : useGameLogicA (Début de la fonction hook) */

/**
 * Hook de logique de jeu (quiz historique) intégrant le système publicitaire.
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
      // Note: 'applyReward' est définie plus bas mais accessible grâce au hoisting
      applyReward(reward);
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
    performanceStats: {
      typeSuccess: {},
      periodSuccess: {},
      overallAccuracy: 0,
      averageResponseTime: 0
    }
  });

  /* 1.E.4. (États du jeu) */
  const [activeBonus, setActiveBonus] = useState<ActiveBonus[]>([]);
  const [periodStats, setPeriodStats] = useState<Record<HistoricalPeriod, HistoricalPeriodStats>>({});
  const [categoryMastery, setCategoryMastery] = useState<Record<string, CategoryMastery>>({});
  const [eventHistory, setEventHistory] = useState<{ type: string; period: string; success: boolean; }[]>([]);
  const [performanceStats, setPerformanceStats] = useState<{
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
    ...LEVEL_CONFIGS[1],
    eventsSummary: []
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
  const [hasInitialJumped, setHasInitialJumped] = useState<boolean>(false);
  const [hasFirstForcedJumpHappened, setHasFirstForcedJumpHappened] = useState<boolean>(false);
  const [initialJumpDistance, setInitialJumpDistance] = useState<number>(() => {
    const distances = [500, 750, 1000];
    return distances[Math.floor(Math.random() * distances.length)];
  });
  const [initialJumpEventCount, setInitialJumpEventCount] = useState<number>(() => {
    return Math.floor(Math.random() * (19 - 12 + 1)) + 12;
  });

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
    console.log('[useGameLogicA] Setting up Generic Interstitial listeners using AdEventType');
    const unsubscribeGenericLoaded = genericInterstitial.addAdEventListener(AdEventType.LOADED, () => {
      console.log('[useGameLogicA] Generic interstitial loaded successfully');
      setAdState(prev => ({ ...prev, interstitialLoaded: true }));
    });
    const unsubscribeGenericError = genericInterstitial.addAdEventListener(AdEventType.ERROR, error => {
      console.error('[useGameLogicA] Generic interstitial error:', error);
      setAdState(prev => ({ ...prev, interstitialLoaded: false }));
      setTimeout(() => { genericInterstitial.load(); }, 5000);
    });
    const unsubscribeGenericClosed = genericInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('[useGameLogicA] Generic interstitial closed');
      genericInterstitial.load();
      setAdState(prev => ({ ...prev, interstitialLoaded: false, lastInterstitialTime: Date.now() }));
    });

    // --- LevelUp Interstitial ---
    console.log('[useGameLogicA] Setting up LevelUp Interstitial listeners using AdEventType');
    const unsubscribeLevelUpLoaded = levelUpInterstitial.addAdEventListener(AdEventType.LOADED, () => {
       console.log('[useGameLogicA] LevelUp interstitial loaded successfully');
       setAdState(prev => ({ ...prev, levelUpInterstitialLoaded: true }));
    });
    const unsubscribeLevelUpError = levelUpInterstitial.addAdEventListener(AdEventType.ERROR, error => {
       console.error('[useGameLogicA] LevelUp interstitial error:', error);
       setAdState(prev => ({ ...prev, levelUpInterstitialLoaded: false }));
       setTimeout(() => { levelUpInterstitial.load(); }, 5000);
    });
    const unsubscribeLevelUpClosed = levelUpInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
       console.log('[useGameLogicA] LevelUp interstitial closed');
       levelUpInterstitial.load();
       setAdState(prev => ({ ...prev, levelUpInterstitialLoaded: false, lastInterstitialTime: Date.now() }));
    });

    // --- GameOver Interstitial ---
    console.log('[useGameLogicA] Setting up GameOver Interstitial listeners using AdEventType');
    const unsubscribeGameOverLoaded = gameOverInterstitial.addAdEventListener(AdEventType.LOADED, () => {
       console.log('[useGameLogicA] GameOver interstitial loaded successfully');
       setAdState(prev => ({ ...prev, gameOverInterstitialLoaded: true }));
    });
    const unsubscribeGameOverError = gameOverInterstitial.addAdEventListener(AdEventType.ERROR, error => {
       console.error('[useGameLogicA] GameOver interstitial error:', error);
       setAdState(prev => ({ ...prev, gameOverInterstitialLoaded: false }));
       setTimeout(() => { gameOverInterstitial.load(); }, 5000);
    });
    const unsubscribeGameOverClosed = gameOverInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
       console.log('[useGameLogicA] GameOver interstitial closed');
       gameOverInterstitial.load();
       setAdState(prev => ({ ...prev, gameOverInterstitialLoaded: false, lastInterstitialTime: Date.now() }));
    });

    // --- Rewarded Ad (Approche Hybride) ---
    console.log('[useGameLogicA] Setting up Rewarded Ad LOADED listener using:', RewardedAdEventType.LOADED);
    const unsubscribeRewardedLoaded = rewardedAd.addAdEventListener(
      RewardedAdEventType.LOADED, // << Tentative basée sur le 1er log
      () => {
        console.log('[useGameLogicA] Rewarded ad loaded successfully (using RewardedAdEventType)');
        setAdState(prev => ({ ...prev, rewardedLoaded: true }));
      }
    );

    console.log('[useGameLogicA] Setting up Rewarded Ad ERROR listener using:', AdEventType.ERROR);
    const unsubscribeRewardedError = rewardedAd.addAdEventListener(
      AdEventType.ERROR,  // << Retour à AdEventType basé sur le 2ème log
      error => {
        console.error('[useGameLogicA] Rewarded ad error (using AdEventType):', error);
        setAdState(prev => ({ ...prev, rewardedLoaded: false }));
        setTimeout(() => { rewardedAd.load(); }, 5000);
      }
    );

    console.log('[useGameLogicA] Setting up Rewarded Ad CLOSED listener using:', AdEventType.CLOSED);
    const unsubscribeRewardedClosed = rewardedAd.addAdEventListener(
      AdEventType.CLOSED, // << Retour à AdEventType basé sur le 2ème log
      () => {
        console.log('[useGameLogicA] Rewarded ad closed (using AdEventType)');
        rewardedAd.load(); // Recharger après fermeture
        setAdState(prev => ({ ...prev, rewardedLoaded: false }));
      }
    );

    console.log('[useGameLogicA] Setting up Rewarded Ad EARNED_REWARD listener using:', RewardedAdEventType.EARNED_REWARD);
    const unsubscribeRewardedEarned = rewardedAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,  // << Spécifique, probablement correct
      reward => {
        console.log('[useGameLogicA] User earned reward:', reward);
        setUser(prev => ({
          ...prev,
          lives: Math.min(prev.lives + 1, MAX_LIVES)
        }));
        setAdState(prev => ({ ...prev, adFreeUntil: Date.now() + 5 * 60 * 1000 }));
      }
    );

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
  }, []); // Le tableau de dépendances vide est correct ici

  // Vérifie si une pub peut être affichée
  const canShowAd = useCallback(() => {
    const now = Date.now();
    if (now < adState.adFreeUntil) {
      console.log('[useGameLogicA] canShowAd: false - in ad-free period');
      return false;
    }
    if (now - adState.lastInterstitialTime < 3 * 60 * 1000) { // 3 minutes
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
        rewardedAd.show();
        return true;
      } else if (adState.interstitialLoaded) { // Fallback vers interstitiel générique
        console.log('[useGameLogicA] Rewarded ad not loaded, falling back to generic interstitial');
        genericInterstitial.show();
        return true;
      } else {
        console.log('[useGameLogicA] No rewarded or generic interstitial ad available to show');
        return false;
      }
    } catch (error) {
      console.error('[useGameLogicA] Error showing ad in showRewardedAd:', error);
      if (adState.rewardedLoaded) rewardedAd.load(); // Tentative de rechargement
      else if (adState.interstitialLoaded) genericInterstitial.load();
      return false;
    }
  }, [adState.rewardedLoaded, adState.interstitialLoaded]); // Dépendances importantes ici
  /* ******* FIN INTÉGRATION PUBLICITÉ AVANCÉE ******* */




  /* Effet pour appliquer un malus si l'utilisateur quitte l'application */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background') {
        // Appliquer un malus : on retire 5 secondes au compte à rebours
        setTimeLeft((prevTime) => Math.max(prevTime - 5, 0));
      }
    });
    return () => {
      subscription.remove();
    };
  }, []);

  /* 1.F. Effet d'initialisation */
  useEffect(() => {
    initGame();
  }, []);

  // 1.G. Compte à rebours
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;

    if (isCountdownActive && timeLeft > 0 && !isLevelPaused && !isGameOver) {
      timer = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            handleTimeout();
            return 0;
          }
          if (prevTime <= 5) {
            playCountdownSound();
          }
          return prevTime - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isCountdownActive, isLevelPaused, isGameOver, timeLeft]);

  /* 
   *  Ajout d'un effet pour suivre l'évolution de levelsHistory.
   *  Utile pour voir si l'état se met bien à jour.
   */
  useEffect(() => {
    console.log('[useGameLogicA] levelsHistory updated:', levelsHistory);
  }, [levelsHistory]);

  /* 1.H. Regroupement des fonctions internes */

  // ---------------------- Nouvelle fonction : finalizeCurrentLevelHistory ----------------------
  // Modifiée pour accepter en paramètre les événements à finaliser et mettre à jour l'historique global
  const finalizeCurrentLevelHistory = (eventsToFinalize: LevelEventSummary[]) => {
    console.log('[useGameLogicA] finalizeCurrentLevelHistory called, eventsToFinalize:', eventsToFinalize);
    console.log('[useGameLogicA] finalizeCurrentLevelHistory => eventsToFinalize length:', eventsToFinalize.length);

    if (eventsToFinalize.length === 0) {
      console.log('[useGameLogicA] No events to finalize; returning.');
      return;
    }
    const currentLvl = user.level;
    setLevelsHistory((prev) => {
      console.log('[useGameLogicA] old levelsHistory:', prev);
      const existingIndex = prev.findIndex((lh) => lh.level === currentLvl);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          level: currentLvl,
          events: [...updated[existingIndex].events, ...eventsToFinalize],
        };
        console.log('[useGameLogicA] updating existing levelHistory index:', existingIndex, ', new array =', updated);
        return updated;
      } else {
        const newArray = [...prev, { level: currentLvl, events: eventsToFinalize }];
        console.log('[useGameLogicA] adding a new levelHistory entry for level', currentLvl, ', new array =', newArray);
        return newArray;
      }
    });
    // IMPORTANT : Nous ne vidons pas levelCompletedEvents ici pour conserver le tableau de récapitulatif du niveau fini
    console.log('[useGameLogicA] finalizeCurrentLevelHistory completed (levelCompletedEvents preserved)');
  };
  // ---------------------------------------------------------------------------------------------

  // 1.H.1. initGame
  const initGame = async () => {
    try {
      setLoading(true);
      await fetchUserData();

      const initialConfig = LEVEL_CONFIGS[1];
      if (!initialConfig) {
        throw new Error('Configuration du niveau 1 manquante');
      }
      setCurrentLevelConfig(initialConfig);

      const { data: events, error: eventsError } = await supabase
        .from('evenements')
        .select('*')
        .order('date', { ascending: true });

      if (eventsError) throw eventsError;
      if (!events?.length) {
        throw new Error('Aucun événement disponible');
      }

      const validEvents = events.filter(
        (event) =>
          event.date &&
          event.titre &&
          event.illustration_url &&
          event.niveau_difficulte &&
          event.types_evenement
      );
      setAllEvents(validEvents);

      if (validEvents.length < 2) {
        throw new Error("Pas assez d'événements disponibles");
      }

      // --- Sélection des événements de niveau 1 uniquement ---
      const level1Events = validEvents.filter((e) => e.niveau_difficulte === 1);

      if (level1Events.length < 2) {
        throw new Error("Pas d'événements adaptés au niveau 1 disponibles");
      }

      // Sélection du premier événement
      const firstIndex = Math.floor(Math.random() * level1Events.length);
      const firstEvent = level1Events[firstIndex];

      // Calcul de l'année de référence pour le 1er événement
      function yearFromDate(dateString: string): number {
        return new Date(dateString).getFullYear();
      }
      const referenceYear = yearFromDate(firstEvent.date);

      // On filtre les autres événements
      const filteredForSecond = level1Events.filter((e) => e.id !== firstEvent.id);

      // Filtrage pour avoir au moins 500 ans d'écart
      const validSecondEvents = filteredForSecond.filter(
        (e) => Math.abs(yearFromDate(e.date) - referenceYear) >= 500
      );

      if (validSecondEvents.length === 0) {
        throw new Error('Aucun second événement ne répond à l\'écart minimal de 500 ans');
      }

      // Sélection du second événement dans ce sous-ensemble
      const secondIndex = Math.floor(Math.random() * validSecondEvents.length);
      const secondEvent = validSecondEvents[secondIndex];

      setPreviousEvent(firstEvent);
      setNewEvent(secondEvent);
      setUsedEvents(new Set([firstEvent.id, secondEvent.id]));

      setIsLevelPaused(false);
      setIsCountdownActive(true);
      setTimeLeft(20);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erreur d'initialisation";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // 1.H.2. fetchUserData
  const fetchUserData = async () => {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      if (authUser) {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name, high_score')
          .eq('id', authUser.id)
          .single();
        if (error) throw error;

        if (data) {
          setUser((prev) => ({
            ...prev,
            name: data.display_name
          }));
          setHighScore(data.high_score || 0);
        }
      }
    } catch (error) {
      // Gestion silencieuse des erreurs
    }
  };

  // 1.H.3. handleImageLoad
  const handleImageLoad = () => {
    setIsImageLoaded(true);
    if (!isLevelPaused) {
      setIsCountdownActive(true);
    }
  };

  // 1.H.4.a. getTimeDifference
  const getTimeDifference = useCallback((date1: string, date2: string) => {
    try {
      const d1 = new Date(date1).getTime();
      const d2 = new Date(date2).getTime();
      const diffInYears = Math.abs(d1 - d2) / (365.25 * 24 * 60 * 60 * 1000);
      return diffInYears;
    } catch (error) {
      return Infinity;
    }
  }, []);

  // 1.H.4.b. getPeriod
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
      return HistoricalPeriod.TWENTIETH;
    }
  }, []);

  // 1.H.4.c. updateGameState
  const updateGameState = useCallback(async (selectedEvent: Event) => {
    try {
      setUsedEvents((prev) => new Set([...prev, selectedEvent.id]));
      setNewEvent(selectedEvent);
      setIsImageLoaded(false);
      setShowDates(false);
      setIsCorrect(undefined);

      setIsCountdownActive(false);
      setTimeLeft(20);

      const period = getPeriod(selectedEvent.date);
      setEventHistory((prev) => [
        ...prev,
        {
          type: selectedEvent.types_evenement[0],
          period,
          success: false
        }
      ]);
    } catch (err) {
      // Gestion silencieuse des erreurs
    }
  }, [getPeriod]);

  // 1.H.4.d.0 getNextForcedJumpIncrement
  function getNextForcedJumpIncrement(year: number): number {
    if (year < 500) {
      return Math.floor(Math.random() * (5 - 1 + 1)) + 1; 
    } else if (year >= 500 && year < 700) {
      return Math.floor(Math.random() * (9 - 6 + 1)) + 6;
    } else if (year >= 700 && year < 1000) {
      return Math.floor(Math.random() * (9 - 6 + 1)) + 6;
    } else if (year >= 1000 && year < 1500) {
      return Math.floor(Math.random() * (9 - 6 + 1)) + 6;
    } else if (year >= 1500 && year < 1800) {
      return Math.floor(Math.random() * (11 - 7 + 1)) + 7;
    } else if (year >= 1800 && year <= 2024) {
      return Math.floor(Math.random() * (19 - 12 + 1)) + 12;
    } else {
      return 15;
    }
  }

  // 1.H.4.d. selectNewEvent
  const selectNewEvent = useCallback(
    async (events: Event[], referenceEvent: Event) => {
      if (!events || events.length === 0) {
        return null;
      }

      setEventCount((prev) => prev + 1);
      const localEventCount = eventCount + 1;

      const referenceYear = new Date(referenceEvent.date).getFullYear();

      const checkTimeJump = (): number => {
        let jumpDistance = 0;

        if (localEventCount === forcedJumpEventCount) {
          const forcedDistances = [500, 750, 1000];
          jumpDistance = forcedDistances[Math.floor(Math.random() * forcedDistances.length)];
        }

        if (referenceYear < 500) {
          if (localEventCount >= 1 && localEventCount <= 5) {
            const arr = [750, 1000];
            const chosen = arr[Math.floor(Math.random() * arr.length)];
            jumpDistance = Math.max(jumpDistance, chosen);
          }
        } else if (referenceYear >= 500 && referenceYear < 1000) {
          if (localEventCount >= 7 && localEventCount <= 12) {
            const arr = [500, 1000];
            const chosen = arr[Math.random() < 0.5 ? 0 : 1];
            jumpDistance = Math.max(jumpDistance, chosen);
          }
        } else if (referenceYear >= 1000 && referenceYear < 1800) {
          if (localEventCount >= 7 && localEventCount <= 12) {
            const arr = [400, 750];
            const chosen = arr[Math.random() < 0.5 ? 0 : 1];
            jumpDistance = Math.max(jumpDistance, chosen);
          }
        } else if (referenceYear >= 1800 && referenceYear <= 2024) {
          // Logique spéciale, possible saut forcé 12..19
        }

        return jumpDistance;
      };

      const timeJump = checkTimeJump();

      if (timeJump > 0) {
        const isForcedJump = localEventCount === forcedJumpEventCount;
        let mainDirection: "past" | "future" = "future";
        if (isForcedJump && !hasFirstForcedJumpHappened) {
          mainDirection = "past";
        }

        const getPastEvents = (dist: number): Event[] => {
          const targetYear = referenceYear - dist;
          return events.filter((evt) => {
            const y = new Date(evt.date).getFullYear();
            return y <= targetYear && !usedEvents.has(evt.id);
          });
        };
        const getFutureEvents = (dist: number): Event[] => {
          const targetYear = referenceYear + dist;
          return events.filter((evt) => {
            const y = new Date(evt.date).getFullYear();
            return y >= targetYear && !usedEvents.has(evt.id);
          });
        };

        let possibleEvents: Event[] =
          mainDirection === "past"
            ? getPastEvents(timeJump)
            : getFutureEvents(timeJump);

        if (possibleEvents.length === 0) {
          possibleEvents =
            mainDirection === "past"
              ? getFutureEvents(timeJump)
              : getPastEvents(timeJump);
        }

        if (possibleEvents.length > 0) {
          const chosen = possibleEvents[Math.floor(Math.random() * possibleEvents.length)];

          await updateGameState(chosen);
          setIsCountdownActive(true);

          await supabase
            .from("evenements")
            .update({
              frequency_score: (chosen as any).frequency_score + 1 || 1,
              last_used: new Date().toISOString(),
            })
            .eq("id", chosen.id);

          if (isForcedJump) {
            if (!hasFirstForcedJumpHappened) {
              setHasFirstForcedJumpHappened(true);
            }
            const landingYear = new Date(chosen.date).getFullYear();
            let nextIncrement = getNextForcedJumpIncrement(landingYear);
            const newForcedCount = localEventCount + nextIncrement;
            setForcedJumpEventCount(newForcedCount);
          }
          return chosen;
        }
      }

      const config = LEVEL_CONFIGS[user.level];
      if (!config) {
        return null;
      }

      const calculateDynamicTimeGap = (referenceDate: string) => {
        const nowY = new Date().getFullYear();
        const refY = new Date(referenceDate).getFullYear();
        const yearsFromPresent = nowY - refY;
        const proximityFactor = Math.max(0.2, Math.min(1, yearsFromPresent / 500));

        const baseGap = config.timeGap.base * proximityFactor;
        const minGap = config.timeGap.minimum * proximityFactor;
        const maxGap = config.timeGap.base * proximityFactor * 1.5;

        return { base: baseGap, min: minGap, max: maxGap };
      };

      const timeGap = calculateDynamicTimeGap(referenceEvent.date);

      const scoreEvent = (evt: Event, diff: number): number => {
        const randomFactor = 0.85 + Math.random() * 0.3;
        const idealGap = timeGap.base;

        const gapScore =
          35 * (1 - Math.abs(diff - idealGap) / idealGap) * randomFactor;

        const idealDifficulty = 2;
        const difficultyScore =
          25 *
          (1 - Math.abs(evt.niveau_difficulte - idealDifficulty) / 2) *
          randomFactor;

        const variationBonus = Math.random() * 10;

        return gapScore + difficultyScore + variationBonus;
      };

      const availableEvents = events.filter((e) => !usedEvents.has(e.id));
      const scoredEvents = availableEvents
        .map((e) => {
          const diff = getTimeDifference(e.date, referenceEvent.date);
          const s = scoreEvent(e, diff);
          return { event: e, timeDiff: diff, score: s };
        })
        .filter(
          ({ timeDiff }) => timeDiff >= timeGap.min && timeDiff <= timeGap.max
        )
        .sort((a, b) => b.score - a.score);

      if (scoredEvents.length === 0) {
        const relaxed = availableEvents
          .map((e) => {
            const diff = getTimeDifference(e.date, referenceEvent.date);
            const s = scoreEvent(e, diff);
            return { event: e, timeDiff: diff, score: s };
          })
          .filter(
            ({ timeDiff }) =>
              timeDiff >= timeGap.min * 0.5 && timeDiff <= timeGap.max * 2
          )
          .sort((a, b) => b.score - a.score);

        if (relaxed.length > 0) {
          const chosen = relaxed[0].event;

          await updateGameState(chosen);
          setIsCountdownActive(true);

          await supabase
            .from("evenements")
            .update({
              frequency_score: (chosen as any).frequency_score + 1 || 1,
              last_used: new Date().toISOString(),
            })
            .eq("id", chosen.id);

          setFallbackCountdown((prev) => prev - 1);
          return chosen;
        }

        const randomEvt =
          availableEvents[Math.floor(Math.random() * availableEvents.length)];
        if (randomEvt) {
          await updateGameState(randomEvt);
          setIsCountdownActive(true);

          await supabase
            .from("evenements")
            .update({
              frequency_score: (randomEvt as any).frequency_score + 1 || 1,
              last_used: new Date().toISOString(),
            })
            .eq("id", randomEvt.id);

          setFallbackCountdown((prev) => prev - 1);
          return randomEvt;
        }

        return null;
      }

      const { minDifficulty, maxDifficulty } = config.eventSelection;
      let selectedEvent: Event | null = null;
      let attempts = 0;
      const maxAttempts = 100;
      let currentMin = minDifficulty;
      let currentMax = maxDifficulty;

      while (!selectedEvent && attempts < maxAttempts) {
        attempts++;

        const filteredByDiff = scoredEvents.filter(
          ({ event }) =>
            event.niveau_difficulte >= currentMin &&
            event.niveau_difficulte <= currentMax
        );

        if (filteredByDiff.length > 0) {
          const rndIdx = Math.floor(Math.random() * filteredByDiff.length);
          selectedEvent = filteredByDiff[rndIdx].event;
        } else {
          currentMin = Math.max(1, currentMin - 1);
          currentMax = Math.min(3, currentMax + 1);

          if (currentMin === 1 && currentMax === 3) {
            break;
          }
        }
      }

      if (!selectedEvent) {
        selectedEvent =
          scoredEvents[Math.floor(Math.random() * scoredEvents.length)].event;
      }

      await updateGameState(selectedEvent);
      setIsCountdownActive(true);

      await supabase
        .from("evenements")
        .update({
          frequency_score: (selectedEvent as any).frequency_score + 1 || 1,
          last_used: new Date().toISOString(),
        })
        .eq("id", selectedEvent.id);

      setFallbackCountdown((prev) => prev - 1);
      return selectedEvent;
    },
    [
      user.level,
      usedEvents,
      fallbackCountdown,
      updateGameState,
      getTimeDifference,
      eventCount,
      forcedJumpEventCount,
      hasFirstForcedJumpHappened,
      setForcedJumpEventCount,
      setHasFirstForcedJumpHappened
    ]
  );

  // 1.H.5. updatePerformanceStats
  const updatePerformanceStats = useCallback((type: string, period: string, success: boolean) => {
    setPerformanceStats((prev) => {
      const typeSuccesses = Number(prev.typeSuccess[type]) || 0;
      const periodSuccesses = Number(prev.periodSuccess[period]) || 0;
      const totalAttemptsBefore = eventHistory.length;

      const typeSuccessRatio =
        (typeSuccesses + (success ? 1 : 0)) / (typeSuccesses + 1);

      const periodSuccessRatio =
        (periodSuccesses + (success ? 1 : 0)) / (periodSuccesses + 1);

      const overallAccuracy =
        (prev.overallAccuracy * totalAttemptsBefore + (success ? 1 : 0)) /
        (totalAttemptsBefore + 1);

      return {
        typeSuccess: {
          ...prev.typeSuccess,
          [type]: Number.isFinite(typeSuccessRatio) ? typeSuccessRatio : 0
        },
        periodSuccess: {
          ...prev.periodSuccess,
          [period]: Number.isFinite(periodSuccessRatio) ? periodSuccessRatio : 0
        },
        overallAccuracy: Number.isFinite(overallAccuracy)
          ? overallAccuracy
          : 0
      };
    });
  }, [eventHistory.length]);

  // 1.H.6. calculatePoints
  const calculatePoints = useCallback(
    (timeLeft: number, difficulty: number, streak: number, eventType: string): number => {
      try {
        const config = LEVEL_CONFIGS[user.level];
        const basePoints = config.scoring.basePoints * difficulty;

        const timeMultiplier = Math.min(
          1 + (timeLeft / 20) * config.scoring.timeMultiplier,
          2.5
        );
        const streakMultiplier = Math.min(
          1 + Math.floor(streak / config.scoring.comboThreshold) * config.scoring.streakMultiplier,
          3.0
        );

        const phaseMultiplier = 1; // Non utilisé pour l'instant

        const calculatedPoints = Math.floor(
          basePoints * timeMultiplier * streakMultiplier * phaseMultiplier
        );
        return Math.max(0, calculatedPoints);
      } catch (error) {
        return 0;
      }
    },
    [user.level]
  );

  // 1.H.7. applyReward
  const applyReward = useCallback((reward: { type: RewardType; amount: number }) => {
    try {
      const safeAmount = Math.max(0, Math.floor(Number(reward.amount) || 0));
      setUser((prev) => {
        const currentPoints = Math.max(0, Number(prev.points) || 0);
        const updatedPoints = currentPoints + safeAmount;
        return {
          ...prev,
          points: updatedPoints,
          lives:
            reward.type === RewardType.EXTRA_LIFE
              ? Math.min(prev.lives + 1, MAX_LIVES)
              : prev.lives
        };
      });
    } catch (error) {
      // Gestion silencieuse des erreurs
    }
  }, []);

  // 1.H.8. handleTimeout
  const handleTimeout = useCallback(() => {
    if (isLevelPaused) return;

    setUser((prev) => {
      const newLives = prev.lives - 1;
      console.log('[useGameLogicA] handleTimeout => user.lives going from', prev.lives, 'to', newLives);
      if (newLives <= 0) {
        console.log('[useGameLogicA] handleTimeout => user.lives = 0 => endGame() called.');
        endGame();
        return { ...prev, lives: newLives, streak: 0 };
      }
      return {
        ...prev,
        lives: newLives,
        streak: 0
      };
    });

    setStreak(0);

    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: false
    }).start();

    if (newEvent) {
      setPreviousEvent(newEvent);
      selectNewEvent(allEvents, newEvent);
    }
  }, [newEvent, allEvents, isLevelPaused, selectNewEvent, endGame, progressAnim]);

  // 1.H.9. handleChoice
  const handleChoice = useCallback(
    (choice: 'avant' | 'après') => {
      if (!previousEvent || !newEvent) {
        return;
      }
      if (isLevelPaused) {
        return;
      }

      // Désactivation immédiate du compte à rebours pour éviter les interférences
      setIsCountdownActive(false);

      const previousDate = new Date(previousEvent.date);
      const newDate = new Date(newEvent.date);
      const newIsBefore = newDate < previousDate;
      const newIsAfter = newDate > previousDate;

      const isAnswerCorrect =
        (choice === 'avant' && newIsBefore) ||
        (choice === 'après' && newIsAfter);

      console.log(`[useGameLogicA] handleChoice => choice = ${choice}, isAnswerCorrect = ${isAnswerCorrect}`);

      setIsCorrect(isAnswerCorrect);
      setShowDates(true);

      const eventSummaryItem: LevelEventSummary = {
        id: newEvent.id,
        titre: newEvent.titre,
        date: newEvent.date,
        date_formatee: newEvent.date_formatee || newEvent.date,
        illustration_url: newEvent.illustration_url,
        wasCorrect: isAnswerCorrect,
        responseTime: 20 - timeLeft,
        description_detaillee: newEvent.description_detaillee,
      };

      setIsWaitingForCountdown(true);

      if (isAnswerCorrect) {
        // CAS A : Réponse correcte

        // a) Son, streak, animation
        playCorrectSound();
        const newStreak = streak + 1;
        setStreak(newStreak);

        Animated.timing(progressAnim, {
          toValue: newStreak,
          duration: 500,
          useNativeDriver: false,
        }).start();

        updatePerformanceStats(
          newEvent.types_evenement?.[0] || 'default',
          getPeriod(newEvent.date),
          true
        );

        const pts = calculatePoints(
          timeLeft,
          newEvent.niveau_difficulte || 1,
          newStreak,
          'default'
        );

        checkRewards({ type: 'streak', value: newStreak }, user);

        // IMPORTANT : Construction du tableau mis à jour des événements de niveau
        const updatedEventSummary = [...currentLevelEvents, eventSummaryItem];

        // [ADDED LOG]
        console.log('[useGameLogicA] handleChoice => adding eventSummaryItem to updatedEventSummary (correct), new length =', updatedEventSummary.length);

        // Mise à jour de levelCompletedEvents pour le récapitulatif du niveau terminé (pour LevelUpModalBis)
        setLevelCompletedEvents(updatedEventSummary);

        // e) Mise à jour du user avec les points et gestion du niveau
        setUser((prev) => {
          const currentPoints = Math.max(0, Number(prev.points) || 0);
          const updatedPoints = currentPoints + pts;
          const eventsCount = prev.eventsCompletedInLevel + 1;
          const updatedUser = {
            ...prev,
            points: updatedPoints,
            streak: newStreak,
            maxStreak: Math.max(prev.maxStreak, newStreak),
            eventsCompletedInLevel: eventsCount,
          };

          // Vérifier s'il faut monter de niveau
          if (eventsCount >= LEVEL_CONFIGS[prev.level].eventsNeeded) {
            const nextLevel = prev.level + 1;
            updatedUser.level = nextLevel;
            updatedUser.eventsCompletedInLevel = 0;

            // On marque la progression du niveau courant en intégrant tous les événements, y compris le dernier
            setPreviousEvent(newEvent);
            // Mise à jour de l'historique global avec une copie des événements du niveau terminé
            finalizeCurrentLevelHistory(updatedEventSummary);

            // On bascule sur la config du nouveau niveau
            setCurrentLevelConfig(() => ({
              ...LEVEL_CONFIGS[nextLevel],
              eventsSummary: [],
            }));
            setCurrentLevelEvents([]);
            setShowLevelModal(true);
            setIsLevelPaused(true);
            playLevelUpSound();

            // INTÉGRATION PUBLICITÉ : Affichage de la pub après certains niveaux
            if (prev.level === 1 || prev.level === 6) {
              setPendingAdDisplay("levelUp");
            }

            // On check la reward (changement de level)
            checkRewards({ type: 'level', value: nextLevel }, updatedUser);

          } else {
            // Sinon, on met à jour le state des événements de niveau avec le tableau mis à jour
            setCurrentLevelEvents(updatedEventSummary);

            // Au bout de 750ms, on repasse isWaitingForCountdown à false, et on enchaîne
            setTimeout(() => {
              setIsWaitingForCountdown(false);
              if (!isGameOver && !showLevelModal) {
                setPreviousEvent(newEvent);
                selectNewEvent(allEvents, newEvent);
              }
            }, 750);
          }
          return updatedUser;
        });

      } else {
        // CAS B : Réponse incorrecte

        // a) Son, remise à zéro du streak, animation
        playIncorrectSound();
        setStreak(0);

        Animated.timing(progressAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: false,
        }).start();

        updatePerformanceStats(
          newEvent.types_evenement?.[0] || 'default',
          getPeriod(newEvent.date),
          false
        );

        // c) Retrait d'une vie
        setUser((prev) => {
          const updatedLives = prev.lives - 1;
          console.log('[useGameLogicA] handleChoice => user.lives was decremented => newLives:', updatedLives);
          if (updatedLives <= 0) {
            console.log('[useGameLogicA] handleChoice => user.lives = 0 => endGame() called.');
            endGame();
          }
          return {
            ...prev,
            lives: updatedLives,
            streak: 0,
          };
        });

        // d) Stockage de l'eventSummaryItem
        setCurrentLevelEvents((prev) => {
          const newArray = [...prev, eventSummaryItem];
          // [ADDED LOG]
          console.log('[useGameLogicA] handleChoice => adding eventSummaryItem to currentLevelEvents (incorrect), new length =', newArray.length);
          return newArray;
        });

        // e) Au bout de 1.5s, on réactive les boutons et on enchaîne
        setTimeout(() => {
          setIsWaitingForCountdown(false);

          if (!isGameOver && !showLevelModal) {
            setPreviousEvent(newEvent);
            selectNewEvent(allEvents, newEvent);
          }
        }, 1500);
      }
    },
    [
      previousEvent,
      newEvent,
      streak,
      timeLeft,
      isLevelPaused,
      isGameOver,
      showLevelModal,
      getPeriod,
      calculatePoints,
      playCorrectSound,
      playIncorrectSound,
      checkRewards,
      selectNewEvent,
      currentLevelEvents,
      endGame,
      updatePerformanceStats,
      allEvents,
      progressAnim,
      user,
      playLevelUpSound,
      finalizeCurrentLevelHistory
    ]
  );

  // 1.H.10. handleLevelUp
  const handleLevelUp = useCallback(() => {
    // Incrémente le niveau de l'utilisateur et réinitialise le compteur d'événements du niveau
    setUser((prev) => {
      const nextLevel = prev.level + 1;
      return { ...prev, level: nextLevel, eventsCompletedInLevel: 0 };
    });
    // Mise à jour de la configuration pour le nouveau niveau
    setCurrentLevelConfig(() => ({
      ...LEVEL_CONFIGS[user.level + 1],
      eventsSummary: []
    }));
    // Réinitialisation des événements de niveau et affichage du modal de montée de niveau
    setCurrentLevelEvents([]);
    setShowLevelModal(true);
    setIsLevelPaused(true);
    playLevelUpSound();
    // Vérification des récompenses liées au passage de niveau
    checkRewards({ type: 'level', value: user.level + 1 }, user);
  }, [user, playLevelUpSound, checkRewards]);

  // 1.H.11. endGame
  const endGame = useCallback(async () => {
    console.log('[useGameLogicA] endGame called => finalizing current level history');
    // Si levelCompletedEvents est vide, on utilise currentLevelEvents
    const eventsToFinalize = levelCompletedEvents.length > 0 ? levelCompletedEvents : currentLevelEvents;
    console.log('[useGameLogicA] endGame => eventsToFinalize:', eventsToFinalize);
    finalizeCurrentLevelHistory(eventsToFinalize);
    console.log('[useGameLogicA] endGame => finalizeCurrentLevelHistory has been called, levelsHistory should be updated soon.');

    setIsGameOver(true);
    console.log('[useGameLogicA] endGame => setIsGameOver(true) now');
    playGameOverSound();
    setLeaderboardsReady(false);

    // Affichage d'une publicité de fin de jeu si les conditions sont remplies
    setTimeout(() => {
      if (canShowAd()) {
        if (adState.gameOverInterstitialLoaded) {
          try {
            console.log('Showing game over interstitial ad');
            gameOverInterstitial.show();
          } catch (error) {
            console.error('Error showing game over ad:', error);
            gameOverInterstitial.load();
          }
        } else if (adState.interstitialLoaded) {
          console.log('No game over ad loaded, showing generic interstitial instead');
          genericInterstitial.show();
        } else {
          console.log('No ads available for game over');
        }
      } else {
        console.log('Cannot show ad at game over due to ad-free period or frequency cap');
      }
    }, 2000); // Délai de 2 secondes avant d'afficher la pub de fin de jeu

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser?.id) {
        const guestScores = {
          daily: [{
            name: user.name || 'Voyageur',
            score: user.points,
            rank: 1
          }],
          monthly: [{
            name: "👑 Meilleur score",
            score: 12500,
            rank: 1
          }],
          allTime: [{
            name: "🏆 Record",
            score: 25000,
            rank: 1
          }]
        };
        
        setLeaderboards(guestScores);
        setLeaderboardsReady(true);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const firstDayOfMonth = `${today.substring(0, 7)}-01`;

      await supabase.from('game_scores').insert({
        user_id: authUser.id,
        display_name: user.name,
        score: user.points,
        created_at: new Date().toISOString()
      });

      const { data: dailyScores } = await supabase
        .from('game_scores')
        .select('display_name, score')
        .gte('created_at', today)
        .order('score', { ascending: false })
        .limit(5);

      const { data: monthlyScores } = await supabase
        .from('game_scores')
        .select('display_name, score')
        .gte('created_at', firstDayOfMonth)
        .order('score', { ascending: false })
        .limit(5);

      const { data: allTimeScores } = await supabase
        .from('profiles')
        .select('display_name, high_score')
        .order('high_score', { ascending: false })
        .limit(5);

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('high_score')
        .eq('id', authUser.id)
        .single();

      if (currentProfile && user.points > currentProfile.high_score) {
        await supabase
          .from('profiles')
          .update({ high_score: user.points })
          .eq('id', authUser.id);
      }

      if (dailyScores && monthlyScores && allTimeScores) {
        setScoresAndShow(dailyScores, monthlyScores, allTimeScores);
      }
      await saveProgress();
    } catch (error) {
      const fallbackScores = {
        daily: [{
          name: user.name || 'Voyageur',
          score: user.points,
          rank: 1
        }],
        monthly: [{
          name: "👑 Meilleur score",
          score: 12500,
          rank: 1
        }],
        allTime: [{
          name: "🏆 Record",
          score: 25000,
          rank: 1
        }]
      };
      
      setLeaderboards(fallbackScores);
      setLeaderboardsReady(true);
    }
  }, [
    user, 
    playGameOverSound, 
    saveProgress, 
    finalizeCurrentLevelHistory, 
    levelCompletedEvents, 
    currentLevelEvents,
    adState.gameOverInterstitialLoaded,
    adState.interstitialLoaded,
    canShowAd
  ]);

  // 1.H.12. saveProgress
  const saveProgress = useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        return;
      }

      const saveData = {
        high_score: Math.max(user.points, highScore),
        current_level: user.level,
        total_events_completed: user.totalEventsCompleted,
        last_played: new Date().toISOString()
      };
      await supabase.from('profiles').update(saveData).eq('id', authUser.id);
    } catch (error) {
      // Gestion silencieuse des erreurs
    }
  }, [user.points, user.level, user.totalEventsCompleted, highScore]);

  // 1.H.13. setScoresAndShow
  const setScoresAndShow = (
    dailyScores: any[],
    monthlyScores: any[],
    allTimeScores: any[]
  ) => {
    const formatted = {
      daily: dailyScores.map((score, index) => ({
        name: score.display_name.trim(),
        score: score.score,
        rank: index + 1
      })),
      monthly: monthlyScores.map((score, index) => ({
        name: score.display_name.trim(),
        score: score.score,
        rank: index + 1
      })),
      allTime: allTimeScores.map((score, index) => ({
        name: score.display_name.trim(),
        score: score.high_score || 0,
        rank: index + 1
      }))
    };
    setLeaderboards(formatted);
    setLeaderboardsReady(true);
  };

  // 1.H.15. startLevel - MODIFICATION IMPORTANTE ICI POUR LA GESTION DES PUBLICITÉS
  const startLevel = useCallback(() => {
    setShowLevelModal(false);
    setIsLevelPaused(false);
    setIsCountdownActive(true);
    setTimeLeft(20);
    setLevelCompletedEvents([]); // Réinitialisation du récapitulatif du niveau en cours

    // Affichage de l'interstitial ad si en attente et si les conditions sont remplies
    if (pendingAdDisplay === "levelUp" && canShowAd()) {
      if (adState.levelUpInterstitialLoaded) {
        try {
          console.log('Showing level up interstitial ad');
          levelUpInterstitial.show();
        } catch (error) {
          console.error('Error showing level up ad:', error);
          // Recharger l'annonce en cas d'erreur
          levelUpInterstitial.load();
        }
      } else if (adState.interstitialLoaded) {
        console.log('Level up ad not loaded, showing generic interstitial instead');
        genericInterstitial.show();
      } else {
        console.log('No ads available to show for level up');
      }
      setPendingAdDisplay(null);
    }

    if (previousEvent) {
      selectNewEvent(allEvents, previousEvent);
    }
  }, [
    allEvents, 
    previousEvent, 
    selectNewEvent, 
    pendingAdDisplay, 
    canShowAd, 
    adState.levelUpInterstitialLoaded, 
    adState.interstitialLoaded
  ]);

  // --- Nouvelle useEffect pour réinitialiser l'audio au montage (pour éviter le problème de son après un replay) ---
  useEffect(() => {
    playCountdownSound();
  }, []);

  /* 1.I. Retour du hook */
  return {
    user,
    previousEvent,
    newEvent,
    timeLeft,
    loading,
    error,
    isGameOver: isGameOver && leaderboardsReady,
    showDates,
    isCorrect,
    isImageLoaded,
    streak,
    highScore,
    showLevelModal,
    isLevelPaused,
    currentLevelConfig,
    leaderboards,
    performanceStats,
    categoryMastery,
    periodStats,
    activeBonus,

    currentReward,
    completeRewardAnimation,
    updateRewardPosition,

    handleChoice,
    startLevel,
    handleLevelUp,
    showRewardedAd, // Nouvelle fonction exposée pour montrer des pubs récompensées

    remainingEvents: allEvents.length - usedEvents.size,

    progressAnim,

    onImageLoad: handleImageLoad,

    levelCompletedEvents,
    levelsHistory, // Historique complet des niveaux (utilisé pour le game over)
    
    // Nouvelles propriétés pour l'état publicitaire
    adState: {
      hasRewardedAd: adState.rewardedLoaded,
      isAdFree: Date.now() < adState.adFreeUntil,
      adFreeTimeRemaining: Math.max(0, (adState.adFreeUntil - Date.now()) / 1000)
    }
  };
}

export default useGameLogicA;