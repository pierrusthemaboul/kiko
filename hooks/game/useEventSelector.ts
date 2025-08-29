import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase/supabaseClients';
import { FirebaseAnalytics } from '../../lib/firebase';
import { Event, HistoricalPeriod } from '../types';
import { LEVEL_CONFIGS } from '../levelConfigs';

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
  const [eventCount, setEventCount] = useState<number>(0);
  const [forcedJumpEventCount, setForcedJumpEventCount] = useState<number>(() => {
    return Math.floor(Math.random() * (19 - 12 + 1)) + 12;
  });
  const [hasFirstForcedJumpHappened, setHasFirstForcedJumpHappened] = useState<boolean>(false);
  const [fallbackCountdown, setFallbackCountdown] = useState<number>(() => {
    return Math.floor(Math.random() * (25 - 12 + 1)) + 12;
  });
  const [lastSelectionTime, setLastSelectionTime] = useState<number>(0);

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
   * Calcule l'incrément pour le prochain saut temporel en fonction de l'année
   */
  const getNextForcedJumpIncrement = useCallback((year: number): number => {
    if (year < 500) {
      return Math.floor(Math.random() * (5 - 1 + 1)) + 1; // 1-5
    } else if (year < 700) {
      return Math.floor(Math.random() * (9 - 6 + 1)) + 6; // 6-9
    } else if (year < 1000) {
      return Math.floor(Math.random() * (9 - 6 + 1)) + 6; // 6-9
    } else if (year < 1500) {
      return Math.floor(Math.random() * (9 - 6 + 1)) + 6; // 6-9
    } else if (year < 1800) {
      return Math.floor(Math.random() * (11 - 7 + 1)) + 7; // 7-11
    } else if (year <= 2024) {
      return Math.floor(Math.random() * (19 - 12 + 1)) + 12; // 12-19
    } else {
      return 15; // Valeur par défaut
    }
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
   */
  const preFilterEvents = useCallback((
    events: Event[],
    usedEvents: Set<string>,
    userLevel: number,
    referenceEvent: Event
  ): Event[] => {
    const config = LEVEL_CONFIGS[userLevel];
    if (!config) return [];

    const { year: refYear } = getCachedDateInfo(referenceEvent.date);
    const canAddMoreAntiques = canAddAntiqueEvent(userLevel);

    // 1. Filtrage de base
    let filtered = events.filter(e => 
      !usedEvents.has(e.id) && 
      e.date && 
      e.id !== referenceEvent.id
    );

    // 2. Filtrage par difficulté (plus restrictif)
    const maxDifficulty = Math.min(7, Math.ceil(userLevel / 2) + 1);
    const minDifficulty = Math.max(1, Math.ceil(userLevel / 3));
    filtered = filtered.filter(e => {
      const diff = e.niveau_difficulte || 1;
      return diff >= minDifficulty && diff <= maxDifficulty;
    });

    // 3. Filtrage temporel préliminaire (large)
    const timeGapBase = config.timeGap?.base || 100;
    const preTimeLimit = timeGapBase * 3; // Limite large pour le pré-filtrage
    filtered = filtered.filter(e => {
      const timeDiff = getTimeDifference(e.date, referenceEvent.date);
      return timeDiff <= preTimeLimit;
    });

    // 4. Filtrage antique
    if (!canAddMoreAntiques) {
      filtered = filtered.filter(e => !isAntiqueEvent(e));
    }

    // 5. Prioriser les événements moins utilisés
    filtered.sort((a, b) => {
      const freqA = (a as any).frequency_score || 0;
      const freqB = (b as any).frequency_score || 0;
      return freqA - freqB; // Moins utilisés en premier
    });

    // 6. Limite drastique pour éviter les gels
    return filtered.slice(0, MAX_EVENTS_TO_PROCESS);
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
      return scoringCache.get(cacheKey);
    }

    const timeDiff = getTimeDifference(evt.date, referenceEvent.date);
    if (!isFinite(timeDiff)) return -Infinity;

    const randomFactor = 0.9 + Math.random() * 0.2;
    const idealGap = timeGap.base || 100;

    // Score de proximité temporelle
    let gapScore = 0;
    if (idealGap > 0 && isFinite(timeDiff)) {
      const diffRatio = Math.abs(timeDiff - idealGap) / idealGap;
      gapScore = 35 * Math.max(0, 1 - diffRatio) * randomFactor;
    }

    // Score de difficulté
    const idealDifficulty = Math.min(7, Math.max(1, Math.ceil(userLevel / 2)));
    let difficultyScore = 0;
    if (evt.niveau_difficulte != null) {
      difficultyScore = 25 * (1 - Math.abs(evt.niveau_difficulte - idealDifficulty) / 7) * randomFactor;
    }

    // Malus de fréquence (simplifié)
    const frequencyScore = (evt as any).frequency_score || 0;
    const frequencyMalus = Math.min(500, frequencyScore * 10); // Malus plafonné

    // Bonus de variété
    const variationBonus = Math.random() * 10;

    const totalScore = Math.max(0, gapScore + difficultyScore + variationBonus - frequencyMalus);
    
    scoringCache.set(cacheKey, totalScore);
    return totalScore;
  }, [getTimeDifference]);

  /**
   * SÉLECTION OPTIMISÉE avec sauts temporels et debouncing
   */
  const selectNewEvent = useCallback(async (
    events: Event[],
    referenceEvent: Event | null,
    userLevel: number,
    usedEvents: Set<string>,
  ): Promise<Event | null> => {
    
    // Debouncing pour éviter les appels multiples rapprochés
    const now = Date.now();
    if (now - lastSelectionTime < DEBOUNCE_DELAY) {
      console.warn('[useEventSelector] Debounced - too many rapid calls');
      return null;
    }
    setLastSelectionTime(now);

    // Validations de base
    if (!events?.length || !referenceEvent?.date) {
      setError("Erreur interne: données manquantes.");
      setIsGameOver(true);
      FirebaseAnalytics.error("invalid_selection_params", "Missing events or reference", "selectNewEvent");
      return null;
    }

    const config = LEVEL_CONFIGS[userLevel];
    if (!config) {
      setError(`Configuration manquante pour le niveau ${userLevel}`);
      setIsGameOver(true);
      return null;
    }

    // Incrémenter le compteur d'événements pour les sauts temporels
    const localEventCount = eventCount + 1;
    setEventCount(localEventCount);

    // --- LOGIQUE DE SAUT TEMPOREL FORCÉ ---
    const isForcedJumpTriggered = localEventCount === forcedJumpEventCount;
    
    if (isForcedJumpTriggered) {
      console.log(`[useEventSelector] 🚀 SAUT TEMPOREL déclenché ! Event ${localEventCount}/${forcedJumpEventCount}`);
      
      const { year: refYear } = getCachedDateInfo(referenceEvent.date);
      
      // Calculer la distance du saut selon l'époque
      let jumpDistance;
      if (refYear < 500) {
        jumpDistance = Math.floor(Math.random() * 800) + 200; // 200-1000 ans
      } else if (refYear < 1000) {
        jumpDistance = Math.floor(Math.random() * 600) + 400; // 400-1000 ans
      } else if (refYear < 1500) {
        jumpDistance = Math.floor(Math.random() * 400) + 300; // 300-700 ans
      } else if (refYear < 1800) {
        jumpDistance = Math.floor(Math.random() * 300) + 200; // 200-500 ans
      } else {
        jumpDistance = Math.floor(Math.random() * 150) + 50;  // 50-200 ans
      }

      // Direction aléatoire du saut
      const jumpForward = Math.random() > 0.5;
      const targetYear = jumpForward ? refYear + jumpDistance : refYear - jumpDistance;
      
      console.log(`[useEventSelector] Saut de ${refYear} vers ~${targetYear} (${jumpForward ? 'futur' : 'passé'})`);

      // Pré-filtrage pour le saut temporel
      const jumpCandidates = preFilterEvents(events, usedEvents, userLevel, referenceEvent)
        .filter(e => {
          const { year: eventYear } = getCachedDateInfo(e.date);
          const timeDiffFromTarget = Math.abs(eventYear - targetYear);
          return timeDiffFromTarget <= jumpDistance * 0.5; // Tolérance de 50%
        })
        .slice(0, 20); // Limite pour performance

      if (jumpCandidates.length > 0) {
        // Sélection aléatoire pour le saut temporel
        const jumpEvent = jumpCandidates[Math.floor(Math.random() * jumpCandidates.length)];
        
        // Mettre à jour le prochain saut
        const nextIncrement = getNextForcedJumpIncrement(targetYear);
        setForcedJumpEventCount(localEventCount + nextIncrement);
        setHasFirstForcedJumpHappened(true);
        
        console.log(`[useEventSelector] ✅ Saut réussi vers: ${jumpEvent.titre} (${jumpEvent.date_formatee})`);
        console.log(`[useEventSelector] Prochain saut dans ${nextIncrement} événements`);
        
        // Mise à jour de l'état et retour
        await updateStateCallback(jumpEvent);
        
        // Analytics pour le saut temporel
        FirebaseAnalytics.logEvent('temporal_jump', {
          from_year: refYear,
          to_year: getCachedDateInfo(jumpEvent.date).year,
          jump_distance: jumpDistance,
          jump_direction: jumpForward ? 'forward' : 'backward',
          user_level: userLevel
        });

        return jumpEvent;
      } else {
        console.warn(`[useEventSelector] ⚠️ Échec du saut temporel - aucun candidat trouvé`);
        // Continuer vers sélection normale si échec
      }
    }
    // --- FIN LOGIQUE SAUT TEMPOREL ---

    // 🚀 PRÉ-FILTRAGE INTELLIGENT (réduit de 896 à ~150 événements max)
    console.time('preFilter');
    const preFilteredEvents = preFilterEvents(events, usedEvents, userLevel, referenceEvent);
    console.timeEnd('preFilter');

    if (preFilteredEvents.length === 0) {
      setError("Plus d'événements disponibles pour ce niveau !");
      setIsGameOver(true);
      return null;
    }

    console.log(`[useEventSelector] Pré-filtrage: ${events.length} → ${preFilteredEvents.length} événements`);

    // Configuration du gap temporel
    const { year: refYear } = getCachedDateInfo(referenceEvent.date);
    const proximityFactor = Math.max(0.2, Math.min(1, 1 - (new Date().getFullYear() - refYear) / 2000));
    const timeGap = {
      base: (config.timeGap?.base || 100) * proximityFactor,
      min: Math.max(10, (config.timeGap?.minimum || 50) * proximityFactor),
      max: Math.max(200, (config.timeGap?.base || 100) * 1.5 * proximityFactor)
    };

    // 🚀 SCORING LIMITÉ (encore plus restreint pour les calculs lourds)
    console.time('scoring');
    const scoringPool = preFilteredEvents.slice(0, MAX_SCORING_POOL);
    
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
    
    console.timeEnd('scoring');

    // Relâchement des contraintes si nécessaire
    let finalEvents = scoredEvents;
    if (finalEvents.length === 0) {
      console.log('[useEventSelector] Relâchement des contraintes temporelles');
      const relaxedMin = timeGap.min * 0.3;
      const relaxedMax = timeGap.max * 2;
      
      finalEvents = scoringPool
        .map(evt => ({
          event: evt,
          score: scoreEventOptimized(evt, referenceEvent, userLevel, timeGap),
          timeDiff: getTimeDifference(evt.date, referenceEvent.date)
        }))
        .filter(({ score, timeDiff }) => 
          isFinite(score) && 
          score > 0 && 
          timeDiff >= relaxedMin && 
          timeDiff <= relaxedMax
        )
        .sort((a, b) => b.score - a.score);
    }

    // Fallback ultime si toujours vide
    if (finalEvents.length === 0) {
      console.warn('[useEventSelector] Fallback - sélection aléatoire');
      finalEvents = preFilteredEvents.slice(0, 10).map(evt => ({
        event: evt,
        score: Math.random() * 100,
        timeDiff: getTimeDifference(evt.date, referenceEvent.date)
      }));
    }

    if (finalEvents.length === 0) {
      setError("Impossible de sélectionner un événement valide.");
      setIsGameOver(true);
      return null;
    }

    // Sélection finale (top 5 pour la variété)
    const topEvents = finalEvents.slice(0, Math.min(5, finalEvents.length));
    const selectedEvent = topEvents[Math.floor(Math.random() * topEvents.length)].event;

    console.log(`[useEventSelector] Sélectionné: ${selectedEvent.titre} (${selectedEvent.date_formatee})`);

    // Mise à jour de l'état
    setEventCount(prev => prev + 1);
    await updateStateCallback(selectedEvent);

    // Mise à jour Supabase déplacée côté RPC atomique dans useGameLogicA.updateGameState

    return selectedEvent;

  }, [
    setError, setIsGameOver, updateStateCallback, lastSelectionTime,
    preFilterEvents, scoreEventOptimized, getTimeDifference
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
    getTimeDifference,
    getNextForcedJumpIncrement,
    clearCaches
  };
}

export default useEventSelector;
