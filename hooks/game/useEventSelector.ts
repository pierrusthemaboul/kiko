import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase/supabaseClients'; // Ajuste le chemin si nécessaire
import { FirebaseAnalytics } from '../../lib/firebase'; // Ajuste le chemin si nécessaire
import { Event, HistoricalPeriod } from '../types'; // Ajuste le chemin si nécessaire
import { LEVEL_CONFIGS } from '../levelConfigs'; // Ajuste le chemin si nécessaire

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
  updateStateCallback // Callback pour mettre à jour l'état du jeu principal
}: {
  setError: (error: string) => void;
  setIsGameOver: (isGameOver: boolean) => void;
  updateStateCallback: (selectedEvent: Event) => Promise<void>; // Important pour la synchro
}) {
  // Compteur pour limiter les événements antiques
  const [antiqueEventsCount, setAntiqueEventsCount] = useState<number>(0);
  // console.log(`[EventSelector] Initial antiqueEventsCount: ${antiqueEventsCount}`); // Peut être commenté pour moins de bruit

  // État pour les sauts temporels forcés
  const [eventCount, setEventCount] = useState<number>(0);
  const [forcedJumpEventCount, setForcedJumpEventCount] = useState<number>(() => {
    const initialJumpCount = Math.floor(Math.random() * (19 - 12 + 1)) + 12;
    // console.log(`[EventSelector] Initial forcedJumpEventCount calculated: ${initialJumpCount}`);
    return initialJumpCount;
  });
  const [hasFirstForcedJumpHappened, setHasFirstForcedJumpHappened] = useState<boolean>(false);

  // État pour le fallback (gardé, même si son usage direct semble limité maintenant)
  const [fallbackCountdown, setFallbackCountdown] = useState<number>(() => {
    const initialFallback = Math.floor(Math.random() * (25 - 12 + 1)) + 12;
    // console.log(`[EventSelector] Initial fallbackCountdown calculated: ${initialFallback}`);
    return initialFallback;
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
      console.error(`[EventSelector] Error parsing date in getPeriod: ${date}`);
      return HistoricalPeriod.TWENTIETH; // Default fallback
    }
  }, []);

  /**
   * Vérifie si un événement est antique (avant ANTIQUE_YEAR_THRESHOLD)
   */
  const isAntiqueEvent = useCallback((event: Event | null): boolean => {
    // Ajout d'une vérification pour event null
    if (!event || !event.date) {
        return false;
    }
    try {
      const year = new Date(event.date).getFullYear();
      // Vérifier si l'année est valide avant la comparaison
      return !isNaN(year) && year < ANTIQUE_YEAR_THRESHOLD;
    } catch {
      console.error(`[EventSelector] Error parsing date in isAntiqueEvent for event ID ${event?.id}: ${event?.date}`);
      return false;
    }
  }, []); // Pas de dépendances externes stables

  /**
   * Vérifie si on peut encore ajouter un événement antique en fonction du niveau
   */
  const canAddAntiqueEvent = useCallback((level: number): boolean => {
    // S'assurer que level est un nombre valide, sinon utiliser 1 par défaut
    const safeLevel = (typeof level === 'number' && !isNaN(level) && level > 0) ? level : 1;
    // Calculer la limite, en utilisant 5 comme max même pour les niveaux > 5
    const currentLimit = safeLevel <= 5 ? ANTIQUE_EVENTS_LIMITS[safeLevel as keyof typeof ANTIQUE_EVENTS_LIMITS] : 5;
    const canAdd = antiqueEventsCount < currentLimit;
    // Décommenter pour débugger si nécessaire
    // console.log(`[EventSelector] canAddAntiqueEvent: level=${safeLevel}, count=${antiqueEventsCount}, limit=${currentLimit}, result=${canAdd}`);
    return canAdd;
  }, [antiqueEventsCount]); // Dépend de l'état antiqueEventsCount

  /**
   * Calcule la différence de temps entre deux dates en années
   */
  const getTimeDifference = useCallback((date1: string | null, date2: string | null): number => {
    // Vérifier si les dates sont valides
    if (!date1 || !date2) {
        // console.warn(`[EventSelector] getTimeDifference: Received null date input.`);
        return Infinity; // Retourner Infini si une date est manquante
    }
    try {
      const d1Time = new Date(date1).getTime();
      const d2Time = new Date(date2).getTime();

      // Vérifier si les dates sont valides après conversion
      if (isNaN(d1Time) || isNaN(d2Time)) {
         console.warn(`[EventSelector] getTimeDifference: Invalid date input - date1: ${date1}, date2: ${date2}`);
        return Infinity;
      }

      // Vérifier si les résultats sont finis
      if (!isFinite(d1Time) || !isFinite(d2Time)) {
        console.warn(`[EventSelector] getTimeDifference: Non-finite date result - date1: ${date1}, date2: ${date2}`);
        return Infinity;
      }

      const diffInMilliseconds = Math.abs(d1Time - d2Time);
      // Calculer la différence en années
      const diffInYears = diffInMilliseconds / (365.25 * 24 * 60 * 60 * 1000);
      return diffInYears;

    } catch (error) {
      console.error(`[EventSelector] Error in getTimeDifference with dates: ${date1}, ${date2}`, error);
      return Infinity; // Retourner Infini en cas d'erreur
    }
  }, []); // Pas de dépendances externes stables

  /**
   * Calcule l'incrément pour le prochain saut temporel forcé en fonction de l'année
   */
  const getNextForcedJumpIncrement = useCallback((year: number): number => {
    let increment;
    if (year < 500) {
      increment = Math.floor(Math.random() * (5 - 1 + 1)) + 1; // 1-5
    } else if (year < 700) { // Ajusté pour couvrir 500-699
      increment = Math.floor(Math.random() * (9 - 6 + 1)) + 6; // 6-9
    } else if (year < 1000) { // Couvre 700-999
      increment = Math.floor(Math.random() * (9 - 6 + 1)) + 6; // 6-9
    } else if (year < 1500) { // Couvre 1000-1499
      increment = Math.floor(Math.random() * (9 - 6 + 1)) + 6; // 6-9
    } else if (year < 1800) { // Couvre 1500-1799
      increment = Math.floor(Math.random() * (11 - 7 + 1)) + 7; // 7-11
    } else if (year <= 2024) { // Couvre 1800-2024 (Adapter si besoin)
      increment = Math.floor(Math.random() * (19 - 12 + 1)) + 12; // 12-19
    } else {
      increment = 15; // Valeur par défaut pour années futures ou invalides
    }
    console.log(`[EventSelector] getNextForcedJumpIncrement: year=${year}, calculated increment=${increment}`);
    return increment;
  }, []); // Pas de dépendances externes stables

  /**
   * Sélectionne un nouvel événement basé sur l'événement de référence, le niveau et les événements utilisés.
   */
  const selectNewEvent = useCallback(async (
    events: Event[], // Liste de tous les événements disponibles
    referenceEvent: Event | null, // L'événement précédent/actuel
    userLevel: number, // Niveau actuel de l'utilisateur
    usedEvents: Set<string>, // Ensemble des IDs des événements déjà utilisés
  ): Promise<Event | null> => {
    console.log(`\n[EventSelector] ===== Starting selectNewEvent =====`);
    console.log(`[EventSelector] User Level: ${userLevel}`);
    console.log(`[EventSelector] Reference Event: ${referenceEvent ? `${referenceEvent.titre} (ID: ${referenceEvent.id}, Date: ${referenceEvent.date})` : 'None'}`);
    console.log(`[EventSelector] Total available events provided: ${events?.length ?? 0}`);
    console.log(`[EventSelector] Used events count: ${usedEvents?.size ?? 0}`);
    console.log(`[EventSelector] Current antiqueEventsCount: ${antiqueEventsCount}`);


    // Vérifications initiales des arguments
    if (!events || events.length === 0) {
      console.error("[EventSelector] Critical Error: Missing or empty events list.");
      setError("Erreur interne: Liste d'événements manquante.");
      setIsGameOver(true);
      FirebaseAnalytics.error("no_events_available", "Event list was empty or null", "selectNewEvent");
      return null;
    }
    if (!referenceEvent || !referenceEvent.date) { // Vérifier aussi la date de référence
       console.error("[EventSelector] Critical Error: referenceEvent is null or missing date.");
       setError("Erreur interne: événement de référence invalide ou manquant.");
       setIsGameOver(true);
       FirebaseAnalytics.error("null_reference_event", `Reference event was null or missing date: ${referenceEvent?.id}`, "selectNewEvent");
       return null;
    }

    // Incrémenter le compteur d'événements
    const localEventCount = eventCount + 1;
    setEventCount(prev => prev + 1);
    console.log(`[EventSelector] Event count incremented. Turn: ${localEventCount}, Next forced jump: ${forcedJumpEventCount}`);

    // Obtenir l'année de référence (déjà vérifié que referenceEvent.date existe)
    let referenceYear: number;
    try {
        referenceYear = new Date(referenceEvent.date).getFullYear();
        if (isNaN(referenceYear)) throw new Error('getFullYear resulted in NaN');
        console.log(`[EventSelector] Reference Year: ${referenceYear}`);
    } catch (e) {
        console.error(`[EventSelector] Invalid reference date format: ${referenceEvent.date} for event ID ${referenceEvent.id}`, e);
        setError("Erreur interne: format de date de référence invalide.");
        setIsGameOver(true);
        FirebaseAnalytics.error("invalid_reference_date", `Invalid date format: ${referenceEvent.date}`, "selectNewEvent");
        return null;
    }

    // --- Logique de Saut Temporel Forcé (Time Jump) ---
    // (Insérer ici le code complet de la logique de saut temporel, y compris les logs [TimeJump],
    // la sélection, la substitution moderne potentielle, l'appel à updateStateCallback,
    // la mise à jour Supabase et le 'return finalEvent;' si un événement est trouvé par ce biais.)
    // Exemple simplifié :
    const isForcedJumpTriggered = localEventCount === forcedJumpEventCount;
    let timeJump = 0; // Calculer timeJump basé sur isForcedJumpTriggered et bonusJumpDistance...
    // [Code de calcul de timeJump...]
    console.log(`[TimeJump] Final calculated timeJump distance: ${timeJump}`);

    if (timeJump > 0) {
        console.log(`[TimeJump] Attempting time jump of ${timeJump} years.`);
        // [Code pour getTargetEvents, sélection, substitution, etc.]
        // Exemple: const possibleEvents = getTargetEvents(...);
        // Si possibleEvents.length > 0
        //   const finalEvent = ... // Sélectionner l'événement
        //   console.log(`[TimeJump] Final selected event after jump: ${finalEvent.titre}`);
        //   await updateStateCallback(finalEvent); // Mise à jour état parent
        //   // Mettre à jour Supabase...
        //   // Mettre à jour forcedJumpEventCount si nécessaire...
        //   console.log(`[EventSelector] ===== Exiting selectNewEvent (after Time Jump) =====\n`);
        //   return finalEvent;
        // else
        //   console.warn("[TimeJump] No suitable events found for jump. Proceeding to normal selection.");
    } else {
        console.log("[TimeJump] No time jump triggered or required.");
    }
    // --- Fin Logique Time Jump ---


    // --- Sélection Normale (si pas de saut temporel ou si échec) ---
    console.log("[NormalSelection] Starting normal event selection process.");
    const config = LEVEL_CONFIGS[userLevel];
    if (!config) {
      console.error(`[NormalSelection] Missing configuration for level ${userLevel}`);
      setError(`Configuration manquante pour le niveau ${userLevel}`);
      setIsGameOver(true);
      FirebaseAnalytics.error("missing_level_config", `Config not found for level ${userLevel}`, "selectNewEvent");
      return null;
    }

    // Calcul de l'intervalle de temps dynamique
    const calculateDynamicTimeGap = (refDate: string) => {
      const nowY = new Date().getFullYear();
      const refY = new Date(refDate).getFullYear();
      const proximityFactor = Math.max(0.2, Math.min(1, 1 - (nowY - refY) / 2000));
      const baseGap = config.timeGap.base * proximityFactor;
      const minGap = Math.max(10, config.timeGap.minimum * proximityFactor);
      const maxGap = Math.max(minGap + 50, baseGap * 1.5);
      console.log(`[NormalSelection] Dynamic Time Gap: refY=${refY}, proximity=${proximityFactor.toFixed(2)}, base=${baseGap.toFixed(0)}, min=${minGap.toFixed(0)}, max=${maxGap.toFixed(0)}`);
      return { base: baseGap, min: minGap, max: maxGap };
    };
    const timeGap = calculateDynamicTimeGap(referenceEvent.date);

    // Filtrer les événements déjà utilisés
    const availableEvents = events.filter((e) => !usedEvents.has(e.id));
    console.log(`[NormalSelection] Filtered to ${availableEvents.length} unused events.`);
    if (availableEvents.length === 0) {
      console.error("[NormalSelection] No more available (unused) events.");
      setError("Vous avez exploré tous les événements disponibles !");
      setIsGameOver(true);
      FirebaseAnalytics.error("no_more_available_events", "All events have been used", "selectNewEvent");
      return null;
    }

    // Déterminer le pool d'événements à scorer (incluant logique moderne/antique)
    // (Insérer ici la logique pour déterminer 'modernEventsForFallback', 'filteredForRecentLogic',
    // 'filteredAvailableEvents' et finalement 'eventsToScore' comme dans les versions précédentes)
    // Exemple simplifié :
    let eventsToScore = availableEvents;
    const canAddMoreAntiques = canAddAntiqueEvent(userLevel);
    if (!canAddMoreAntiques) {
        eventsToScore = eventsToScore.filter(e => !isAntiqueEvent(e));
        console.log(`[NormalSelection] Applied antique filter. ${eventsToScore.length} events remain for scoring.`);
    } else {
        console.log(`[NormalSelection] Using ${eventsToScore.length} available events for scoring.`);
    }


    // --- Fonction de scoring (définie ici pour avoir accès à timeGap, userLevel etc.) ---
    const scoreEvent = (evt: Event, timeDiff: number): any => {
      const randomFactor = 0.9 + Math.random() * 0.2;
      const idealGap = timeGap.base;
      let gapScore = 0;
      if (idealGap > 0 && isFinite(timeDiff)) {
          const diffRatio = Math.abs(timeDiff - idealGap) / idealGap;
          gapScore = 35 * Math.max(0, 1 - diffRatio) * randomFactor;
      }

      const idealDifficulty = Math.min(7, Math.max(1, Math.ceil(userLevel / 2)));
      let difficultyScore = 0;
      if (evt.niveau_difficulte != null) { // Simplifié, != null couvre undefined aussi
          difficultyScore = 25 * (1 - Math.abs(evt.niveau_difficulte - idealDifficulty) / 7) * randomFactor;
      }

      let modernBonus = 0;
      const modernThresholdYear = userLevel <= 5 ? [0, 1900, 1800, 1600, 1400, 1000][userLevel] : 0;
      if (userLevel <= 5 && referenceYear < modernThresholdYear) {
          try {
              const eventYear = new Date(evt.date).getFullYear();
              if (!isNaN(eventYear) && eventYear >= modernThresholdYear) {
                  modernBonus = [0, 1000, 800, 600, 400, 200][userLevel];
              }
          } catch {}
      }

      const frequencyScore = (evt as any).frequency_score || 0;
      let frequencyMalus = 0;
      if (frequencyScore <= 10) frequencyMalus = frequencyScore * 20;
      else if (frequencyScore <= 30) frequencyMalus = 200 + (frequencyScore - 10) * 15;
      else if (frequencyScore <= 60) frequencyMalus = 500 + (frequencyScore - 30) * 30;
      else frequencyMalus = 1400 + (frequencyScore - 60) * 50;

      const variationBonus = Math.random() * 10;
      const antiqueLimit = userLevel <= 5 ? ANTIQUE_EVENTS_LIMITS[userLevel as keyof typeof ANTIQUE_EVENTS_LIMITS] : 5;
      const antiqueMalus = isAntiqueEvent(evt) && antiqueEventsCount >= (antiqueLimit -1) ? 50 : 0; // Malus si on est sur le point d'atteindre la limite

      const totalScore = Math.max(0, gapScore + difficultyScore + variationBonus + modernBonus - frequencyMalus - antiqueMalus);

      return { totalScore, gapScore, difficultyScore, variationBonus, modernBonus, frequencyMalus, antiqueMalus, randomFactor, idealGap, idealDifficulty, frequencyScore };
    };
    const processDetailedScores = (detailedScore: any) => { return detailedScore.totalScore; };
    // --- Fin Fonction de scoring ---


    // --- Scoring et Filtrage avec Logs et Try/Catch Améliorés ---
    console.log(`[NormalSelection] Scoring ${eventsToScore.length} events with time gap [${timeGap.min.toFixed(0)}, ${timeGap.max.toFixed(0)}].`);
    let mappedEvents: any[] = [];
    let mapErrorOccurred = false;

    try {
        mappedEvents = eventsToScore.map((e, index) => {
            let diff = Infinity;
            let scoreDetails: any = { totalScore: -Infinity };
            let score = -Infinity;
            let year = NaN;
            try {
                diff = getTimeDifference(e.date, referenceEvent.date); // referenceEvent est non-null ici
                scoreDetails = scoreEvent(e, diff);
                score = processDetailedScores(scoreDetails);
                try { year = new Date(e.date).getFullYear(); } catch {}
                if (!isFinite(score) || isNaN(score)) {
                    console.warn(`[NormalSelection] Invalid score for event ${e.id}: Score=${score}, Diff=${diff}. Details:`, scoreDetails);
                    score = -Infinity;
                    scoreDetails.totalScore = score;
                }
            } catch (mapError) {
                console.error(`[NormalSelection] Error processing event during map: ${e.id} (${e.titre})`, mapError);
                mapErrorOccurred = true;
            }
            return { event: e, timeDiff: diff, score: score, year: year, scoreDetails };
        });
        console.log("[NormalSelection] Mapping complete.");
        if (mapErrorOccurred) console.warn("[NormalSelection] Errors occurred during event scoring.");

    } catch (globalMappingError) {
        console.error("[NormalSelection] CRITICAL UNEXPECTED ERROR during .map():", globalMappingError);
        setError("Erreur critique pendant le traitement des événements."); setIsGameOver(true);
        FirebaseAnalytics.error("map_operation_failed", globalMappingError instanceof Error ? globalMappingError.message : "Unknown", "selectNewEvent");
        return null;
    }

    console.log(`[NormalSelection] Filtering ${mappedEvents.length} mapped events by time gap...`);
    let filteredEvents = [];
    try {
        filteredEvents = mappedEvents.filter(({ timeDiff }) => {
            const isDiffValid = typeof timeDiff === 'number' && isFinite(timeDiff);
            const areBoundsValid = typeof timeGap.min === 'number' && isFinite(timeGap.min) && typeof timeGap.max === 'number' && isFinite(timeGap.max);
            if (!isDiffValid || !areBoundsValid) { if (!isDiffValid) console.warn(`[NormalSelection] Invalid timeDiff (${timeDiff}) during filtering.`); return false; }
            return timeDiff >= timeGap.min && timeDiff <= timeGap.max;
        });
        console.log(`[NormalSelection] Found ${filteredEvents.length} events within the initial time gap.`);
    } catch(filterError) {
        console.error("[NormalSelection] CRITICAL UNEXPECTED ERROR during .filter():", filterError);
        setError("Erreur critique pendant le filtrage."); setIsGameOver(true);
        FirebaseAnalytics.error("filter_operation_failed", filterError instanceof Error ? filterError.message : "Unknown", "selectNewEvent");
        return null;
    }

    // --- Relâchement des contraintes si nécessaire ---
    if (filteredEvents.length === 0) {
        const relaxedMin = timeGap.min * 0.5;
        const relaxedMax = timeGap.max * 1.5;
        console.warn(`[NormalSelection] No events in initial gap. Relaxing to [${relaxedMin.toFixed(0)}, ${relaxedMax.toFixed(0)}].`);
        try {
            filteredEvents = mappedEvents.filter(({ timeDiff }) => { // Re-filtrer mappedEvents
                 const isDiffValid = typeof timeDiff === 'number' && isFinite(timeDiff);
                 const areBoundsValid = typeof relaxedMin === 'number' && isFinite(relaxedMin) && typeof relaxedMax === 'number' && isFinite(relaxedMax);
                 if (!isDiffValid || !areBoundsValid) return false;
                 return timeDiff >= relaxedMin && timeDiff <= relaxedMax;
             });
            console.log(`[NormalSelection] Found ${filteredEvents.length} events within the relaxed time gap.`);
        } catch(relaxedFilterError) {
             console.error("[NormalSelection] CRITICAL UNEXPECTED ERROR during relaxed .filter():", relaxedFilterError);
             setError("Erreur critique pendant le filtrage relaxé."); setIsGameOver(true);
             FirebaseAnalytics.error("relaxed_filter_failed", relaxedFilterError instanceof Error ? relaxedFilterError.message : "Unknown", "selectNewEvent");
             return null;
         }
    }

    // --- Fallback complet si toujours vide ---
    if (filteredEvents.length === 0) {
        console.error(`[NormalSelection] [FALLBACK] No events found even with relaxed gap. Scoring ALL ${availableEvents.length} available unused events, ignoring time gap.`);
        FirebaseAnalytics.logEvent("event_selection_fallback_all", { userLevel, referenceYear });
        try {
            // Utiliser mappedEvents (qui contient tous les scores calculés) mais sans filtre de temps
            filteredEvents = mappedEvents;
            console.log(`[NormalSelection] Using all ${filteredEvents.length} scored available events for fallback.`);
            // (Ici, on pourrait ajouter la logique de boost moderne si nécessaire, sur `filteredEvents`)
        } catch(fallbackError) {
             console.error("[NormalSelection] CRITICAL UNEXPECTED ERROR during fallback assignment:", fallbackError);
             setError("Erreur critique pendant le fallback."); setIsGameOver(true);
             FirebaseAnalytics.error("fallback_assign_failed", fallbackError instanceof Error ? fallbackError.message : "Unknown", "selectNewEvent");
             return null;
         }
    }

    // --- Tri final des événements candidats ---
    console.log(`[NormalSelection] Sorting ${filteredEvents.length} candidate events...`);
    let scoredEvents = [];
     try {
        scoredEvents = filteredEvents.sort((a, b) => {
            const scoreA = (typeof a.score === 'number' && isFinite(a.score)) ? a.score : -Infinity;
            const scoreB = (typeof b.score === 'number' && isFinite(b.score)) ? b.score : -Infinity;
            return scoreB - scoreA;
        });
        console.log("[NormalSelection] Sorting complete.");
    } catch(sortError) {
        console.error("[NormalSelection] CRITICAL UNEXPECTED ERROR during final .sort():", sortError);
        setError("Erreur critique pendant le tri final."); setIsGameOver(true);
        FirebaseAnalytics.error("final_sort_failed", sortError instanceof Error ? sortError.message : "Unknown", "selectNewEvent");
        return null;
    }
    // --- Fin Scoring et Filtrage Améliorés ---


    // Vérification finale avant sélection
    if (scoredEvents.length === 0) {
      console.error("[NormalSelection] [CRITICAL] No suitable event found after all processing.");
      setError("Erreur critique: Impossible de sélectionner un événement.");
      setIsGameOver(true);
      FirebaseAnalytics.error("event_selection_failed", "No scorable events left after final sort", "selectNewEvent");
      return null;
    }

    // --- Sélection finale ---
    const selectionPoolSize = Math.min(5, scoredEvents.length);
    const topEvents = scoredEvents.slice(0, selectionPoolSize);
    console.log(`[NormalSelection] Selecting randomly from the top ${topEvents.length} events.`);
    // Log détaillé des candidats si besoin
    console.log("[NormalSelection] Candidates:", topEvents.map(s => ({ title: s.event.titre, score: s.score?.toFixed(1), year: s.year, freq: s.scoreDetails?.frequencyScore })));


    const selectedScoredEvent = topEvents[Math.floor(Math.random() * topEvents.length)];
    let selectedEvent = selectedScoredEvent.event;

    // Vérifier si selectedEvent est valide avant de continuer
    if (!selectedEvent || !selectedEvent.id) {
        console.error("[NormalSelection] [CRITICAL] Random selection resulted in invalid event:", selectedScoredEvent);
        setError("Erreur critique: Sélection aléatoire invalide.");
        setIsGameOver(true);
        FirebaseAnalytics.error("random_selection_invalid", `Selected invalid event from pool of ${topEvents.length}`, "selectNewEvent");
        return null;
    }

    console.log(`[NormalSelection] Initially selected event: ${selectedEvent.titre} (ID: ${selectedEvent.id}, Score: ${selectedScoredEvent.score?.toFixed(1)}, Year: ${selectedScoredEvent.year})`);

    // (Logique optionnelle de remplacement forcé par événement moderne)
    // ... [Code omis, mais à insérer si utilisé] ...

    // --- Mise à jour Finale ---
    console.log(`[NormalSelection] Final selected event: ${selectedEvent.titre} (ID: ${selectedEvent.id}, Date: ${selectedEvent.date})`);

    // *** APPEL CRUCIAL pour mettre à jour l'état du JEU ***
    await updateStateCallback(selectedEvent);
    // *** FIN APPEL CRUCIAL ***

    // Mise à jour Supabase (peut être faite ici ou dans updateStateCallback)
    try {
      const currentFrequency = (selectedEvent as any).frequency_score || 0;
      const newFrequencyScore = currentFrequency + 1;
      console.log(`[Supabase] Updating frequency for event ${selectedEvent.id}: ${currentFrequency} -> ${newFrequencyScore}`);
      // Ne pas attendre (await) si ce n'est pas critique pour la suite immédiate
      supabase
        .from("evenements")
        .update({ frequency_score: newFrequencyScore, last_used: new Date().toISOString() })
        .eq("id", selectedEvent.id)
        .then(({ error }) => { // Gérer l'erreur potentielle de manière asynchrone
            if (error) {
                 console.error(`[Supabase] Async failed update frequency score for event ${selectedEvent.id}:`, error);
            } else {
                 // console.log(`[Supabase] Async Frequency update successful for ${selectedEvent.id}.`); // Optionnel
            }
        });

    } catch (error) { // Attrape les erreurs synchrones (peu probable ici avec .then)
       console.error(`[Supabase] Sync error trying to update frequency score for event ${selectedEvent.id}:`, error);
    }

    console.log(`[EventSelector] ===== Exiting selectNewEvent (after Normal Selection) =====\n`);
    return selectedEvent; // Retourner l'événement sélectionné

  }, [
    // Lister explicitement toutes les dépendances utilisées dans useCallback
    setError, setIsGameOver, updateStateCallback, eventCount, forcedJumpEventCount,
    hasFirstForcedJumpHappened, fallbackCountdown, antiqueEventsCount, // Etats du hook
    getTimeDifference, isAntiqueEvent, canAddAntiqueEvent, getPeriod, // Callbacks internes (définis avec useCallback)
    getNextForcedJumpIncrement
    // userLevel est passé en argument, pas besoin ici
    // referenceEvent est passé en argument, pas besoin ici
    // events est passé en argument, pas besoin ici
    // usedEvents est passé en argument, pas besoin ici
  ]);

  // --- Callbacks pour update/reset antique count (Identiques) ---
  const updateAntiqueCount = useCallback((event: Event) => {
      if (isAntiqueEvent(event)) {
        // console.log(`[EventSelector] Antique event detected: ${event.titre}. Incrementing.`);
        setAntiqueEventsCount(prev => prev + 1);
      }
  }, [isAntiqueEvent]); // Dépend de isAntiqueEvent

  const resetAntiqueCount = useCallback(() => {
    console.log("[EventSelector] Resetting antique event count to 0.");
    setAntiqueEventsCount(0);
  }, []); // Pas de dépendances
  // --- Fin Callbacks ---

  // --- Objet Retourné par le Hook ---
  return {
    // Exposer les états si nécessaire par le parent
    antiqueEventsCount,
    eventCount,
    forcedJumpEventCount,

    // Exposer les fonctions principales et utilitaires
    selectNewEvent,
    getPeriod,
    isAntiqueEvent, // <-- **BIEN EXPORTÉE**
    updateAntiqueCount,
    resetAntiqueCount,
    getTimeDifference // <-- **BIEN EXPORTÉE**
  };
}

// Export par défaut du hook
export default useEventSelector;