import { useState, useCallback, useMemo, useRef } from 'react';
import { FirebaseAnalytics } from '../../lib/firebase';
import { Logger } from '../../utils/logger';
import { Event, HistoricalPeriod } from '../types';
import { LEVEL_CONFIGS } from '../levelConfigs';
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
// Constantes de Tiers de Notoriété
const TIER_THRESHOLDS = {
  TIER_1_STAR: 75,      // Les incontournables
  TIER_2_CLASSIC: 50,   // Culture générale
  TIER_3_EXPERT: 0      // Détails pointus
};

// Périodes Clés pour la difficulté sémantique
const KEY_PERIODS = [
  { id: 'WWI', start: 1914, end: 1918, traps: ['WWII'] },
  { id: 'WWII', start: 1939, end: 1945, traps: ['WWI'] },
  { id: 'REV_FR', start: 1789, end: 1799, traps: ['NAPOLEON'] },
  { id: 'NAPOLEON', start: 1804, end: 1815, traps: ['REV_FR'] }
];

/**
 * Système de probabilités par niveau pour les Tiers
 * Retourne les chances (0-1) de piocher dans chaque Tier
 */
const getTierProbabilities = (level: number) => {
  if (level <= 2) return { t1: 0.9, t2: 0.1, t3: 0.0 };      // Quasi que des stars
  if (level <= 5) return { t1: 0.7, t2: 0.25, t3: 0.05 };    // Introduction douce
  if (level <= 10) return { t1: 0.5, t2: 0.4, t3: 0.1 };     // Équilibre
  if (level <= 20) return { t1: 0.3, t2: 0.5, t3: 0.2 };     // Plus de classiques
  return { t1: 0.2, t2: 0.4, t3: 0.4 };                      // Mode expert
};

/**
 * Ajustement de la notoriété selon l'époque
 * L'Antiquité/Moyen-Âge étant plus durs, on booste leur score perçu
 */
const getAdjustedNotoriety = (notoriety: number, year: number): number => {
  if (year < 500) return Math.min(100, notoriety + 15);      // Antiquité : +15
  if (year < 1500) return Math.min(100, notoriety + 10);     // Moyen-Âge : +10
  if (year < 1800) return Math.min(100, notoriety + 5);      // Renaissance : +5
  return notoriety;                                          // Moderne : +0
};

/**
 * Système de pools par niveau pour optimiser l'engagement
 * Retourne les critères de filtrage selon le niveau du joueur
 * @deprecated Remplacé par le système de Tiers probabilistes, gardé pour compatibilité
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
  // Fallback générique
  return {
    minNotoriete: 0,
    minYear: -5000,
    frenchPercentage: 0.3,
    description: 'Standard',
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
  const [recentEras, setRecentEras] = useState<HistoricalPeriod[]>([]);
  const [consecutiveEraCount, setConsecutiveEraCount] = useState<number>(0);

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
  const getEraMultiplier = useCallback((year: number, level: number): number => {
    let m = 1.0;
    if (year >= 2020) m = 0.15; // Ultra-serré pour le très récent
    else if (year >= 2000) m = 0.3;
    else if (year >= 1980) m = 0.5;
    else if (year >= 1950) m = 0.7;
    else if (year >= 1900) m = 0.9;
    else if (year >= 1800) m = 1.0;
    else if (year >= 1500) m = 1.5;
    else if (year >= 1000) m = 2.2;
    else if (year >= 500) m = 3.8;
    else if (year >= 0) m = 5.5;
    else m = 7.5;

    // Amplification de l'écart pour les bas niveaux dans le passé (Anti-difficulté)
    // C'est cette logique qui s'amenuise avec les niveaux
    if (m > 1) {
      // Facteur qui décroît avec le niveau : Level 1 = 3.5x, Level 7+ = 1.0x
      const levelFactor = Math.max(1, 3.5 - (level - 1) * 0.4);
      return m * levelFactor;
    }
    return m;
  }, []);

  /**
   * Calcule le timeGap adaptatif basé sur l'année de référence
   * Retourne { base, minimum, maximum } adaptés à l'époque
   */
  const getAdaptiveTimeGap = useCallback((
    referenceYear: number,
    levelTimeGap: { base: number; minimum: number; variance: number },
    level: number
  ): { base: number; minimum: number; maximum: number } => {
    const multiplier = getEraMultiplier(referenceYear, level);

    const adaptedBase = Math.max(1, Math.round(levelTimeGap.base * multiplier));
    const adaptedMin = Math.max(1, Math.round(levelTimeGap.minimum * multiplier));
    const adaptedMax = Math.round((levelTimeGap.base + levelTimeGap.variance) * multiplier);

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

    const totalCandidates = events.length;
    const usedCount = usedEvents.size;

    let filtered = events.filter(e => !usedEvents.has(e.id) && e.date && e.id !== referenceEvent.id && getTimeDifference(e.date, referenceEvent.date) !== 0);
    const afterBasicFilter = filtered.length;

    // 2. Filtrage par TIER PROBABILISTE
    // On détermine quel Tier on vise pour cet événement spécifique
    const probs = getTierProbabilities(userLevel);
    const rand = Math.random();
    let targetTier = 3;
    if (rand < probs.t1) targetTier = 1;
    else if (rand < probs.t1 + probs.t2) targetTier = 2;

    const afterPoolFilter = filtered.filter(e => {
      const rawNotoriety = (e as any).notoriete ?? 0;
      const { year } = getCachedDateInfo(e.date);
      const adjustedNotoriety = getAdjustedNotoriety(rawNotoriety, year);

      // Vérification du Tier
      if (targetTier === 1) return adjustedNotoriety >= TIER_THRESHOLDS.TIER_1_STAR;
      if (targetTier === 2) return adjustedNotoriety >= TIER_THRESHOLDS.TIER_2_CLASSIC;
      return true; // Tier 3 accepte tout (mais sera filtré par le sort score plus tard)
    });

    filtered = afterPoolFilter;
    const afterTierFilter = filtered.length;

    // 3. Filtrage temporel préliminaire (large)
    const timeGapBase = config.timeGap?.base || 100;
    const preTimeLimit = timeGapBase * 3; // Limite large pour le pré-filtrage
    const afterTime = filtered.filter(e => {
      const timeDiff = getTimeDifference(e.date, referenceEvent.date);
      return timeDiff <= preTimeLimit;
    });

    filtered = afterTime;
    const afterTimeFilter = filtered.length;

    // 4. Filtrage antique
    if (!canAddMoreAntiques) {
      const afterAntique = filtered.filter(e => !isAntiqueEvent(e));

      filtered = afterAntique;
    }

    // 4.5 Filtrage diversité d'époque (consecutive)
    // À bas niveau, on évite de rester trop longtemps dans la même époque
    const currentEra = recentEras.length > 0 ? recentEras[recentEras.length - 1] : null;
    if (userLevel <= 5 && consecutiveEraCount >= 2 && currentEra) {
      const afterDiversity = filtered.filter(e => getPeriod(e.date) !== currentEra);
      // Ne pas vider le pool si trop restrictif
      if (afterDiversity.length >= 10) {
        filtered = afterDiversity;
      }
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

    Logger.debug('GameLogic', `Pool reduction: ${totalCandidates} -> ${afterBasicFilter} (used) -> ${afterTierFilter} (tier ${targetTier}) -> ${afterTimeFilter} (time) -> ${limited.length} (final)`, {
      level: userLevel,
      refEvent: referenceEvent.titre,
      targetTier
    });

    return limited;
  }, [canAddAntiqueEvent, getTimeDifference, isAntiqueEvent, recentEras, consecutiveEraCount, getPeriod]);

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
      } catch { }
      return cached;
    }

    const timeDiff = getTimeDifference(evt.date, referenceEvent.date);
    if (!isFinite(timeDiff)) return -Infinity;

    const weights = getWeightsForLevel(userLevel);
    const randomFactor = 0.9 + Math.random() * 0.2;

    // NOUVEAU : Utiliser le timeGap adaptatif basé sur l'époque de référence et le niveau
    const refYear = getCachedDateInfo(referenceEvent.date).year;
    const adaptiveGap = getAdaptiveTimeGap(refYear, timeGap, userLevel);
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

    // SCORING SÉMANTIQUE (Périodes Clés)
    let contextScore = 0;
    const candYear = getCachedDateInfo(evt.date).year;

    const refKeyPeriod = KEY_PERIODS.find(p => refYear >= p.start && refYear <= p.end);
    const candKeyPeriod = KEY_PERIODS.find(p => candYear >= p.start && candYear <= p.end);

    if (refKeyPeriod) {
      const isSamePeriod = candKeyPeriod?.id === refKeyPeriod.id;
      const isTrapPeriod = refKeyPeriod.traps.includes(candKeyPeriod?.id || '');

      if (userLevel <= 4) {
        // MODE FACILE : Éviter la confusion absolue
        // Si on est dans une période clé, on évite la même période ou son piège direct
        if (isSamePeriod) contextScore = -500; // Interdit (ex: 1942 vs 1944)
        else if (isTrapPeriod) contextScore = -300; // Fortement déconseillé (ex: 1916 vs 1942)
        else contextScore = 50; // Bonus pour être clairement en dehors
      } else if (userLevel >= 5) {
        // MODE PIÈGE : Chercher la confusion dès le niveau 5
        if (isSamePeriod) contextScore = 150; // Très recherché (Précision intra-période)
        else if (isTrapPeriod) contextScore = 100; // Recherché (Piège inter-périodes)
      }
    }

    const totalScore = Math.max(0, gapScore + notorieteScore + variationBonus + contextScore - frequencyMalus - recencyPenalty);

    const parts = {
      difficulty: 0,
      notorieteBonus: notorieteScore,
      timeGap: gapScore,
      context: contextScore,
      recencyPenalty: -recencyPenalty,
      freqPenalty: -frequencyMalus,
      jitter: variationBonus,
    };
    try {
      (evt as any)._score = totalScore;
      (evt as any)._scoreParts = parts;
    } catch { }

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
    const explainOn = false;
    const explainStartTs = Date.now();
    const exclusionAcc = { logExclusion: (..._args: any[]) => { }, flush: () => ({ truncated: 0 }), size: () => 0 };

    // Debouncing pour éviter les appels multiples rapprochés
    const now = Date.now();
    if (now - lastSelectionTime < DEBOUNCE_DELAY) {

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

    }

    // --- LOGIQUE DE BALANCE TEMPORELLE (Anti-Tunnel Historique) ---
    // Empêcher le joueur de rester trop longtemps loin de 2024 à bas niveau
    const { year: currentRefYear } = getCachedDateInfo(referenceEvent.date);
    const isFarFromPresent = currentRefYear < 1900; // "Loin" = avant 1900

    // Mettre à jour le compteur de "tunnel"
    // Note: on utilise une ref ou un state, mais ici on va calculer dynamiquement pour la prochaine sélection
    // Idéalement on devrait avoir un state, mais pour l'instant on va utiliser une logique simplifiée basée sur le saut forcé

    // Si on est loin depuis trop longtemps, on force un retour vers le présent
    // On utilise forcedJumpEventCount pour déclencher ça si ce n'est pas déjà le cas
    let forceReturnToPresent = false;

    if (userLevel <= 5 && isFarFromPresent) {
      // À bas niveau, si on est loin, on a une chance de vouloir revenir
      // Plus le niveau est bas, plus on veut revenir vite
      const returnProbability = userLevel <= 2 ? 0.4 : 0.2;
      if (Math.random() < returnProbability) {
        forceReturnToPresent = true;
        forceReturnToPresent = true;
      }
    }

    // --- LOGIQUE DE SAUT TEMPOREL FORCÉ ---
    const isForcedJumpTriggered = localEventCount === forcedJumpEventCount || forceReturnToPresent;



    if (isForcedJumpTriggered) {

      const { year: refYear } = getCachedDateInfo(referenceEvent.date);

      // NOUVEAU : Sauts MASSIFS et BIAISÉS vers le passé pour garantir la diversité
      let jumpDistance;
      let jumpForward;

      // Si on est dans l'ère moderne (>1700), FORCER des sauts vers l'Antiquité/Moyen-Âge
      // SAUF si on force le retour au présent
      const eraMultiplier = getEraMultiplier(refYear, userLevel);

      // DÉTECTION DE TUNNEL ANCIEN : Si on est coincé dans le passé depuis trop longtemps
      // Niveaux 1-10 : Protection stricte (2 événements)
      // Niveaux 11-15 : Protection moyenne (3 événements)
      // Niveaux 16-19 : Protection légère (4 événements)
      let tunnelThreshold = 2;
      if (userLevel > 15) tunnelThreshold = 4;
      else if (userLevel > 10) tunnelThreshold = 3;

      const isStuckInPast = userLevel <= 19 &&
        recentEras.length >= tunnelThreshold &&
        recentEras.slice(-tunnelThreshold).every(era => era === HistoricalPeriod.ANTIQUITY || era === HistoricalPeriod.MIDDLE_AGES);

      // DÉTECTION DE TUNNEL MODERNE : Si on est coincé dans le récent depuis trop longtemps
      const isStuckInModern = recentEras.length >= 3 &&
        recentEras.every(era =>
          era === HistoricalPeriod.NINETEENTH ||
          era === HistoricalPeriod.TWENTIETH ||
          era === HistoricalPeriod.TWENTYFIRST
        );

      if (forceReturnToPresent || isStuckInPast) {
        // Retour forcé vers le présent/moderne (1800-2024) pour faire respirer le joueur
        // On élargit un peu la plage (1800 au lieu de 1950) pour varier
        const targetYear = Math.floor(Math.random() * (2024 - 1800 + 1)) + 1800;
        jumpDistance = Math.abs(refYear - targetYear);
        jumpForward = true; // Toujours vers le futur

      } else if (isStuckInModern) {
        // Retour forcé vers le passé (avant 1800) pour varier
        // On cible Antiquité, Moyen-Âge ou Renaissance
        const targetYear = Math.floor(Math.random() * (1700 - (-500) + 1)) - 500;
        jumpDistance = Math.abs(refYear - targetYear);
        jumpForward = false; // Toujours vers le passé

      } else if (refYear > 1700) {
        // 80% de chance d'aller dans le passé lointain
        const goToAncientTimes = Math.random() < 0.8;

        if (goToAncientTimes) {
          // Saut MASSIF vers Antiquité (-500 à 500) ou Moyen-Âge (500-1500)
          // Éviter de retourner dans une époque qu'on vient de quitter
          const antiquity = HistoricalPeriod.ANTIQUITY;
          const middleAges = HistoricalPeriod.MIDDLE_AGES;

          let targetEra: HistoricalPeriod;
          if (recentEras.includes(antiquity) && !recentEras.includes(middleAges)) {
            targetEra = middleAges;
          } else if (recentEras.includes(middleAges) && !recentEras.includes(antiquity)) {
            targetEra = antiquity;
          } else {
            targetEra = Math.random() < 0.5 ? antiquity : middleAges;
          }

          if (targetEra === antiquity) {
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
          const antiquity = HistoricalPeriod.ANTIQUITY;
          const middleAges = HistoricalPeriod.MIDDLE_AGES;
          let targetEra: HistoricalPeriod;

          if (recentEras.includes(antiquity)) targetEra = middleAges;
          else if (recentEras.includes(middleAges)) targetEra = antiquity;
          else targetEra = Math.random() < 0.5 ? antiquity : middleAges;

          const targetYear = targetEra === antiquity
            ? Math.floor(Math.random() * 1000) - 500
            : Math.floor(Math.random() * 1000) + 500;

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
        .filter(e => !usedEvents.has(e.id) && e.date && e.id !== referenceEvent.id && getTimeDifference(e.date, referenceEvent.date) !== 0)
        .filter(e => {
          const { year: eventYear } = getCachedDateInfo(e.date);
          const notoriete = (e as any).notoriete ?? 0;

          // Respecter la notoriété minimale pour les bas niveaux via le système de Tier simplifié pour les sauts
          const adjustedNotoriety = getAdjustedNotoriety(notoriete, eventYear);
          if (userLevel <= 2 && adjustedNotoriety < TIER_THRESHOLDS.TIER_1_STAR) return false;
          if (userLevel <= 5 && adjustedNotoriety < TIER_THRESHOLDS.TIER_2_CLASSIC) return false;

          // CRUCIAL : Même pour un saut, on respecte l'écart minimum adaptatif
          // pour éviter des situations trop dures (ex: 881 vs 1081 au niveau 1)
          const adaptiveGap = getAdaptiveTimeGap(refYear, config.timeGap, userLevel);
          if (Math.abs(eventYear - refYear) < adaptiveGap.minimum) return false;

          const timeDiffFromTarget = Math.abs(eventYear - targetYear);
          // Tolérance large pour maximiser les chances de trouver un candidat
          // Mais on privilégie quand même la direction demandée
          if (jumpForward && eventYear <= refYear) return false;
          if (!jumpForward && eventYear >= refYear) return false;

          return timeDiffFromTarget <= jumpDistance * 1.5; // Marge de 50%
        })
        .slice(0, 50); // Augmenter la limite pour avoir plus de choix



      if (jumpCandidates.length > 0) {
        // Sélection aléatoire pour le saut temporel
        const jumpEvent = jumpCandidates[Math.floor(Math.random() * jumpCandidates.length)];
        const jumpYear = getCachedDateInfo(jumpEvent.date).year;

        // Déterminer l'époque cible pour le message BASÉE sur l'année RÉELLE de l'événement trouvé
        // Cela évite les incohérences (ex: viser 1970 mais trouver 180)
        let targetEpoque = '';
        if (jumpYear < 500) targetEpoque = "l'Antiquité";
        else if (jumpYear < 1500) targetEpoque = 'le Moyen-Âge';
        else if (jumpYear < 1800) targetEpoque = 'la Renaissance';
        else if (jumpYear < 1900) targetEpoque = 'le XIXe siècle';
        else if (jumpYear < 2000) targetEpoque = 'le XXe siècle';
        else targetEpoque = 'le XXIe siècle';

        // Mise à jour de l'état de diversité
        const jumpEra = getPeriod(jumpEvent.date);
        setRecentEras(prev => {
          const next = [...prev, jumpEra];
          return next.slice(-3);
        });
        setConsecutiveEraCount(prev => {
          const last = recentEras[recentEras.length - 1];
          return last === jumpEra ? prev + 1 : 1;
        });

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
          id: jumpEvent.id,
          titre: jumpEvent.titre,
          from: refYear,
          to: jumpYear,
          epoque: targetEpoque,
          direction: jumpForward ? 'forward' : 'backward',
          distance: jumpDistance
        });

        return markedJumpEvent;
      } else {

        // Continuer vers sélection normale si échec
      }
    }
    // --- FIN LOGIQUE SAUT TEMPOREL ---

    // 🚀 PRÉ-FILTRAGE INTELLIGENT (réduit de 896 à ~150 événements max)
    let preFilteredEvents = preFilterEvents(events, usedEvents, userLevel, referenceEvent, explainOn ? { logExclusion: exclusionAcc.logExclusion } : undefined);

    // Si le pré-filtrage ne retourne rien, utiliser TOUS les événements non utilisés
    if (preFilteredEvents.length === 0) {

      preFilteredEvents = events.filter(e => !usedEvents.has(e.id) && e.date && e.id !== referenceEvent.id && getTimeDifference(e.date, referenceEvent.date) !== 0);

      // Si vraiment AUCUN événement non utilisé, réutiliser des événements
      if (preFilteredEvents.length === 0) {

        preFilteredEvents = events.filter(e => e.date && e.id !== referenceEvent.id && getTimeDifference(e.date, referenceEvent.date) !== 0);
      }

      // Si même après ça il n'y a rien (base vide), alors c'est critique
      if (preFilteredEvents.length === 0) {
        setError("Base de données vide ou corrompue !");
        setIsGameOver(true);
        return null;
      }
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
        // Événement BONUS : très facile (notoriété maximale)
      }

      if (forceEasy) {
        // Forcer événement facile : notoriété élevée
        // Forcer événement facile : notoriété élevée
        return Math.max(70, poolMinNotoriete + 25);
      }

      // Adaptation selon le streak
      let streakAdjustment = 0;
      if (streak >= 10) {
        // Bon streak : augmenter légèrement la difficulté
        streakAdjustment = -10; // Baisse de 10 points la notoriété minimale = plus difficile
        streakAdjustment = -10; // Baisse de 10 points la notoriété minimale = plus difficile
      } else if (streak === 0) {
        // Streak cassé : légèrement plus facile pour aider à reconstruire
        streakAdjustment = 5; // Augmente de 5 points la notoriété minimale = plus facile
        streakAdjustment = 5; // Augmente de 5 points la notoriété minimale = plus facile
      }

      // Logique normale (ancienne) + ajustement streak
      let baseMin = 0;
      if (level <= 1) baseMin = 45;
      else if (level === 2) baseMin = 50;
      else if (level === 3) baseMin = 55;
      else if (level <= 5) baseMin = 40;

      return Math.max(0, baseMin + streakAdjustment);
    };

    const minNotoriete = computeMinNotoriete(userLevel, shouldForceEasyEvent, shouldForceBonusEvent, currentStreak, 30);
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





    // SYSTÈME DE FALLBACK MULTI-NIVEAUX ROBUSTE - GARANTIT qu'un événement sera TOUJOURS trouvé
    let finalEvents = scoredEvents;
    let selectionPath: 'normal' | 'fallback_1.5x' | 'fallback_2.5x' | 'fallback_5x' | 'fallback_ignore_gap' | 'fallback_all_unused' | 'fallback_reset_50pct' = 'normal';



    // Fallback 1: Élargir timeGap de 50%
    if (finalEvents.length === 0) {

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
    }

    // Fallback 2: Élargir timeGap de 150%
    if (finalEvents.length === 0) {

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
    }

    // Fallback 3: Élargir timeGap de 400%
    if (finalEvents.length === 0) {

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
    }

    // Fallback 4: IGNORER timeGap complètement, juste pool de notoriété
    if (finalEvents.length === 0) {

      finalEvents = scoringPool
        .map(evt => ({
          event: evt,
          score: scoreEventOptimized(evt, referenceEvent, userLevel, timeGap),
          timeDiff: getTimeDifference(evt.date, referenceEvent.date)
        }))
        .filter(({ score }) => isFinite(score) && score > 0)
        .sort((a, b) => b.score - a.score);

      if (finalEvents.length > 0) selectionPath = 'fallback_ignore_gap';
    }

    // Fallback 5: TOUS les événements non utilisés (random)
    if (finalEvents.length === 0) {

      const allUnusedEvents = events.filter(e => !usedEvents.has(e.id) && e.date && e.id !== referenceEvent.id && getTimeDifference(e.date, referenceEvent.date) !== 0);

      finalEvents = allUnusedEvents.slice(0, 50).map(evt => ({
        event: evt,
        score: Math.random() * 100,
        timeDiff: getTimeDifference(evt.date, referenceEvent.date)
      }));

      if (finalEvents.length > 0) selectionPath = 'fallback_all_unused';
    }

    // Fallback 6: RESET 50% événements les plus anciens + retry
    if (finalEvents.length === 0) {


      // Reset 50% des événements (les premiers ajoutés à usedEvents)
      const usedArray = Array.from(usedEvents);
      const toReset = usedArray.slice(0, Math.floor(usedArray.length * 0.5));
      toReset.forEach(id => usedEvents.delete(id));

      // Retry avec événements fraîchement réinitialisés
      const resetEvents = events.filter(e => !usedEvents.has(e.id) && e.date && e.id !== referenceEvent.id && getTimeDifference(e.date, referenceEvent.date) !== 0);
      finalEvents = resetEvents.slice(0, 50).map(evt => ({
        event: evt,
        score: Math.random() * 100,
        timeDiff: getTimeDifference(evt.date, referenceEvent.date)
      }));

      if (finalEvents.length > 0) selectionPath = 'fallback_reset_50pct';
    }

    // GARANTIE ABSOLUE : Si vraiment aucun événement après tout ça, c'est critique
    if (finalEvents.length === 0) {


      // Dernière tentative désespérée : Prendre N'IMPORTE QUEL événement de la base
      const desperateEvents = events.filter(e => e.date && getTimeDifference(e.date, referenceEvent.date) !== 0).slice(0, 10);
      if (desperateEvents.length > 0) {

        finalEvents = [{ event: desperateEvents[0], score: 1, timeDiff: 0 }];
        selectionPath = 'fallback_reset_50pct'; // Réutiliser ce path
      } else {
        // Si même ça échoue, c'est que la base de données est vide
        setError("Base de données vide ou corrompue. Impossible de continuer.");
        setIsGameOver(true);
        return null;
      }
    }



    // Sélection finale (top 5 pour la variété)
    const topEvents = finalEvents.slice(0, Math.min(5, finalEvents.length));
    const topK = topEvents.map(x => x.event);

    let pickedIndex = Math.floor(Math.random() * topEvents.length);
    const selectedEvent = topEvents[pickedIndex].event;


    // NOTE: eventCount a déjà été incrémenté au début de la fonction (ligne 370)
    // Ne PAS incrémenter à nouveau ici pour éviter la double incrémentation

    // Marquer l'événement comme bonus si c'est le cas
    const selected = { ...(selectedEvent as any), _isBonusEvent: wasBonusEvent } as Event;

    // Mise à jour de l'état de diversité
    const selectedEra = getPeriod(selected.date);
    setRecentEras(prev => {
      const next = [...prev, selectedEra];
      return next.slice(-3);
    });
    setConsecutiveEraCount(prev => {
      const last = recentEras[recentEras.length - 1];
      return last === selectedEra ? prev + 1 : 1;
    });

    await updateStateCallback(selected);

    console.log('[SELECT_NEW_EVENT] ✅ Événement sélectionné:', {
      level: userLevel, // AJOUTÉ : Pour savoir à quel niveau on est
      id: (selected as any)?.id,
      titre: (selected as any)?.titre,
      notoriete: (selected as any)?.notoriete ?? null,
      isBonus: wasBonusEvent,
      isTemporalJump: (selected as any)?._isTemporalJump ?? false,
      path: selectionPath,
      eventCount: localEventCount,
      nextJumpAt: forcedJumpEventCount,
    });





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
        // Silencieux : on ne veut pas casser le jeu pour un problème d'analytics
      }
    };

    // Exécuter en arrière-plan sans bloquer
    trackEventSelection();

    return selected;

  }, [
    setError, setIsGameOver, updateStateCallback, lastSelectionTime,
    preFilterEvents, scoreEventOptimized, getTimeDifference, shouldForceEasyEvent,
    recentEras, consecutiveEraCount, getPeriod, forcedJumpEventCount, bonusEventCountdown
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
        // Forcer un événement facile au prochain tour
        setShouldForceEasyEvent(true);
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
