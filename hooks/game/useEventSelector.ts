import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase/supabaseClients';
import { FirebaseAnalytics } from '../../lib/firebase';
import { Event, HistoricalPeriod } from '../types';
import { LEVEL_CONFIGS } from '../levelConfigs';

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

/**
 * Hook pour gérer la sélection des événements et les sauts temporels
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
  // Compteur pour limiter les événements antiques
  const [antiqueEventsCount, setAntiqueEventsCount] = useState<number>(0);
  
  // État pour les sauts temporels forcés
  const [eventCount, setEventCount] = useState<number>(0);
  const [forcedJumpEventCount, setForcedJumpEventCount] = useState<number>(() => {
    return Math.floor(Math.random() * (19 - 12 + 1)) + 12;
  });
  const [hasFirstForcedJumpHappened, setHasFirstForcedJumpHappened] = useState<boolean>(false);
  
  // État pour le fallback
  const [fallbackCountdown, setFallbackCountdown] = useState<number>(() => {
    return Math.floor(Math.random() * (25 - 12 + 1)) + 12;
  });

  /**
   * Détermine la période historique d'un événement à partir de sa date
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

  /**
   * Vérifie si un événement est antique (avant 500)
   */
  const isAntiqueEvent = useCallback((event: Event): boolean => {
    try {
      const year = new Date(event.date).getFullYear();
      return year < ANTIQUE_YEAR_THRESHOLD;
    } catch {
      return false;
    }
  }, []);

  /**
   * Vérifie si on peut encore ajouter un événement antique
   */
  const canAddAntiqueEvent = useCallback((level: number): boolean => {
    const currentLimit = level <= 5 ? ANTIQUE_EVENTS_LIMITS[level as keyof typeof ANTIQUE_EVENTS_LIMITS] : 5;
    return antiqueEventsCount < currentLimit;
  }, [antiqueEventsCount]);

  /**
   * Calcule la différence de temps entre deux dates en années
   */
  const getTimeDifference = useCallback((date1: string, date2: string): number => {
    try {
      if (!date1 || !date2 || isNaN(new Date(date1).getTime()) || isNaN(new Date(date2).getTime())) {
        return Infinity;
      }
      const d1 = new Date(date1).getTime();
      const d2 = new Date(date2).getTime();
      if (!isFinite(d1) || !isFinite(d2)) {
        return Infinity;
      }
      const diffInMilliseconds = Math.abs(d1 - d2);
      const diffInYears = diffInMilliseconds / (365.25 * 24 * 60 * 60 * 1000);
      
      return diffInYears;
    } catch (error) {
      return Infinity;
    }
  }, []);

  /**
   * Fonction pour l'incrément du prochain saut forcé
   */
  const getNextForcedJumpIncrement = useCallback((year: number): number => {
    if (year < 500) {
      return Math.floor(Math.random() * (5 - 1 + 1)) + 1;
    } else if (year < 700) {
      return Math.floor(Math.random() * (9 - 6 + 1)) + 6;
    } else if (year < 1000) {
      return Math.floor(Math.random() * (9 - 6 + 1)) + 6;
    } else if (year < 1500) {
      return Math.floor(Math.random() * (9 - 6 + 1)) + 6;
    } else if (year < 1800) {
      return Math.floor(Math.random() * (11 - 7 + 1)) + 7;
    } else if (year <= 2024) {
      return Math.floor(Math.random() * (19 - 12 + 1)) + 12;
    } else {
      return 15; // Fallback
    }
  }, []);

  /**
   * Sélectionne un nouvel événement en fonction des événements précédents
   * @param events Tous les événements disponibles
   * @param referenceEvent L'événement de référence
   * @param userLevel Niveau actuel de l'utilisateur
   * @param usedEvents Set d'IDs des événements déjà utilisés
   * @returns Le nouvel événement sélectionné
   */
  const selectNewEvent = useCallback(async (
    events: Event[],
    referenceEvent: Event | null,
    userLevel: number,
    usedEvents: Set<string>,
  ): Promise<Event | null> => {
    if (!events || events.length === 0) {
      setError("Aucun événement disponible pour continuer.");
      setIsGameOver(true);
      FirebaseAnalytics.error("no_events_available", "All events used or empty list", "selectNewEvent");
      return null;
    }
    if (!referenceEvent) {
      setError("Erreur interne: événement de référence manquant.");
      setIsGameOver(true);
      FirebaseAnalytics.error("null_reference_event", "Reference event was null in selectNewEvent", "selectNewEvent");
      return null;
    }

    // Incrémenter le compteur d'événements
    setEventCount(prev => prev + 1);
    const localEventCount = eventCount + 1;
    
    const referenceYear = new Date(referenceEvent.date).getFullYear();
    
    if (isNaN(referenceYear)) {
      setError("Erreur interne: date de référence invalide.");
      setIsGameOver(true);
      FirebaseAnalytics.error("invalid_reference_date", `Invalid date: ${referenceEvent.date}`, "selectNewEvent");
      return null;
    }

    // --- Logique de saut temporel forcé ---
    const timeJump = (() => {
      let jumpDistance = 0;
      const isForcedJumpTriggered = localEventCount === forcedJumpEventCount;
      
      if (isForcedJumpTriggered) {
        const forcedDistances = [500, 750, 1000];
        jumpDistance = forcedDistances[Math.floor(Math.random() * forcedDistances.length)];
      }
      
      // Autres conditions pour augmenter la distance de saut
      if (referenceYear < 500 && localEventCount <= 5) {
        const chosen = [750, 1000][Math.floor(Math.random() * 2)];
        jumpDistance = Math.max(jumpDistance, chosen);
      } else if (
        referenceYear >= 500 &&
        referenceYear < 1000 &&
        localEventCount >= 7 &&
        localEventCount <= 12
      ) {
        const chosen = [500, 1000][Math.random() < 0.5 ? 0 : 1];
        jumpDistance = Math.max(jumpDistance, chosen);
      } else if (
        referenceYear >= 1000 &&
        referenceYear < 1800 &&
        localEventCount >= 7 &&
        localEventCount <= 12
      ) {
        const chosen = [400, 750][Math.random() < 0.5 ? 0 : 1];
        jumpDistance = Math.max(jumpDistance, chosen);
      }
      
      return jumpDistance;
    })();

    // Si un saut temporel est nécessaire
    if (timeJump > 0) {
      const isForcedJump = localEventCount === forcedJumpEventCount;
      
      let mainDirection: "past" | "future" = Math.random() < 0.5 ? "past" : "future";
      
      if (isForcedJump && !hasFirstForcedJumpHappened) {
        mainDirection = "past";
      }

      const getTargetEvents = (direction: "past" | "future", dist: number): Event[] => {
        const targetYear = direction === "past" ? referenceYear - dist : referenceYear + dist;
        
        const comparison = direction === "past" ? (y: number) => y <= targetYear : (y: number) => y >= targetYear;
        const unusedEvents = events.filter((evt) => !usedEvents.has(evt.id));
        
        return unusedEvents.filter((evt) => {
          if (isAntiqueEvent(evt) && !canAddAntiqueEvent(userLevel)) {
            return false;
          }
          try {
            const y = new Date(evt.date).getFullYear();
            return !isNaN(y) && comparison(y);
          } catch {
            return false;
          }
        });
      };

      let possibleEvents = getTargetEvents(mainDirection, timeJump);
      if (possibleEvents.length === 0) {
        const alternateDirection = mainDirection === "past" ? "future" : "past";
        possibleEvents = getTargetEvents(alternateDirection, timeJump);
      }
      
      if (possibleEvents.length > 0) {
        // Ajout de scores de fréquence pour pondérer les choix
        const eventsWithFrequencyScore = possibleEvents.map((evt) => ({
          event: evt,
          frequencyScore: (evt as any).frequency_score || 0,
          year: new Date(evt.date).getFullYear(),
          difficulty: evt.niveau_difficulte || 0,
        }));
        
        // Tri par score de fréquence (préférence aux événements moins utilisés)
        eventsWithFrequencyScore.sort((a, b) => a.frequencyScore - b.frequencyScore);
        
        // Sélection parmi les meilleurs X% (moins souvent utilisés)
        const topPercentage = 0.3;
        const numTopEvents = Math.max(1, Math.ceil(eventsWithFrequencyScore.length * topPercentage));
        const topEvents = eventsWithFrequencyScore.slice(0, numTopEvents);
        
        const selectedEventWithScore = topEvents[Math.floor(Math.random() * topEvents.length)];
        const chosenEvent = selectedEventWithScore.event;

        // Substitution possible par un événement moderne pour les premiers niveaux
        let finalEvent = chosenEvent;
        if (userLevel <= 5) {
          try {
            const chosenYear = new Date(chosenEvent.date).getFullYear();
            const modernThresholdYearJump =
              userLevel === 1
                ? 1900
                : userLevel === 2
                ? 1800
                : userLevel === 3
                ? 1600
                : userLevel === 4
                ? 1400
                : 1000;
                
            if (referenceYear < modernThresholdYearJump && chosenYear < modernThresholdYearJump) {
              const modernEventsForJump = events.filter((evt) => {
                if (usedEvents.has(evt.id)) {
                  return false;
                }
                try {
                  const evtYear = new Date(evt.date).getFullYear();
                  return !isNaN(evtYear) && evtYear >= modernThresholdYearJump;
                } catch {
                  return false;
                }
              });
              
              if (modernEventsForJump.length > 0) {
                const replacement = modernEventsForJump[Math.floor(Math.random() * modernEventsForJump.length)];
                finalEvent = replacement;
                FirebaseAnalytics.logEvent("forced_modern_in_time_jump", { /* ... */ });
              }
            }
          } catch (e) {
            // En cas d'erreur, on garde l'événement choisi
          }
        }
        
        // Application et mise à jour des états
        await updateStateCallback(finalEvent);
        
        if (isForcedJump) {
          if (!hasFirstForcedJumpHappened) {
            setHasFirstForcedJumpHappened(true);
          }
          
          const landingYear = new Date(finalEvent.date).getFullYear();
          const nextIncrement = getNextForcedJumpIncrement(landingYear);
          const newForcedCount = localEventCount + nextIncrement;
          
          setForcedJumpEventCount(newForcedCount);
        }
        
        // Mise à jour de la fréquence dans Supabase
        try {
          const newFrequencyScore = ((finalEvent as any).frequency_score || 0) + 1;
          
          await supabase
            .from("evenements")
            .update({
              frequency_score: newFrequencyScore,
              last_used: new Date().toISOString(),
            })
            .eq("id", finalEvent.id);
        } catch {
          // Erreur silencieuse pour la mise à jour de fréquence
        }
        
        return finalEvent;
      }
    }

    // --- Sélection Normale (si pas de saut temporel réussi ou pas de saut tenté) ---
    const config = LEVEL_CONFIGS[userLevel];
    if (!config) {
      setError(`Configuration manquante pour le niveau ${userLevel}`);
      setIsGameOver(true);
      FirebaseAnalytics.error("missing_level_config", `Config not found for level ${userLevel}`, "selectNewEvent");
      return null;
    }

    // Calcul dynamique des écarts de temps acceptables
    const calculateDynamicTimeGap = (refDate: string) => {
      const nowY = new Date().getFullYear();
      const refY = new Date(refDate).getFullYear();
      const proximityFactor = Math.max(0.2, Math.min(1, 1 - (nowY - refY) / 2000));
      const baseGap = config.timeGap.base * proximityFactor;
      const minGap = Math.max(10, config.timeGap.minimum * proximityFactor);
      const maxGap = Math.max(minGap + 50, baseGap * 1.5);
      
      return { base: baseGap, min: minGap, max: maxGap };
    };

    const timeGap = calculateDynamicTimeGap(referenceEvent.date);
    const availableEvents = events.filter((e) => !usedEvents.has(e.id));
    
    if (availableEvents.length === 0) {
      setError("Vous avez exploré tous les événements disponibles !");
      setIsGameOver(true);
      FirebaseAnalytics.error("no_more_available_events", "All events have been used", "selectNewEvent");
      return null;
    }

  // Vérification des niveaux modernes pour les premiers niveaux
  let modernEventsForFallback: Event[] = [];
  const modernThresholdYear =
    userLevel === 1
      ? 1900
      : userLevel === 2
      ? 1800
      : userLevel === 3
      ? 1600
      : userLevel === 4
      ? 1400
      : userLevel === 5
      ? 1000
      : 0;
      
  if (userLevel <= 5 && referenceYear < modernThresholdYear) {
    modernEventsForFallback = availableEvents.filter((evt) => {
      try {
        const evtYear = new Date(evt.date).getFullYear();
        return !isNaN(evtYear) && evtYear >= modernThresholdYear;
      } catch {
        return false;
      }
    });
  }

  // Filtrage basé sur les événements récents (modernes)
  let filteredForRecentLogic = [...availableEvents];
  let modernEvents: Event[] = [];
  if (userLevel <= 5) {
    if (referenceYear < modernThresholdYear) {
      modernEvents = availableEvents.filter((evt) => {
        try {
          const eventYear = new Date(evt.date).getFullYear();
          return !isNaN(eventYear) && eventYear >= modernThresholdYear;
        } catch {
          return false;
        }
      });
      
      if (modernEvents.length > 0) {
        filteredForRecentLogic = modernEvents;
        FirebaseAnalytics.logEvent("modern_events_forced", { /* ... */ });
      }
    }
  }

  // Filtrage des événements antiques selon les limites
  const canAddMoreAntiques = canAddAntiqueEvent(userLevel);
  
  const filteredAvailableEvents = canAddMoreAntiques
    ? filteredForRecentLogic
    : filteredForRecentLogic.filter((e) => !isAntiqueEvent(e));

  // Détermination des événements à scorer
  const eventsToScore = filteredAvailableEvents.length > 0 ? filteredAvailableEvents : availableEvents;

  // Fonction de scoring pour trouver les meilleurs événements
  const scoreEvent = (evt: Event, timeDiff: number): any => {
    const randomFactor = 0.9 + Math.random() * 0.2;
    const idealGap = timeGap.base;
    let gapScore = 0;
    if (idealGap > 0) {
      const diffRatio = Math.abs(timeDiff - idealGap) / idealGap;
      gapScore = 35 * Math.max(0, 1 - diffRatio) * randomFactor;
    }
    
    const idealDifficulty = Math.min(7, Math.max(1, Math.ceil(userLevel / 2)));
    let difficultyScore = 0;
    if (evt.niveau_difficulte !== null && evt.niveau_difficulte !== undefined) {
      difficultyScore = 25 * (1 - Math.abs(evt.niveau_difficulte - idealDifficulty) / 7) * randomFactor;
    }
    
    let modernBonus = 0;
    if (userLevel <= 5 && referenceYear < modernThresholdYear) {
      try {
        const eventYear = new Date(evt.date).getFullYear();
        if (!isNaN(eventYear) && eventYear >= modernThresholdYear) {
          modernBonus =
            userLevel === 1
              ? 1000
              : userLevel === 2
              ? 800
              : userLevel === 3
              ? 600
              : userLevel === 4
              ? 400
              : 200;
        }
      } catch {}
    }
    
    const frequencyScore = (evt as any).frequency_score || 0;
    let frequencyMalus = 0;
    if (frequencyScore <= 10) {
      frequencyMalus = frequencyScore * 20;
    } else if (frequencyScore <= 30) {
      frequencyMalus = 200 + (frequencyScore - 10) * 15;
    } else if (frequencyScore <= 60) {
      frequencyMalus = 500 + (frequencyScore - 30) * 30;
    } else {
      frequencyMalus = 1400 + (frequencyScore - 60) * 50;
    }
    
    const variationBonus = Math.random() * 10;
    const antiqueLimit =
      userLevel <= 5 ? ANTIQUE_EVENTS_LIMITS[userLevel as keyof typeof ANTIQUE_EVENTS_LIMITS] : 5;
    const antiqueMalus =
      isAntiqueEvent(evt) && antiqueEventsCount >= (antiqueLimit - 1) ? 50 : 0;
      
    return {
      totalScore: Math.max(0, gapScore + difficultyScore + variationBonus + modernBonus - frequencyMalus - antiqueMalus),
      gapScore,
      difficultyScore,
      variationBonus,
      modernBonus,
      frequencyMalus,
      antiqueMalus,
      randomFactor,
    };
  };

  // Simplification du score pour le tri
  const processDetailedScores = (detailedScore: any) => {
    return detailedScore.totalScore;
  };

  // Scoring des événements avec critères de temps
  let scoredEvents = eventsToScore
    .map((e) => {
      const diff = getTimeDifference(e.date, referenceEvent.date);
      const scoreDetails = scoreEvent(e, diff);
      const score = processDetailedScores(scoreDetails);
      return {
        event: e,
        timeDiff: diff,
        score: score,
        year: new Date(e.date).getFullYear(),
        scoreDetails,
      };
    })
    .filter(({ timeDiff }) => timeDiff >= timeGap.min && timeDiff <= timeGap.max)
    .sort((a, b) => b.score - a.score);

  // Relâchement des contraintes si aucun événement ne correspond
  if (scoredEvents.length === 0) {
    const relaxedMin = timeGap.min * 0.5;
    const relaxedMax = timeGap.max * 1.5;
    
    scoredEvents = eventsToScore
      .map((e) => {
        const diff = getTimeDifference(e.date, referenceEvent.date);
        const scoreDetails = scoreEvent(e, diff);
        const score = processDetailedScores(scoreDetails);
        return {
          event: e,
          timeDiff: diff,
          score: score,
          year: new Date(e.date).getFullYear(),
          scoreDetails,
        };
      })
      .filter(({ timeDiff }) => timeDiff >= relaxedMin && timeDiff <= relaxedMax)
      .sort((a, b) => b.score - a.score);
  }

  // Fallback complet si toujours aucun événement
  if (scoredEvents.length === 0) {
    scoredEvents = availableEvents
      .map((e) => {
        const diff = getTimeDifference(e.date, referenceEvent.date);
        const scoreDetails = scoreEvent(e, diff);
        const score = processDetailedScores(scoreDetails);
        return {
          event: e,
          timeDiff: diff,
          score: score,
          year: new Date(e.date).getFullYear(),
          scoreDetails,
        };
      })
      .sort((a, b) => b.score - a.score);

    // Fallback vers des événements modernes si nécessaire
    if (userLevel <= 5 && modernEventsForFallback.length > 0 && referenceYear < modernThresholdYear) {
      const modernScored = modernEventsForFallback.map((e) => {
        const diff = getTimeDifference(e.date, referenceEvent.date);
        return {
          event: e,
          timeDiff: diff,
          score: 1000, // Score artificiel élevé pour donner priorité
          year: new Date(e.date).getFullYear(),
          scoreDetails: { totalScore: 1000, modernBonus: 1000 },
        };
      });
      scoredEvents = [...modernScored, ...scoredEvents];
    }

    if (scoredEvents.length === 0) {
      setError("Erreur critique: Impossible de sélectionner un nouvel événement.");
      setIsGameOver(true);
      FirebaseAnalytics.error("event_selection_failed", "No scorable events left", "selectNewEvent");
      return null;
    }
  }

  // Sélection aléatoire parmi les meilleurs événements
  const selectionPoolSize = Math.min(5, scoredEvents.length);
  const topEvents = scoredEvents.slice(0, selectionPoolSize);
  
  const selectedScoredEvent = topEvents[Math.floor(Math.random() * topEvents.length)];
  let selectedEvent = selectedScoredEvent.event;

  // Remplacement par un événement moderne en dernier recours si nécessaire
  if (userLevel <= 5 && modernEventsForFallback.length > 0) {
    try {
      const selectedYear = new Date(selectedEvent.date).getFullYear();
      if (referenceYear < modernThresholdYear && selectedYear < modernThresholdYear) {
        const sortedFallbacks = [...modernEventsForFallback].sort(
          (a, b) => ((a as any).frequency_score || 0) - ((b as any).frequency_score || 0)
        );
        const lowFreqPoolSize = Math.max(1, Math.ceil(sortedFallbacks.length * 0.3));
        const lowFreqPool = sortedFallbacks.slice(0, lowFreqPoolSize);
        const replacement = lowFreqPool[Math.floor(Math.random() * lowFreqPool.length)];
        
        selectedEvent = replacement;
        FirebaseAnalytics.logEvent("absolute_force_modern", { /* ... */ });
      }
    } catch {
      // En cas d'erreur, on garde l'événement sélectionné
    }
  }

  // Mise à jour de l'état du jeu avec l'événement sélectionné
  await updateStateCallback(selectedEvent);
  
  // Mise à jour du compteur de fallback
  setFallbackCountdown((prev) => Math.max(0, prev - 1));
  
  // Update fréquence dans Supabase
  try {
    const newFrequencyScore = ((selectedEvent as any).frequency_score || 0) + 1;
    
    await supabase
      .from("evenements")
      .update({
        frequency_score: newFrequencyScore,
        last_used: new Date().toISOString(),
      })
      .eq("id", selectedEvent.id);
  } catch {
    // Erreur silencieuse pour la mise à jour de fréquence
  }
  
  return selectedEvent;
}, [
  setError,
  setIsGameOver,
  updateStateCallback,
  eventCount,
  forcedJumpEventCount,
  hasFirstForcedJumpHappened,
  fallbackCountdown,
  getTimeDifference,
  isAntiqueEvent,
  canAddAntiqueEvent,
  antiqueEventsCount,
  getNextForcedJumpIncrement,
]);

// Mise à jour du compteur d'événements antiques
const updateAntiqueCount = useCallback((event: Event) => {
  if (isAntiqueEvent(event)) {
    setAntiqueEventsCount(prev => prev + 1);
  }
}, [isAntiqueEvent]);

// Réinitialisation du compteur d'événements antiques
const resetAntiqueCount = useCallback(() => {
  setAntiqueEventsCount(0);
}, []);

return {
  // États exposés
  antiqueEventsCount,
  eventCount,
  forcedJumpEventCount,
  
  // Fonctions exposées
  selectNewEvent,
  getPeriod,
  isAntiqueEvent,
  updateAntiqueCount,
  resetAntiqueCount,
  getTimeDifference
};
}

export default useEventSelector;