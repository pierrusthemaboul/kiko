import { useState, useCallback, useMemo, useRef } from 'react';
import { FirebaseAnalytics } from '../../lib/firebase';
import { Event, HistoricalPeriod } from '../types';
import { devLog } from '../../utils/devLog';
import { LEVEL_CONFIGS } from '../levelConfigs';
import { explainEnabled, explainLog, createExclusionAccumulator } from '../../utils/explain';
import { getWeightsForLevel } from '../../lib/selectionWeights';

// Constantes pour limiter les événements antiques
const ANTIQUE_EVENTS_LIMITS = {
  1: 1, 2: 2, 3: 3, 4: 4, 5: 5,
};

// Constantes d'optimisation
const ANTIQUE_YEAR_THRESHOLD = 500;
const MAX_EVENTS_TO_PROCESS = 150; // Limite critique pour éviter les gels
const MAX_SCORING_POOL = 100; // Pool encore plus restreint pour le scoring
const DEBOUNCE_DELAY = 200; // ms pour éviter les appels multiples

// Cache global pour les calculs de dates (évite les re-calculs)
const dateCache = new Map<string, { year: number, timestamp: number }>();
const scoringCache = new Map<string, any>(); // Cache pour les scores
const scorePartsCache = new Map<string, any>(); // Cache pour les composantes de score

/**
 * Système de pools par niveau pour optimiser l'engagement
 * Retourne les critères de filtrage selon le niveau du joueur
 */
const getPoolCriteriaForLevel = (level: number) => {
  // Pool 1 - Niveaux 1-2 : Onboarding
  if (level <= 2) {
    return {
      minNotoriete: 75,
      minYear: 1800,
      frenchPercentage: 0.5, // 50% événements français
      description: 'Onboarding - Événements très connus',
    };
  }

  // Pool 2 - Niveaux 3-5 : Découverte
  if (level <= 5) {
    return {
      minNotoriete: 60,
      minYear: 1700,
      frenchPercentage: 0.5,
      description: 'Découverte - Introduction progressive',
    };
  }

  // Pool 3 - Niveaux 6-9 : Exploration
  if (level <= 9) {
    return {
      minNotoriete: 45,
      minYear: 1000,
      frenchPercentage: 0.4,
      description: 'Exploration - Diversification',
    };
  }

  // Pool 4 - Niveaux 10-14 : Maîtrise
  if (level <= 14) {
    return {
      minNotoriete: 30,
      minYear: 500,
      frenchPercentage: 0.3,
      description: 'Maîtrise - Challenge',
    };
  }

  // Pool 5 - Niveaux 15-19 : Expert
  if (level <= 19) {
    return {
      minNotoriete: 20,
      minYear: -500, // Toute l'Antiquité
      frenchPercentage: 0.25,
      description: 'Expert - Défi ultime',
    };
  }

  // Pool 6 - Niveau 20+ : Infini
  return {
    minNotoriete: 0,
    minYear: -3000,
    frenchPercentage: 0.2,
    description: 'Infini - Tous événements',
  };
};

const notorieteProfileForLevel = (level: number) => {
  if (level <= 3) return { target: 0.6, tolerance: 0.45 };
  if (level <= 6) return { target: 0.5, tolerance: 0.45 };
  if (level <= 10) return { target: 0.4, tolerance: 0.45 };
  return { target: 0.35, tolerance: 0.5 };
};

/**
 * Cache optimisé pour les calculs de dates
 */
const getCachedDateInfo = (dateStr: string) => {
  if (!dateCache.has(dateStr)) {
    try {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const timestamp = date.getTime();
      if (!isNaN(year) && !isNaN(timestamp)) {
        dateCache.set(dateStr, { year, timestamp });
      } else {
        return { year: 2000, timestamp: new Date('2000-01-01').getTime() }; // Fallback
      }
    } catch {
      return { year: 2000, timestamp: new Date('2000-01-01').getTime() }; // Fallback
    }
  }
  return dateCache.get(dateStr)!;
};

/**
 * Hook optimisé pour gérer la sélection des événements
 */
export function useEventSelector({
  setError,
  setIsGameOver,
  updateStateCallback
}: {
  setError: (error: string) => void;
  setIsGameOver: (isGameOver: boolean) => void;
  updateStateCallback: (selectedEvent: Event) => Promise<void>;
}) {
  const [antiqueEventsCount, setAntiqueEventsCount] = useState<number>(0);
  // Initialiser à 2 car le jeu démarre avec 2 événements déjà affichés
  const [eventCount, setEventCount] = useState<number>(2);
  const eventCountRef = useRef<number>(2); // Ref pour accès synchrone
  const [forcedJumpEventCount, setForcedJumpEventCount] = useState<number>(() => {
    // Premier saut temporel beaucoup plus tôt : entre 3 et 5 événements
    return Math.floor(Math.random() * (5 - 3 + 1)) + 3;
  });
  const [hasFirstForcedJumpHappened, setHasFirstForcedJumpHappened] = useState<boolean>(false);
  const [fallbackCountdown, setFallbackCountdown] = useState<number>(() => {
    return Math.floor(Math.random() * (25 - 12 + 1)) + 12;
  });
  const [lastSelectionTime, setLastSelectionTime] = useState<number>(0);

  // Système anti-frustration
  const [consecutiveErrors, setConsecutiveErrors] = useState<number>(0);
  const [shouldForceEasyEvent, setShouldForceEasyEvent] = useState<boolean>(false);

  // Système d'événements bonus (tous les 8-10)
  const [bonusEventCountdown, setBonusEventCountdown] = useState<number>(() => {
    return Math.floor(Math.random() * (10 - 8 + 1)) + 8; // Entre 8 et 10
  });
  const [shouldForceBonusEvent, setShouldForceBonusEvent] = useState<boolean>(false);

  /**
   * Détermine la période historique - Version optimisée avec cache
   */
  const getPeriod = useCallback((date: string): HistoricalPeriod => {
    const { year } = getCachedDateInfo(date);
    if (year < 500) return HistoricalPeriod.ANTIQUITY;
    if (year < 1500) return HistoricalPeriod.MIDDLE_AGES;
    if (year < 1800) return HistoricalPeriod.RENAISSANCE;
    if (year < 1900) return HistoricalPeriod.NINETEENTH;
    if (year < 2000) return HistoricalPeriod.TWENTIETH;
    return HistoricalPeriod.TWENTYFIRST;
  }, []);

  /**
   * Vérifie si un événement est antique - Version optimisée
   */
  const isAntiqueEvent = useCallback((event: Event | null): boolean => {
    if (!event?.date) return false;
    const { year } = getCachedDateInfo(event.date);
    return year < ANTIQUE_YEAR_THRESHOLD;
  }, []);

  /**
   * Vérifie si on peut encore ajouter un événement antique
   */
  const canAddAntiqueEvent = useCallback((level: number): boolean => {
    const safeLevel = Math.max(1, Math.min(5, level));
    const currentLimit = ANTIQUE_EVENTS_LIMITS[safeLevel as keyof typeof ANTIQUE_EVENTS_LIMITS] || 5;
    return antiqueEventsCount < currentLimit;
  }, [antiqueEventsCount]);

  /**
   * Calcule le multiplicateur d'écart temporel selon l'époque
   * Plus l'événement est proche de 2024, plus le gap doit être serré
   */
  const getEraMultiplier = useCallback((year: number): number => {
    if (year >= 2000) return 0.2;  // 2000-2024 : ultra-serré
    if (year >= 1980) return 0.4;  // 1980-1999 : très serré
    if (year >= 1950) return 0.6;  // 1950-1979 : serré
    if (year >= 1900) return 0.8;  // 1900-1949 : modéré
    if (year >= 1800) return 1.0;  // 1800-1899 : normal (baseline)
    if (year >= 1600) return 1.3;  // 1600-1799 : large
    if (year >= 1000) return 1.8;  // 1000-1599 : très large
    if (year >= 500) return 2.5;   // 500-999 : énorme
    if (year >= 0) return 3.0;     // 0-499 : gigantesque
    return 3.5;                    // < 0 : maximum (Antiquité)
  }, []);

  /**
   * Calcule le timeGap adaptatif basé sur l'année de référence
   * Retourne { base, minimum, maximum } adaptés à l'époque
   */
  const getAdaptiveTimeGap = useCallback((
    referenceYear: number,
    levelTimeGap: { base: number; minimum: number; variance: number }
  ): { base: number; minimum: number; maximum: number } => {
    const multiplier = getEraMultiplier(referenceYear);

    const adaptedBase = Math.max(1, Math.round(levelTimeGap.base * multiplier));
    const adaptedMin = Math.max(1, Math.round(levelTimeGap.minimum * multiplier));
    const adaptedMax = Math.round((levelTimeGap.base + levelTimeGap.variance) * multiplier);

    console.log('[ADAPTIVE_TIMEGAP]', {
      referenceYear,
      multiplier,
      original: levelTimeGap,
      adapted: { base: adaptedBase, minimum: adaptedMin, maximum: adaptedMax }
    });

    return {
      base: adaptedBase,
      minimum: adaptedMin,
      maximum: adaptedMax
    };
  }, [getEraMultiplier]);

  /**
   * Calcule l'incrément pour le prochain saut temporel en fonction de l'année
   */
  const getNextForcedJumpIncrement = useCallback((year: number): number => {
    // DRASTIQUEMENT réduit pour forcer la diversité temporelle
    // Sauts beaucoup plus fréquents pour explorer toutes les époques
    return Math.floor(Math.random() * (5 - 3 + 1)) + 3; // 3-5 événements entre chaque saut
  }, []);

  /**
   * Calcule la différence de temps optimisée avec cache
   */
  const getTimeDifference = useCallback((date1: string | null, date2: string | null): number => {
    if (!date1 || !date2) return Infinity;
    
    const info1 = getCachedDateInfo(date1);
    const info2 = getCachedDateInfo(date2);
    
    const diffInMilliseconds = Math.abs(info1.timestamp - info2.timestamp);
    return diffInMilliseconds / (365.25 * 24 * 60 * 60 * 1000);
  }, []);

  /**
   * PRÉ-FILTRAGE INTELLIGENT - Réduit drastiquement le nombre d'événements à traiter
   * Utilise le système de pools par niveau
   */
  const preFilterEvents = useCallback((
    events: Event[],
    usedEvents: Set<string>,
    userLevel: number,
    referenceEvent: Event,
    explain?: { logExclusion: (evt: any, rule: string, reason: string) => void }
  ): Event[] => {
    const config = LEVEL_CONFIGS[userLevel];
    if (!config) return [];

    const originalCount = events.length;
    const poolCriteria = getPoolCriteriaForLevel(userLevel);

    const { year: refYear } = getCachedDateInfo(referenceEvent.date);
    const canAddMoreAntiques = canAddAntiqueEvent(userLevel);

    // 1. Filtrage de base
    if (explainEnabled()) {
      const baseExcluded = events.filter(e => usedEvents.has(e.id) || !e.date || e.id === referenceEvent.id);
      baseExcluded.forEach(e => {
        const reason = usedEvents.has(e.id)
          ? 'used'
          : (!e.date ? 'missing_date' : (e.id === referenceEvent.id ? 'same_as_reference' : 'other'));
        explain?.logExclusion(e, 'BASE_FILTER', reason);
      });
    }
    let filtered = events.filter(e => !usedEvents.has(e.id) && e.date && e.id !== referenceEvent.id);

    // 2. Filtrage par POOL selon le niveau (notoriété + année)
    const afterPoolFilter = filtered.filter(e => {
      const notoriete = (e as any).notoriete ?? 0;
      const { year } = getCachedDateInfo(e.date);
      return notoriete >= poolCriteria.minNotoriete && year >= poolCriteria.minYear;
    });
    if (explainEnabled()) {
      const excluded = filtered.filter(e => !afterPoolFilter.includes(e));
      excluded.forEach(e => {
        const notoriete = (e as any).notoriete ?? 0;
        const eventYear = getCachedDateInfo(e.date).year;
        const reason = notoriete < poolCriteria.minNotoriete
          ? 'notoriete_too_low'
          : (eventYear < poolCriteria.minYear ? 'year_too_old' : 'other');
        explain?.logExclusion(e, 'POOL_FILTER', reason);
      });
    }
    filtered = afterPoolFilter;

    // 3. Filtrage temporel préliminaire (large)
    const timeGapBase = config.timeGap?.base || 100;
    const preTimeLimit = timeGapBase * 3; // Limite large pour le pré-filtrage
    const afterTime = filtered.filter(e => {
      const timeDiff = getTimeDifference(e.date, referenceEvent.date);
      return timeDiff <= preTimeLimit;
    });
    if (explainEnabled()) {
      const excluded = filtered.filter(e => !afterTime.includes(e));
      excluded.forEach(e => explain?.logExclusion(e, 'PRE_TIME_LIMIT', 'time_diff_gt_limit'));
    }
    filtered = afterTime;

    // 4. Filtrage antique
    if (!canAddMoreAntiques) {
      const afterAntique = filtered.filter(e => !isAntiqueEvent(e));
      if (explainEnabled()) {
        const excluded = filtered.filter(e => !afterAntique.includes(e));
        excluded.forEach(e => explain?.logExclusion(e, 'ANTIQUE_LIMIT', 'is_antique'));
      }
      filtered = afterAntique;
    }

    // 5. Prioriser les événements moins utilisés
    const now = Date.now();
    filtered.sort((a, b) => {
      const freqA = (a as any).frequency_score || 0;
      const freqB = (b as any).frequency_score || 0;
      if (freqA !== freqB) return freqA - freqB;

      const lastATs = (a as any).last_used ? new Date((a as any).last_used as string).getTime() : NaN;
      const lastBTs = (b as any).last_used ? new Date((b as any).last_used as string).getTime() : NaN;
      const ageA = Number.isFinite(lastATs) ? now - lastATs : Number.POSITIVE_INFINITY;
      const ageB = Number.isFinite(lastBTs) ? now - lastBTs : Number.POSITIVE_INFINITY;

      return ageB - ageA; // Plus ancien en premier
    });

    // 6. Limite drastique pour éviter les gels
    const limited = filtered.slice(0, MAX_EVENTS_TO_PROCESS);

    devLog('PREFILTER_COUNTS', {
      original: originalCount,
      limited: limited.length,
      level: userLevel,
      pool: poolCriteria.description,
      reference: referenceEvent?.id ?? null,
    });

    return limited;
  }, [canAddAntiqueEvent, getTimeDifference, isAntiqueEvent]);

  /**
   * Fonction de scoring optimisée avec cache
   */
  const scoreEventOptimized = useCallback((
    evt: Event,
    referenceEvent: Event,
    userLevel: number,
    timeGap: any
  ): number => {
    const cacheKey = `${evt.id}-${referenceEvent.id}-${userLevel}`;

    if (scoringCache.has(cacheKey)) {
      const cached = scoringCache.get(cacheKey);
      try {
        const parts = scorePartsCache.get(cacheKey);
        if (parts) {
          (evt as any)._score = cached;
          (evt as any)._scoreParts = parts;
        }
      } catch {}
      return cached;
    }

    const timeDiff = getTimeDifference(evt.date, referenceEvent.date);
    if (!isFinite(timeDiff)) return -Infinity;

    const weights = getWeightsForLevel(userLevel);
    const randomFactor = 0.9 + Math.random() * 0.2;

    // NOUVEAU : Utiliser le timeGap adaptatif basé sur l'époque de référence
    const refYear = getCachedDateInfo(referenceEvent.date).year;
    const adaptiveGap = getAdaptiveTimeGap(refYear, timeGap);
    const idealGap = adaptiveGap.base;

    // Score de proximité temporelle pondéré
    let gapScore = 0;
    if (idealGap > 0 && isFinite(timeDiff)) {
      const diffRatio = Math.abs(timeDiff - idealGap) / idealGap;
      const baseGapScore = 35 * Math.max(0, 1 - diffRatio) * randomFactor;
      gapScore = baseGapScore * weights.alphaProximity;
    }

    // Pondération par notoriété pour contrôler la difficulté
    const notorieteValue = Math.max(0, Math.min(100, Number((evt as any).notoriete ?? 60)));
    const notorieteNormalized = notorieteValue / 100;
    const { target, tolerance } = notorieteProfileForLevel(userLevel);
    const notorieteDistance = Math.abs(notorieteNormalized - target);
    const notorieteFactor = Math.max(0, 1 - (notorieteDistance / Math.max(tolerance, 0.01)));
    const notorieteScore = notorieteFactor * weights.gammaNotoriete * 30;

    // Malus de fréquence plus marqué sur les événements surjoués
    const frequencyScore = Math.max(0, Number((evt as any).frequency_score) || 0);
    const frequencyMalus = Math.min(weights.thetaFrequencyCap, frequencyScore * weights.thetaFrequencyMalus);

    // Malus de récence pour éviter de rejouer un événement trop vite
    let recencyPenalty = 0;
    const lastUsedRaw = (evt as any).last_used;
    if (lastUsedRaw) {
      const lastUsedTs = new Date(lastUsedRaw).getTime();
      if (isFinite(lastUsedTs)) {
        const hoursSince = (Date.now() - lastUsedTs) / (60 * 60 * 1000);
        if (hoursSince >= 0) {
          const recencyWindow = userLevel <= 4 ? 12 : userLevel <= 8 ? 24 : 48;
          if (hoursSince < recencyWindow) {
            const recencyFactor = 1 - (hoursSince / recencyWindow);
            recencyPenalty = recencyFactor * 60;
          }
        }
      }
    }

    // Jitter léger pour éviter des patterns trop rigides
    const variationBonus = Math.random() * 12;

    const totalScore = Math.max(0, gapScore + notorieteScore + variationBonus - frequencyMalus - recencyPenalty);

    const parts = {
      difficulty: 0,
      notorieteBonus: notorieteScore,
      timeGap: gapScore,
      recencyPenalty: -recencyPenalty,
      freqPenalty: -frequencyMalus,
      jitter: variationBonus,
    };
    try {
      (evt as any)._score = totalScore;
      (evt as any)._scoreParts = parts;
    } catch {}

    scoringCache.set(cacheKey, totalScore);
    scorePartsCache.set(cacheKey, parts);
    return totalScore;
  }, [getTimeDifference, getCachedDateInfo, getAdaptiveTimeGap]);

  /**
   * SÉLECTION OPTIMISÉE avec sauts temporels et debouncing
   */
  const selectNewEvent = useCallback(async (
    events: Event[],
    referenceEvent: Event | null,
    userLevel: number,
    usedEvents: Set<string>,
    currentStreak: number = 0
  ): Promise<Event | null> => {
    console.log('[SELECT_NEW_EVENT] 🎲 Début de la sélection:', {
      totalEvents: events.length,
      referenceEventId: referenceEvent?.id,
      userLevel,
      usedEventsCount: usedEvents.size,
      currentStreak,
    });

    const explainOn = explainEnabled();
    const explainStartTs = Date.now();
    const exclusionAcc = createExclusionAccumulator(50);
    if (explainOn) {
      try {
        explainLog('SELECTOR_START', {
          seed: null,
          level: userLevel,
          previousEventId: referenceEvent?.id ?? null,
          previousEpoch: (referenceEvent as any)?.epoque ?? null,
          nowISO: new Date().toISOString(),
        });
        explainLog('CANDIDATES_RAW', {
          count: Array.isArray(events) ? events.length : 0,
          sample: (events || []).slice(0, 30).map((e: any) => ({ id: e?.id, titre: e?.titre, notoriete: e?.notoriete ?? null, epoque: e?.epoque ?? null, frequency_score: e?.frequency_score ?? 0, last_used: e?.last_used ?? null })),
        });
      } catch {}
    }
    
    // Debouncing pour éviter les appels multiples rapprochés
    const now = Date.now();
    if (now - lastSelectionTime < DEBOUNCE_DELAY) {
      if (explainOn) {
        explainLog('SELECTOR_DEBOUNCED', {
          elapsed: now - lastSelectionTime,
          threshold: DEBOUNCE_DELAY,
        });
      }
      return null;
    }
    setLastSelectionTime(now);

    // Validations de base
    if (!events?.length) {
      setError("Erreur interne: données manquantes.");
      setIsGameOver(true);
      FirebaseAnalytics.error("invalid_selection_params", "Missing events", "selectNewEvent");
      return null;
    }

    // Si referenceEvent est null, cela signifie un début de niveau "propre"
    // On sélectionne un événement aléatoire pour démarrer
    if (!referenceEvent) {
      console.log('[SELECT_NEW_EVENT] 🆕 Début de niveau propre - sélection aléatoire');

      const config = LEVEL_CONFIGS[userLevel];
      if (!config) {
        setError(`Configuration manquante pour le niveau ${userLevel}`);
        setIsGameOver(true);
        return null;
      }

      // Pré-filtrer les événements selon le niveau
      const availableEvents = events.filter((e) => {
        // Déjà utilisé ?
        if (usedEvents.has(e.id)) {
          return false;
        }

        // Respecter les difficultés du niveau
        const notoriete = e.notoriete ?? 50; // Valeur par défaut si null/undefined
        const eventDifficulty = notoriete >= 80 ? 1 : notoriete >= 60 ? 2 : notoriete >= 40 ? 3 : notoriete >= 20 ? 4 : 5;

        if (eventDifficulty < config.eventSelection.minDifficulty || eventDifficulty > config.eventSelection.maxDifficulty) {
          return false;
        }

        return true;
      });

      if (availableEvents.length === 0) {
        // Fallback: prendre n'importe quel événement non utilisé
        const anyUnused = events.filter(e => !usedEvents.has(e.id));
        if (anyUnused.length > 0) {
          const randomEvent = anyUnused[Math.floor(Math.random() * anyUnused.length)];
          console.log('[SELECT_NEW_EVENT] ✅ Événement aléatoire de fallback sélectionné:', randomEvent.id);
          await updateStateCallback(randomEvent);
          return randomEvent;
        } else {
          setError("Plus d'événements disponibles pour ce niveau !");
          setIsGameOver(true);
          return null;
        }
      }

      // Sélectionner aléatoirement parmi les événements disponibles
      const randomEvent = availableEvents[Math.floor(Math.random() * availableEvents.length)];
      console.log('[SELECT_NEW_EVENT] ✅ Événement aléatoire sélectionné:', randomEvent.id);
      await updateStateCallback(randomEvent);

      // Incrémenter le compteur d'événements et planifier le prochain saut temporel
      const localEventCount = eventCountRef.current;
      eventCountRef.current = localEventCount + 1;
      setEventCount(localEventCount + 1);

      // Planifier le premier saut temporel pour ce niveau
      const { year: selectedYear } = getCachedDateInfo(randomEvent.date);
      const nextIncrement = getNextForcedJumpIncrement(selectedYear);
      setForcedJumpEventCount(localEventCount + nextIncrement);

      return randomEvent;
    }

    const config = LEVEL_CONFIGS[userLevel];
    if (!config) {
      setError(`Configuration manquante pour le niveau ${userLevel}`);
      setIsGameOver(true);
      return null;
    }

    // Incrémenter le compteur d'événements pour les sauts temporels
    // Utiliser une ref pour un accès synchrone à la valeur
    eventCountRef.current = eventCountRef.current + 1;
    setEventCount(eventCountRef.current);
    const localEventCount = eventCountRef.current;

    // --- SYSTÈME D'ÉVÉNEMENTS BONUS ---
    const isBonusEventTriggered = localEventCount % bonusEventCountdown === 0;
    if (isBonusEventTriggered) {
      setShouldForceBonusEvent(true);
      // Réinitialiser le countdown pour le prochain bonus
      setBonusEventCountdown(Math.floor(Math.random() * (10 - 8 + 1)) + 8);
      devLog('BONUS_EVENT', { trigger: 'countdown', nextIn: bonusEventCountdown });
    }

    // --- LOGIQUE DE SAUT TEMPOREL FORCÉ ---
    const isForcedJumpTriggered = localEventCount === forcedJumpEventCount;

    console.log('[TEMPORAL_JUMP] Check:', {
      localEventCount,
      forcedJumpEventCount,
      triggered: isForcedJumpTriggered
    });

    if (isForcedJumpTriggered) {
      console.log('[TEMPORAL_JUMP] ✨ Saut temporel DÉCLENCHÉ !');
      const { year: refYear } = getCachedDateInfo(referenceEvent.date);
      
      // NOUVEAU : Sauts MASSIFS et BIAISÉS vers le passé pour garantir la diversité
      let jumpDistance;
      let jumpForward;

      // Si on est dans l'ère moderne (>1700), FORCER des sauts vers l'Antiquité/Moyen-Âge
      if (refYear > 1700) {
        // 80% de chance d'aller dans le passé lointain
        const goToAncientTimes = Math.random() < 0.8;

        if (goToAncientTimes) {
          // Saut MASSIF vers Antiquité (-500 à 500) ou Moyen-Âge (500-1500)
          const targetEra = Math.random() < 0.5 ? 'antiquite' : 'moyen-age';

          if (targetEra === 'antiquite') {
            // Cibler entre -500 et 500
            const targetYear = Math.floor(Math.random() * 1000) - 500;
            jumpDistance = Math.abs(refYear - targetYear);
            jumpForward = false;
          } else {
            // Cibler entre 500 et 1500
            const targetYear = Math.floor(Math.random() * 1000) + 500;
            jumpDistance = Math.abs(refYear - targetYear);
            jumpForward = false;
          }
        } else {
          // 20% : saut normal
          jumpDistance = Math.floor(Math.random() * 300) + 100;
          jumpForward = Math.random() > 0.5;
        }
      } else if (refYear > 1500) {
        // Renaissance : 60% vers Antiquité/Moyen-Âge
        if (Math.random() < 0.6) {
          const targetYear = Math.floor(Math.random() * 1500) - 500;
          jumpDistance = Math.abs(refYear - targetYear);
          jumpForward = false;
        } else {
          jumpDistance = Math.floor(Math.random() * 400) + 200;
          jumpForward = Math.random() > 0.5;
        }
      } else if (refYear > 1000) {
        // Moyen-Âge : sauts équilibrés
        jumpDistance = Math.floor(Math.random() * 800) + 200;
        jumpForward = Math.random() > 0.5;
      } else if (refYear > 0) {
        // Haut Moyen-Âge : sauts moyens
        jumpDistance = Math.floor(Math.random() * 600) + 300;
        jumpForward = Math.random() > 0.5;
      } else {
        // Antiquité : sauts vers toutes les époques
        jumpDistance = Math.floor(Math.random() * 1500) + 500;
        jumpForward = Math.random() > 0.7; // Légèrement biaisé vers le futur
      }

      const targetYear = jumpForward ? refYear + jumpDistance : refYear - jumpDistance;
      
      // Pour les sauts temporels, chercher dans TOUS les événements (pas de filtre de pool)
      // On veut pouvoir sauter dans n'importe quelle époque
      const jumpCandidates = events
        .filter(e => !usedEvents.has(e.id) && e.date && e.id !== referenceEvent.id)
        .filter(e => {
          const { year: eventYear } = getCachedDateInfo(e.date);
          const timeDiffFromTarget = Math.abs(eventYear - targetYear);
          // Tolérance large pour maximiser les chances de trouver un candidat
          return timeDiffFromTarget <= jumpDistance;
        })
        .slice(0, 50); // Augmenter la limite pour avoir plus de choix

      console.log('[TEMPORAL_JUMP] Recherche de candidats:', {
        refYear,
        targetYear,
        jumpDistance,
        direction: jumpForward ? 'forward' : 'backward',
        candidatesFound: jumpCandidates.length
      });

      if (jumpCandidates.length > 0) {
        // Sélection aléatoire pour le saut temporel
        const jumpEvent = jumpCandidates[Math.floor(Math.random() * jumpCandidates.length)];
        const jumpYear = getCachedDateInfo(jumpEvent.date).year;

        // Déterminer l'époque cible pour le message BASÉE sur l'année cible (targetYear), pas l'année réelle
        // Cela assure la cohérence du message même si l'événement sélectionné est légèrement décalé
        let targetEpoque = '';
        if (targetYear < 500) targetEpoque = "l'Antiquité";
        else if (targetYear < 1500) targetEpoque = 'le Moyen-Âge';
        else if (targetYear < 1800) targetEpoque = 'la Renaissance';
        else if (targetYear < 1900) targetEpoque = 'le XIXe siècle';
        else if (targetYear < 2000) targetEpoque = 'le XXe siècle';
        else targetEpoque = 'le XXIe siècle';

        // Mettre à jour le prochain saut
        const nextIncrement = getNextForcedJumpIncrement(targetYear);
        setForcedJumpEventCount(localEventCount + nextIncrement);
        setHasFirstForcedJumpHappened(true);

        // Marquer l'événement comme voyage temporel avec métadonnées
        const markedJumpEvent = {
          ...(jumpEvent as any),
          _isTemporalJump: true,
          _temporalJumpEpoque: targetEpoque,
          _temporalJumpDirection: jumpForward ? 'forward' : 'backward'
        } as Event;

        // Mise à jour de l'état et retour
        await updateStateCallback(markedJumpEvent);

        // Analytics pour le saut temporel
        FirebaseAnalytics.trackEvent('temporal_jump', {
          from_year: refYear,
          to_year: jumpYear,
          jump_distance: jumpDistance,
          jump_direction: jumpForward ? 'forward' : 'backward',
          user_level: userLevel,
          target_epoque: targetEpoque
        });

        console.log('[TEMPORAL_JUMP] 🚀 VOYAGE DANS LE TEMPS !', {
          from: refYear,
          to: jumpYear,
          epoque: targetEpoque,
          direction: jumpForward ? 'forward' : 'backward',
          distance: jumpDistance
        });

        devLog('TEMPORAL_JUMP', {
          from: refYear,
          to: jumpYear,
          epoque: targetEpoque,
          direction: jumpForward ? 'forward' : 'backward'
        });

        return markedJumpEvent;
      } else {
        console.log('[TEMPORAL_JUMP] ⚠️ Aucun candidat pour le saut temporel, sélection normale');
        if (explainOn) {
          explainLog('FORCED_JUMP_NO_CANDIDATE', {
            referenceYear: refYear,
            attemptedJumpDistance: jumpDistance,
          });
        }
        // Continuer vers sélection normale si échec
      }
    }
    // --- FIN LOGIQUE SAUT TEMPOREL ---

    // 🚀 PRÉ-FILTRAGE INTELLIGENT (réduit de 896 à ~150 événements max)
    const preFilteredEvents = preFilterEvents(events, usedEvents, userLevel, referenceEvent, explainOn ? { logExclusion: exclusionAcc.logExclusion } : undefined);

    if (preFilteredEvents.length === 0) {
      setError("Plus d'événements disponibles pour ce niveau !");
      setIsGameOver(true);
      return null;
    }

    // Configuration du gap temporel
    const { year: refYear } = getCachedDateInfo(referenceEvent.date);
    const proximityFactor = Math.max(0.2, Math.min(1, 1 - (new Date().getFullYear() - refYear) / 2000));
    const timeGap = {
      base: (config.timeGap?.base || 100) * proximityFactor,
      min: Math.max(10, (config.timeGap?.minimum || 50) * proximityFactor),
      max: Math.max(200, (config.timeGap?.base || 100) * 1.5 * proximityFactor)
    };

    // 🚀 SCORING LIMITÉ (encore plus restreint pour les calculs lourds)
    // Système anti-frustration + bonus + adaptation streak : forcer un événement facile si nécessaire
    const computeMinNotoriete = (level: number, forceEasy: boolean, forceBonus: boolean, streak: number, poolMinNotoriete: number) => {
      if (forceBonus) {
        // Événement BONUS : très facile (notoriété maximale)
        devLog('BONUS_EVENT', { action: 'forcing_bonus_event', level });
        return 85; // Événement ultra-connu
      }

      if (forceEasy) {
        // Forcer événement facile : notoriété élevée
        devLog('ANTI_FRUSTRATION', { action: 'forcing_easy_event', level });
        return Math.max(70, poolMinNotoriete + 25);
      }

      // Adaptation selon le streak
      let streakAdjustment = 0;
      if (streak >= 10) {
        // Bon streak : augmenter légèrement la difficulté
        streakAdjustment = -10; // Baisse de 10 points la notoriété minimale = plus difficile
        devLog('STREAK_ADAPTATION', { action: 'harder', streak, adjustment: streakAdjustment });
      } else if (streak === 0) {
        // Streak cassé : légèrement plus facile pour aider à reconstruire
        streakAdjustment = 5; // Augmente de 5 points la notoriété minimale = plus facile
        devLog('STREAK_ADAPTATION', { action: 'easier', streak, adjustment: streakAdjustment });
      }

      // Logique normale (ancienne) + ajustement streak
      let baseMin = 0;
      if (level <= 1) baseMin = 45;
      else if (level === 2) baseMin = 50;
      else if (level === 3) baseMin = 55;
      else if (level <= 5) baseMin = 40;

      return Math.max(0, baseMin + streakAdjustment);
    };

    const poolCriteria = getPoolCriteriaForLevel(userLevel);
    const minNotoriete = computeMinNotoriete(userLevel, shouldForceEasyEvent, shouldForceBonusEvent, currentStreak, poolCriteria.minNotoriete);
    let notorieteConstrainedPool = preFilteredEvents;

    if (minNotoriete > 0) {
      const filteredByNotoriete = preFilteredEvents.filter(
        evt => ((evt as any).notoriete ?? 0) >= minNotoriete
      );

      // Si le filtre est trop strict, on revient au set initial pour garder de la diversité
      notorieteConstrainedPool = filteredByNotoriete.length >= 25
        ? filteredByNotoriete
        : preFilteredEvents;
    }
    if (explainOn) {
      try {
        const excluded = preFilteredEvents.filter(e => !notorieteConstrainedPool.includes(e)).slice(0, 50);
        excluded.forEach(e => exclusionAcc.logExclusion(e as any, 'NOTORIETE_MIN', 'below_threshold'));
      } catch {}
    }

    // Réinitialiser les flags après avoir forcé un événement
    if (shouldForceEasyEvent) {
      setShouldForceEasyEvent(false);
    }
    const wasBonusEvent = shouldForceBonusEvent;
    if (shouldForceBonusEvent) {
      setShouldForceBonusEvent(false);
    }

    // Diversité: exclure seulement même époque que l'événement de référence
    const prevEpoch = (referenceEvent as any)?.epoque;

    const diversityFilteredPool = notorieteConstrainedPool.filter(evt => {
      const epoch = (evt as any)?.epoque;
      const sameEpoch = prevEpoch != null && epoch != null && epoch === prevEpoch;
      if (sameEpoch && explainOn) exclusionAcc.logExclusion(evt as any, 'DIVERSITY_EPOQUE', 'same_epoch_as_previous');
      return !sameEpoch;
    });

    const scoringPool = diversityFilteredPool.slice(0, MAX_SCORING_POOL);
    if (explainOn) {
      try {
        const { truncated } = exclusionAcc.flush('EXCLUSION');
        explainLog('CANDIDATES_AFTER_FILTER', {
          count: scoringPool.length,
          kept_sample: scoringPool.slice(0, 30).map((e: any) => ({ id: e?.id, titre: e?.titre, notoriete: e?.notoriete ?? null })),
          excluded_total: exclusionAcc.size(),
          excluded_truncated_count: truncated,
        });
      } catch {}
    }
    
    const scoredEvents = scoringPool
      .map(evt => ({
        event: evt,
        score: scoreEventOptimized(evt, referenceEvent, userLevel, timeGap),
        timeDiff: getTimeDifference(evt.date, referenceEvent.date)
      }))
      .filter(({ score, timeDiff }) => 
        isFinite(score) && 
        score > 0 && 
        timeDiff >= timeGap.min && 
        timeDiff <= timeGap.max
      )
      .sort((a, b) => b.score - a.score);
    
    try {
      devLog('SCORING_COUNTS', {
        level: userLevel,
        pool: scoringPool.length,
        passed: scoredEvents.length,
        minGap: timeGap.min,
        maxGap: timeGap.max,
      });
    } catch {}

    if (explainOn) {
      try {
        const weights = { timeGapWeight: 35, freqMalusPerUnit: 10, freqMalusCap: 500, jitterRange: 10 };
        const topDetails = scoredEvents.slice(0, 30).map(({ event, score, timeDiff }: any) => ({
          id: event?.id,
          notoriete: (event as any)?.notoriete ?? null,
          frequency_score: (event as any)?.frequency_score ?? 0,
          timeDiffYears: timeDiff,
          baseScore: ((event as any)?._scoreParts?.timeGap ?? 0) + ((event as any)?._scoreParts?.jitter ?? 0),
          weightedScore: (event as any)?._score ?? score,
        }));
        explainLog('SCORING_INPUT', { weights, candidates_top: topDetails });
      } catch {}
    }

    // SYSTÈME DE FALLBACK MULTI-NIVEAUX ROBUSTE - GARANTIT qu'un événement sera TOUJOURS trouvé
    let finalEvents = scoredEvents;
    let selectionPath: 'normal' | 'fallback_1.5x' | 'fallback_2.5x' | 'fallback_5x' | 'fallback_ignore_gap' | 'fallback_all_unused' | 'fallback_reset_50pct' = 'normal';

    console.log('[FALLBACK] Tentative 1 (normal):', { candidates: finalEvents.length, timeGap });

    // Fallback 1: Élargir timeGap de 50%
    if (finalEvents.length === 0) {
      console.log('[FALLBACK] ⚠️ Tentative 1 échouée, tentative 2: élargir ×1.5');
      const relaxedMin = timeGap.min * 0.7;
      const relaxedMax = timeGap.max * 1.5;

      finalEvents = scoringPool
        .map(evt => ({
          event: evt,
          score: scoreEventOptimized(evt, referenceEvent, userLevel, timeGap),
          timeDiff: getTimeDifference(evt.date, referenceEvent.date)
        }))
        .filter(({ score, timeDiff }) =>
          isFinite(score) && score > 0 && timeDiff >= relaxedMin && timeDiff <= relaxedMax
        )
        .sort((a, b) => b.score - a.score);

      if (finalEvents.length > 0) selectionPath = 'fallback_1.5x';
      console.log('[FALLBACK] Tentative 2:', { candidates: finalEvents.length, relaxedMin, relaxedMax });
    }

    // Fallback 2: Élargir timeGap de 150%
    if (finalEvents.length === 0) {
      console.log('[FALLBACK] ⚠️ Tentative 2 échouée, tentative 3: élargir ×2.5');
      const relaxedMin = timeGap.min * 0.4;
      const relaxedMax = timeGap.max * 2.5;

      finalEvents = scoringPool
        .map(evt => ({
          event: evt,
          score: scoreEventOptimized(evt, referenceEvent, userLevel, timeGap),
          timeDiff: getTimeDifference(evt.date, referenceEvent.date)
        }))
        .filter(({ score, timeDiff }) =>
          isFinite(score) && score > 0 && timeDiff >= relaxedMin && timeDiff <= relaxedMax
        )
        .sort((a, b) => b.score - a.score);

      if (finalEvents.length > 0) selectionPath = 'fallback_2.5x';
      console.log('[FALLBACK] Tentative 3:', { candidates: finalEvents.length, relaxedMin, relaxedMax });
    }

    // Fallback 3: Élargir timeGap de 400%
    if (finalEvents.length === 0) {
      console.log('[FALLBACK] ⚠️ Tentative 3 échouée, tentative 4: élargir ×5');
      const relaxedMin = timeGap.min * 0.2;
      const relaxedMax = timeGap.max * 5;

      finalEvents = scoringPool
        .map(evt => ({
          event: evt,
          score: scoreEventOptimized(evt, referenceEvent, userLevel, timeGap),
          timeDiff: getTimeDifference(evt.date, referenceEvent.date)
        }))
        .filter(({ score, timeDiff }) =>
          isFinite(score) && score > 0 && timeDiff >= relaxedMin && timeDiff <= relaxedMax
        )
        .sort((a, b) => b.score - a.score);

      if (finalEvents.length > 0) selectionPath = 'fallback_5x';
      console.log('[FALLBACK] Tentative 4:', { candidates: finalEvents.length, relaxedMin, relaxedMax });
    }

    // Fallback 4: IGNORER timeGap complètement, juste pool de notoriété
    if (finalEvents.length === 0) {
      console.log('[FALLBACK] ⚠️ Tentative 4 échouée, tentative 5: ignorer timeGap');
      finalEvents = scoringPool
        .map(evt => ({
          event: evt,
          score: scoreEventOptimized(evt, referenceEvent, userLevel, timeGap),
          timeDiff: getTimeDifference(evt.date, referenceEvent.date)
        }))
        .filter(({ score }) => isFinite(score) && score > 0)
        .sort((a, b) => b.score - a.score);

      if (finalEvents.length > 0) selectionPath = 'fallback_ignore_gap';
      console.log('[FALLBACK] Tentative 5:', { candidates: finalEvents.length });
    }

    // Fallback 5: TOUS les événements non utilisés (random)
    if (finalEvents.length === 0) {
      console.log('[FALLBACK] ⚠️ Tentative 5 échouée, tentative 6: TOUS événements non utilisés');
      const allUnusedEvents = events.filter(e => !usedEvents.has(e.id) && e.date && e.id !== referenceEvent.id);

      finalEvents = allUnusedEvents.slice(0, 50).map(evt => ({
        event: evt,
        score: Math.random() * 100,
        timeDiff: getTimeDifference(evt.date, referenceEvent.date)
      }));

      if (finalEvents.length > 0) selectionPath = 'fallback_all_unused';
      console.log('[FALLBACK] Tentative 6:', { candidates: finalEvents.length, totalUnused: allUnusedEvents.length });
    }

    // Fallback 6: RESET 50% événements les plus anciens + retry
    if (finalEvents.length === 0) {
      console.log('[FALLBACK] ⚠️ Tentative 6 échouée, tentative 7: RESET 50% événements + retry');
      console.warn('[FALLBACK] 🔄 Plus de 90% événements utilisés, reset des 50% les plus anciens');

      // Reset 50% des événements (les premiers ajoutés à usedEvents)
      const usedArray = Array.from(usedEvents);
      const toReset = usedArray.slice(0, Math.floor(usedArray.length * 0.5));
      toReset.forEach(id => usedEvents.delete(id));

      // Retry avec événements fraîchement réinitialisés
      const resetEvents = events.filter(e => !usedEvents.has(e.id) && e.date && e.id !== referenceEvent.id);
      finalEvents = resetEvents.slice(0, 50).map(evt => ({
        event: evt,
        score: Math.random() * 100,
        timeDiff: getTimeDifference(evt.date, referenceEvent.date)
      }));

      if (finalEvents.length > 0) selectionPath = 'fallback_reset_50pct';
      console.log('[FALLBACK] Tentative 7:', { candidates: finalEvents.length, resetCount: toReset.length });
    }

    // GARANTIE ABSOLUE : Si vraiment aucun événement après tout ça, c'est critique
    if (finalEvents.length === 0) {
      console.error('[FALLBACK] ❌ ÉCHEC CRITIQUE : Impossible de trouver un événement après 7 tentatives');
      console.error('[FALLBACK] État du jeu:', {
        totalEvents: events.length,
        usedEvents: usedEvents.size,
        percentUsed: Math.round((usedEvents.size / events.length) * 100) + '%',
        referenceEvent: referenceEvent.id,
        level: userLevel
      });

      // Dernière tentative désespérée : Prendre N'IMPORTE QUEL événement de la base
      const desperateEvents = events.filter(e => e.date).slice(0, 10);
      if (desperateEvents.length > 0) {
        console.warn('[FALLBACK] 🆘 Sélection désespérée: premier événement valide trouvé');
        finalEvents = [{ event: desperateEvents[0], score: 1, timeDiff: 0 }];
        selectionPath = 'fallback_reset_50pct'; // Réutiliser ce path
      } else {
        // Si même ça échoue, c'est que la base de données est vide
        setError("Base de données vide ou corrompue. Impossible de continuer.");
        setIsGameOver(true);
        return null;
      }
    }

    console.log('[FALLBACK] ✅ Événement trouvé via:', selectionPath, '- Candidats:', finalEvents.length);

    // Sélection finale (top 5 pour la variété)
    const topEvents = finalEvents.slice(0, Math.min(5, finalEvents.length));
    const topK = topEvents.map(x => x.event);
    devLog('SELECTION_PATH', {
      level: userLevel,
      selectionPath,
      finalCandidates: finalEvents.length,
      topSample: topEvents.map(e => e.event?.id ?? null),
    });
    let pickedIndex = Math.floor(Math.random() * topEvents.length);
    const selectedEvent = topEvents[pickedIndex].event;
    if (explainOn) {
      try { explainLog('RNG', { method: 'native', seed: null, poolSize: topEvents.length, indexPicked: pickedIndex }); } catch {}
    }

    // NOTE: eventCount a déjà été incrémenté au début de la fonction (ligne 370)
    // Ne PAS incrémenter à nouveau ici pour éviter la double incrémentation

    // Marquer l'événement comme bonus si c'est le cas
    const selected = { ...(selectedEvent as any), _isBonusEvent: wasBonusEvent } as Event;

    await updateStateCallback(selected);

    console.log('[SELECT_NEW_EVENT] ✅ Événement sélectionné:', {
      id: (selected as any)?.id,
      titre: (selected as any)?.titre,
      notoriete: (selected as any)?.notoriete ?? null,
      isBonus: wasBonusEvent,
      isTemporalJump: (selected as any)?._isTemporalJump ?? false,
      path: selectionPath,
      eventCount: localEventCount,
      nextJumpAt: forcedJumpEventCount,
    });

    devLog('WHY_SELECTED', {
      id: (selected as any)?.id,
      titre: (selected as any)?.titre,
      notoriete: (selected as any)?.notoriete ?? null,
      level: userLevel,
      path: selectionPath,
      parts: (selected as any)?._scoreParts,
      isBonus: wasBonusEvent,
    });

    if (explainOn) {
      try { explainLog('SELECTOR_END', { idPicked: (selected as any)?.id ?? null, durationMs: Date.now() - explainStartTs }); } catch {}
    }

    // 📊 Analytics : Tracker la sélection d'événement (async, non-bloquant)
    const trackEventSelection = async () => {
      try {
        const config = LEVEL_CONFIGS[userLevel];
        if (!config) return;

        const selectedYear = getCachedDateInfo((selected as any)?.date).year;
        const refYear = referenceEvent ? getCachedDateInfo(referenceEvent.date).year : selectedYear;
        const timeGapYears = Math.abs(selectedYear - refYear);
        const period = getPeriod((selected as any)?.date);

        // Déterminer le pool tier
        let poolTier = 1;
        if (userLevel >= 20) poolTier = 6;
        else if (userLevel >= 15) poolTier = 5;
        else if (userLevel >= 10) poolTier = 4;
        else if (userLevel >= 6) poolTier = 3;
        else if (userLevel >= 3) poolTier = 2;

        await FirebaseAnalytics.eventSelected({
          eventId: (selected as any)?.id ?? 'unknown',
          eventYear: selectedYear,
          eventPeriod: period,
          eventNotoriete: (selected as any)?.notoriete ?? 0,
          timeGapYears,
          configuredBaseGap: config.timeGap.base,
          configuredMinGap: config.timeGap.minimum,
          level: userLevel,
          isTemporalJump: (selected as any)?._isTemporalJump ?? false,
          isBonusEvent: wasBonusEvent,
          isAntiFrustration: shouldForceEasyEvent,
          poolTier,
          selectionPath,
        });
      } catch (err) {
        // Silencieux : on ne veut pas casser le jeu pour un problème d'analytics
        console.warn('[Analytics] Failed to track event selection:', err);
      }
    };

    // Exécuter en arrière-plan sans bloquer
    trackEventSelection();

    return selected;

  }, [
    setError, setIsGameOver, updateStateCallback, lastSelectionTime,
    preFilterEvents, scoreEventOptimized, getTimeDifference, shouldForceEasyEvent
  ]);

  /**
   * Callbacks pour la gestion des événements antiques
   */
  const updateAntiqueCount = useCallback((event: Event) => {
    if (isAntiqueEvent(event)) {
      setAntiqueEventsCount(prev => prev + 1);
    }
  }, [isAntiqueEvent]);

  const resetAntiqueCount = useCallback(() => {
    setAntiqueEventsCount(0);
    scoringCache.clear(); // Nettoyer le cache à chaque reset
  }, []);

  const resetEventCount = useCallback(() => {
    eventCountRef.current = 2;
    setEventCount(2); // Réinitialiser à 2 (événements initiaux) uniquement au début d'une nouvelle partie
  }, []);

  /**
   * Système anti-frustration : gérer les erreurs consécutives
   */
  const recordCorrectAnswer = useCallback(() => {
    setConsecutiveErrors(0);
    setShouldForceEasyEvent(false);
  }, []);

  const recordIncorrectAnswer = useCallback(() => {
    setConsecutiveErrors(prev => {
      const newCount = prev + 1;
      if (newCount >= 2) {
        // Forcer un événement facile au prochain tour
        setShouldForceEasyEvent(true);
        devLog('ANTI_FRUSTRATION', { trigger: 'consecutive_errors', count: newCount });
      }
      return newCount;
    });
  }, []);

  const resetAntiFrustration = useCallback(() => {
    setConsecutiveErrors(0);
    setShouldForceEasyEvent(false);
  }, []);

  const invalidateEventCaches = useCallback((eventId: string) => {
    const prefix = `${eventId}-`;
    for (const key of Array.from(scoringCache.keys())) {
      if (key.startsWith(prefix)) {
        scoringCache.delete(key);
        scorePartsCache.delete(key);
      }
    }
  }, []);

  // Cache cleanup périodique
  const clearCaches = useCallback(() => {
    if (dateCache.size > 1000) {
      dateCache.clear();
    }
    if (scoringCache.size > 500) {
      scoringCache.clear();
    }
  }, []);

  return {
    // États
    antiqueEventsCount,
    eventCount,
    forcedJumpEventCount,

    // Fonctions principales
    selectNewEvent,
    getPeriod,
    isAntiqueEvent,
    updateAntiqueCount,
    resetAntiqueCount,
    resetEventCount,
    invalidateEventCaches,
    getTimeDifference,
    getNextForcedJumpIncrement,
    clearCaches,

    // Système anti-frustration
    recordCorrectAnswer,
    recordIncorrectAnswer,
    resetAntiFrustration,
  };
}

export default useEventSelector;
