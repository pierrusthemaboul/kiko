// -----------------------------------------------------------------------------
// ON arrive trop souvent avant l'n 500. C'est à cause des sauts. Tu crois que 
// sans affecter la performance de l'appli on pourrait :
// Comprendre les périodes dans lesquelles les joueurs ont été et adapter 
// les sauts en fonction ?
/************************************************************************************
 * 1. HOOK PRINCIPAL : useGameLogicA
 *
 * 1.A. Description
 *     Hook de logique de jeu principal. Gère la logique de sélection d'événements,
 *     le scoring, la gestion du niveau, l'audio, les récompenses et la fin de partie.
 *
 * 1.B. Paramètres
 *     @param {string} initialEvent - Identifiant éventuel d'un événement initial.
 *
 * 1.C. Retour
 *     {object} - Ensemble d'états et de fonctions utiles au jeu (user, événements, etc.).
 ************************************************************************************/

/* 1.D. Imports et Types */

// 1.D.1. Librairies / Modules
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase/supabaseClients';
import useRewards from './useRewards';
import useAudio from './useAudio';
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
  LevelPerformance,
  ActiveBonus
} from './types';
import { LEVEL_CONFIGS } from './levelConfigs';
import { Animated } from 'react-native';
// ------------------ INTÉGRATION DE LA PUBLICITÉ ------------------
// Import des modules de publicité de react-native-google-mobile-ads
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

// Création de l'annonce interstitielle en mode test
const interstitialAd = InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL, {
  requestNonPersonalizedAdsOnly: true,
});
// ------------------------------------------------------------------

/* 1.E. Hook : useGameLogicA */

/**
 * Hook de logique de jeu (quiz historique).
 * @function useGameLogicA
 * @param {string} initialEvent - Optionnel, événement de départ.
 * @returns {Object} - Toutes les données et fonctions nécessaires au jeu.
 */
export function useGameLogicA(initialEvent: string) {

  /* 1.E.1. (Récompenses - système) */
  const {
    currentReward,
    checkRewards,
    completeRewardAnimation,
    updateRewardPosition
  } = useRewards({
    onRewardEarned: (reward) => {
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

  /* 1.E.7. (Chargement d’image) */
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
    ...LEVEL_CONFIGS[1], // Initialisation avec la config du niveau 1
    eventsSummary: []     // Initialisation de eventsSummary comme un tableau vide
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

  /* ******* INTÉGRATION DE LA PUBLICITÉ ******* */
  // État pour suivre le chargement de l'annonce interstitielle
  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    const adLoadedListener = interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      setAdLoaded(true);
      console.log("Interstitial ad loaded");
    });
    const adErrorListener = interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
      console.log("Interstitial ad error: ", error);
    });
    interstitialAd.load();
    return () => {
      adLoadedListener();
      adErrorListener();
    };
  }, []);
  /* ******* FIN INTÉGRATION PUBLICITÉ ******* */

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

  /* 1.H. Regroupement des fonctions internes */

  // 1.H.1. initGame
  /**
   * 1.H.1. Initialisation du jeu (fetch user, config niveau 1, etc.)
   * @async
   * @function initGame
   * @returns {void}
   */
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

      // --- MODIFICATION ICI : Sélection des événements de niveau 1 uniquement ---
      const level1Events = validEvents.filter((e) => e.niveau_difficulte === 1);

      if (level1Events.length < 2) {
        throw new Error("Pas d'événements adaptés au niveau 1 disponibles");
      }
      // --- FIN DE LA MODIFICATION ---

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
        throw new Error('Aucun second événement ne répond à l’écart minimal de 500 ans');
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
  /**
   * 1.H.2. Récupération des données user (profils, high score)
   * @async
   * @function fetchUserData
   * @returns {void}
   */
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
      // Gestion des erreurs si nécessaire
    }
  };

  // 1.H.3. handleImageLoad
  /**
   * 1.H.3. Gère la fin de chargement d'image pour activer le compte à rebours
   * @function handleImageLoad
   * @returns {void}
   */
  const handleImageLoad = () => {
    setIsImageLoaded(true);
    if (!isLevelPaused) {
      setIsCountdownActive(true);
    }
  };

  // 1.H.4. Fonctions updateGameState et selectNewEvent

  // 1.H.4.a. getTimeDifference
  /**
   * 1.H.4.a. Calcule la différence en années entre deux dates (approx.)
   * @function getTimeDifference
   * @param {string} date1
   * @param {string} date2
   * @returns {number} - Différence en années
   */
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
  /**
   * 1.H.4.b. Détermine la période historique à partir d’une date
   * @function getPeriod
   * @param {string} date
   * @returns {HistoricalPeriod}
   */
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
  /**
   * 1.H.4.c. Met à jour l’état du jeu après sélection d’un événement
   * @async
   * @function updateGameState
   * @param {Event} selectedEvent
   * @returns {Promise<void>}
   */
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
      // Gestion des erreurs si nécessaire
    }
  }, [getPeriod]);

  // 1.H.4.d.0 getNextForcedJumpIncrement
  /**
   * 1.H.4.d.0 Détermine l'intervalle du prochain saut forcé en fonction de l'année d'atterrissage
   * @function getNextForcedJumpIncrement
   * @param {number} year - Année d'atterrissage
   * @returns {number} - Incrément (nombre d'événements) avant le prochain saut forcé
   */
  function getNextForcedJumpIncrement(year: number): number {
    if (year < 500) {
      // Période < 500 => +[1..5]
      return Math.floor(Math.random() * (5 - 1 + 1)) + 1; 
    } else if (year >= 500 && year < 700) {
      // Période 500..699 => +[6..9]
      return Math.floor(Math.random() * (9 - 6 + 1)) + 6;
    } else if (year >= 700 && year < 1000) {
      // Période 700..999 => +[6..9]
      return Math.floor(Math.random() * (9 - 6 + 1)) + 6;
    } else if (year >= 1000 && year < 1500) {
      // Période 1000..1499 => +[6..9]
      return Math.floor(Math.random() * (9 - 6 + 1)) + 6;
    } else if (year >= 1500 && year < 1800) {
      // Période 1500..1799 => +[7..11]
      return Math.floor(Math.random() * (11 - 7 + 1)) + 7;
    } else if (year >= 1800 && year <= 2024) {
      // Période 1800..2024 => +[12..19]
      return Math.floor(Math.random() * (19 - 12 + 1)) + 12;
    } else {
      // Au-delà de 2024 => Incrément arbitraire
      return 15;
    }
  }

  // 1.H.4.d. selectNewEvent
  /**
   * 1.H.4.d. Sélectionne un nouvel événement en se basant sur la configuration de niveau
   * et gère la logique des sauts forcés.
   *
   * @async
   * @function selectNewEvent
   * @param {Event[]} events - Liste complète d'événements disponibles
   * @param {Event} referenceEvent - Événement de référence pour calculer la période/année
   * @returns {Promise<Event|null>} - L'événement sélectionné ou null si aucun événement n'est disponible
   */
  const selectNewEvent = useCallback(
    async (events: Event[], referenceEvent: Event) => {
      // 1) Vérifications initiales
      if (!events || events.length === 0) {
        return null;
      }

      // 2) Incrémentation du compteur d'événements joués
      setEventCount((prev) => prev + 1);
      const localEventCount = eventCount + 1; // Valeur mise à jour

      // 3) Année de référence
      const referenceYear = new Date(referenceEvent.date).getFullYear();

      // 4) checkTimeJump : détermine s'il y a un saut forcé ou conditionnel
      const checkTimeJump = (): number => {
        let jumpDistance = 0;

        // A) Saut forcé strict (si localEventCount == forcedJumpEventCount)
        if (localEventCount === forcedJumpEventCount) {
          const forcedDistances = [500, 750, 1000];
          jumpDistance =
            forcedDistances[Math.floor(Math.random() * forcedDistances.length)];
        }

        // B) Sauts conditionnels selon la période (limités à 1000 ans max)
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
          // Vous pouvez ajouter ici des conditions supplémentaires si nécessaire
        }

        return jumpDistance;
      };

      const timeJump = checkTimeJump();

      // 5) Si timeJump > 0 => on tente un “événement lointain”
      if (timeJump > 0) {
        const isForcedJump = localEventCount === forcedJumpEventCount;

        // Déterminer la direction du saut
        let mainDirection: "past" | "future" = "future";
        if (isForcedJump && !hasFirstForcedJumpHappened) {
          mainDirection = "past";
        }

        /**
         * Helpers pour récupérer des événements passés ou futurs
         */
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

        // 5.1. On tente d'abord la direction principale
        let possibleEvents: Event[] =
          mainDirection === "past"
            ? getPastEvents(timeJump)
            : getFutureEvents(timeJump);

        // 5.2. Si rien dans ce sens, on tente l'autre sens
        if (possibleEvents.length === 0) {
          possibleEvents =
            mainDirection === "past"
              ? getFutureEvents(timeJump)
              : getPastEvents(timeJump);
          // Si des événements sont trouvés dans l'autre direction
          // Vous pouvez ajouter une logique supplémentaire ici si nécessaire
        }

        // 5.3. Sélection finale s'il existe des événements possibles
        if (possibleEvents.length > 0) {
          const chosen =
            possibleEvents[Math.floor(Math.random() * possibleEvents.length)];

          // Mise à jour du jeu
          await updateGameState(chosen);
          setIsCountdownActive(true);

          // Incrément de frequency_score en base
          await supabase
            .from("evenements")
            .update({
              frequency_score: (chosen as any).frequency_score + 1 || 1,
              last_used: new Date().toISOString(),
            })
            .eq("id", chosen.id);

          // 5.4. Gestion du recalcul du prochain saut forcé
          if (isForcedJump) {
            // Si c'était le tout premier saut forcé
            if (!hasFirstForcedJumpHappened) {
              setHasFirstForcedJumpHappened(true);
            }

            // Déterminer la période d'atterrissage de l'événement choisi
            const landingYear = new Date(chosen.date).getFullYear();

            // Calculer l'incrément du prochain saut forcé selon la période d'atterrissage
            let nextIncrement = 0;
            if (landingYear < 500) {
              // Sauts forcés suivants => +[1..5]
              nextIncrement = Math.floor(Math.random() * (5 - 1 + 1)) + 1;
            } else if (landingYear >= 500 && landingYear < 700) {
              // +[6..9]
              nextIncrement = Math.floor(Math.random() * (9 - 6 + 1)) + 6;
            } else if (landingYear >= 700 && landingYear < 1000) {
              // +[6..9]
              nextIncrement = Math.floor(Math.random() * (9 - 6 + 1)) + 6;
            } else if (landingYear >= 1000 && landingYear < 1500) {
              // +[6..9]
              nextIncrement = Math.floor(Math.random() * (9 - 6 + 1)) + 6;
            } else if (landingYear >= 1500 && landingYear < 1800) {
              // +[7..11]
              nextIncrement = Math.floor(Math.random() * (11 - 7 + 1)) + 7;
            } else if (landingYear >= 1800 && landingYear <= 2024) {
              // +[12..19]
              nextIncrement = Math.floor(Math.random() * (19 - 12 + 1)) + 12;
            } else {
              // Au-delà de 2024 => à adapter selon vos besoins
              nextIncrement = 15; // arbitraire
            }

            // Mise à jour de forcedJumpEventCount
            const newForcedCount = localEventCount + nextIncrement;
            setForcedJumpEventCount(newForcedCount);
          }

          // On retourne l'événement spécial sélectionné
          return chosen;
        }

        // Si aucun événement n'est trouvé, on poursuit en logique normale
      } // fin if (timeJump > 0)

      // 6) Logique normale (pas de saut forcé ou échec de recherche d'événements lointains)
      const config = LEVEL_CONFIGS[user.level];
      if (!config) {
        return null;
      }

      /**
       * Calcule l'écart de temps dynamique (min / base / max) en fonction 
       * de la distance à l'année actuelle
       */
      const calculateDynamicTimeGap = (referenceDate: string) => {
        const nowY = new Date().getFullYear();
        const refY = new Date(referenceDate).getFullYear();
        const yearsFromPresent = nowY - refY;
        // proportionnel : plus on est loin de l'époque moderne, plus on élargit les gaps
        const proximityFactor = Math.max(0.2, Math.min(1, yearsFromPresent / 500));

        const baseGap = config.timeGap.base * proximityFactor;
        const minGap = config.timeGap.minimum * proximityFactor;
        const maxGap = config.timeGap.base * proximityFactor * 1.5;

        return { base: baseGap, min: minGap, max: maxGap };
      };

      const timeGap = calculateDynamicTimeGap(referenceEvent.date);

      /**
       * scoreEvent : calcule un score pour un événement donné
       */
      const scoreEvent = (evt: Event, diff: number): number => {
        const randomFactor = 0.85 + Math.random() * 0.3;
        const idealGap = timeGap.base;

        // Score basé sur l'écart par rapport à l'idealGap
        const gapScore =
          35 * (1 - Math.abs(diff - idealGap) / idealGap) * randomFactor;

        // Score basé sur la difficulté (cible : difficulté ~2)
        const idealDifficulty = 2;
        const difficultyScore =
          25 *
          (1 - Math.abs(evt.niveau_difficulte - idealDifficulty) / 2) *
          randomFactor;

        // Petit bonus aléatoire
        const variationBonus = Math.random() * 10;

        return gapScore + difficultyScore + variationBonus;
      };

      // 6.1. Filtrage des événements non utilisés
      const availableEvents = events.filter((e) => !usedEvents.has(e.id));

      // 6.2. Score et tri
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

      // 6.3. Si aucun événement ne rentre dans la plage stricte => on fait une recherche relaxée
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

        // 6.4. Sinon => on prend un événement aléatoire
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

      // 6.5. S’il y a des événements dans la plage stricte => sélection par difficulté [min..max]
      const { minDifficulty, maxDifficulty } = config.eventSelection;
      let selectedEvent: Event | null = null;
      let attempts = 0;
      const maxAttempts = 100;
      let currentMin = minDifficulty;
      let currentMax = maxDifficulty;

      // Boucle de recherche selon la difficulté (on élargit si on ne trouve rien)
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
            break; // on arrête si tout est déjà élargi
          }
        }
      }

      // Si toujours rien trouvé, on pioche au hasard dans la liste scoredEvents
      if (!selectedEvent) {
        selectedEvent =
          scoredEvents[Math.floor(Math.random() * scoredEvents.length)].event;
      }

      // Mise à jour du jeu avec l’événement sélectionné
      await updateGameState(selectedEvent);
      setIsCountdownActive(true);

      await supabase
        .from("evenements")
        .update({
          frequency_score: (selectedEvent as any).frequency_score + 1 || 1,
          last_used: new Date().toISOString(),
        })
        .eq("id", selectedEvent.id);

      // On décrémente le fallbackCountdown (mécanisme secondaire)
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
      setForcedJumpEventCount,
      hasFirstForcedJumpHappened,
      setHasFirstForcedJumpHappened
    ]
  );

  // 1.H.5. updatePerformanceStats
  /**
   * 1.H.5. Met à jour les statistiques de performance de l’utilisateur
   * @function updatePerformanceStats
   * @param {string} type
   * @param {string} period
   * @param {boolean} success
   * @returns {void}
   */
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
  /**
   * 1.H.6. Calcule le nombre de points gagnés en fonction du temps, difficulté, streak, etc.
   * @function calculatePoints
   * @param {number} timeLeft
   * @param {number} difficulty
   * @param {number} streak
   * @param {string} eventType
   * @returns {number}
   */
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

        const phaseMultiplier = 1; // Non utilisé pour l’instant

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
  /**
   * 1.H.7. Applique la récompense obtenue (vie supplémentaire, points, etc.)
   * @function applyReward
   * @param {{ type: RewardType; amount: number }} reward
   * @returns {void}
   */
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
      // Rien
    }
  }, []);

  // 1.H.8. handleTimeout
  /**
   * 1.H.8. Gère la fin de timer (temps écoulé => perte de vie)
   * @function handleTimeout
   * @returns {void}
   */
  const handleTimeout = useCallback(() => {
    if (isLevelPaused) return;

    setUser((prev) => {
      const newLives = prev.lives - 1;
      if (newLives <= 0) {
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

  /**
   * 1.H.9. handleChoice
   * Gère la réponse de l’utilisateur : "avant" ou "après"
   * @function handleChoice
   * @param {'avant' | 'après'} choice
   * @returns {void}
   */
  const handleChoice = useCallback(
    (choice: 'avant' | 'après') => {

      // 1) Vérifications préliminaires
      if (!previousEvent) {
        return;
      }
      if (!newEvent) {
        return;
      }
      if (isLevelPaused) {
        return;
      }

      // 2) Déterminer si la réponse est correcte (avant ou après)
      const previousDate = new Date(previousEvent.date);
      const newDate = new Date(newEvent.date);
      const newIsBefore = newDate < previousDate;  // "nouvel événement avant l'ancien ?"
      const newIsAfter = newDate > previousDate;   // "nouvel événement après l'ancien ?"

      const isAnswerCorrect =
        (choice === 'avant' && newIsBefore) ||
        (choice === 'après' && newIsAfter);

      // 3) On met à jour l'affichage : la date et le statut correct/incorrect
      setIsCorrect(isAnswerCorrect);
      setShowDates(true);

      // 4) Préparation de l'EventSummary
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

      // 5) On bloque temporairement les boutons (isWaitingForCountdown)
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

        // b) Update performance stats
        updatePerformanceStats(
          newEvent.types_evenement?.[0] || 'default',
          getPeriod(newEvent.date),
          true
        );

        // c) Calcul des points
        const pts = calculatePoints(
          timeLeft,
          newEvent.niveau_difficulte || 1,
          newStreak,
          'default'
        );

        // d) Check des rewards (streak)
        checkRewards({ type: 'streak', value: newStreak }, user);

        // IMPORTANT : Calcul de l'array mis à jour des événements de niveau
        const updatedEventSummary = [...currentLevelEvents, eventSummaryItem];

        // e) Mise à jour du user avec les points (si >0) et gestion du niveau
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
            setLevelCompletedEvents((prevEvents) => [
              ...prevEvents,
              ...updatedEventSummary,
            ]);
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
            if (prev.level === 6 && adLoaded) {
              interstitialAd.show();
            }
            if (prev.level === 10 && adLoaded) {
              interstitialAd.show();
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

        // b) Stats
        updatePerformanceStats(
          newEvent.types_evenement?.[0] || 'default',
          getPeriod(newEvent.date),
          false
        );

        // c) Retrait d'une vie
        setUser((prev) => {
          const updatedLives = prev.lives - 1;

          if (updatedLives <= 0) {
            endGame();
          }
          return {
            ...prev,
            lives: updatedLives,
            streak: 0,
          };
        });

        // d) Stockage de l'eventSummaryItem
        setCurrentLevelEvents((prev) => [...prev, eventSummaryItem]);

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
      playLevelUpSound
    ]
  );

  /* ******* MODIFICATION ******* */
  // 1.H.10. handleLevelUp (correction du bug de type)
  const handleLevelUp = useCallback(() => {
    setUser(prevUser => {
      const nextLevel = prevUser.level + 1;
      const config = LEVEL_CONFIGS[nextLevel];
      if (!config) {
        return prevUser;
      }

      setCurrentLevelConfig(prevConf => ({
        ...config,
        eventsSummary: [...(prevConf?.eventsSummary || []), ...currentLevelEvents]
      }));

      setShowLevelModal(true);
      setIsLevelPaused(true);
      setIsCountdownActive(false);
      setCurrentLevelEvents([]);

      const reward: { type: RewardType; amount: number } = {
        type: RewardType.POINTS,
        amount: config.pointsReward || 500
      };
      applyReward(reward);
      saveProgress();

      return {
        ...prevUser,
        level: nextLevel
      };
    });
  }, [currentLevelEvents, applyReward, saveProgress]);

  // 1.H.11. endGame
  /**
   * 1.H.11. Termine la partie et sauvegarde le score (classements)
   * @async
   * @function endGame
   * @returns {Promise<void>}
   */
  const endGame = useCallback(async () => {
    setIsGameOver(true);
    playGameOverSound();
    setLeaderboardsReady(false);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      // Mode invité
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

      // Mode utilisateur connecté
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
      // En cas d'erreur, afficher au moins les scores de l'invité
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
  }, [user, playGameOverSound, saveProgress]);

  // 1.H.12. saveProgress
  /**
   * 1.H.12. Sauvegarde le progrès (niveau, score)
   * @async
   * @function saveProgress
   * @returns {Promise<void>}
   */
  const saveProgress = useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const saveData = {
        high_score: Math.max(user.points, highScore),
        current_level: user.level,
        total_events_completed: user.totalEventsCompleted,
        last_played: new Date().toISOString()
      };
      await supabase.from('profiles').update(saveData).eq('id', authUser.id);
    } catch (error) {
      // Gestion des erreurs si nécessaire
    }
  }, [user.points, user.level, user.totalEventsCompleted, highScore]);

  // 1.H.13. setScoresAndShow
  /**
   * 1.H.13. Met en forme les tableaux de scores et affiche le leaderboard
   * @function setScoresAndShow
   * @param {any[]} dailyScores
   * @param {any[]} monthlyScores
   * @param {any[]} allTimeScores
   * @returns {void}
   */
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

  /* ******* MODIFICATION ******* */
  // 1.H.15. startLevel
  /**
   * 1.H.15. Lance le niveau (ferme le modal et relance la sélection d’événements)
   * @function startLevel
   * @returns {void}
   */
  const startLevel = useCallback(() => {
    setShowLevelModal(false);
    setIsLevelPaused(false);
    setIsCountdownActive(true);
    setTimeLeft(20);

    setLevelCompletedEvents([]); // On vide les événements du niveau terminé

    if (previousEvent) {
      selectNewEvent(allEvents, previousEvent);
    } else {
      // Aucun événement précédent, aucune action spécifique définie
    }
  }, [allEvents, previousEvent, selectNewEvent]);


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

    remainingEvents: allEvents.length - usedEvents.size,

    progressAnim,

    onImageLoad: handleImageLoad,

    /* ******* NOUVELLE VALEUR RETOURNÉE ******* */
    levelCompletedEvents,
  };
}
