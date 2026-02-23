/**
 * SIMULATEUR DE COUVERTURE DU CATALOGUE D'ÉVÉNEMENTS
 *
 * Réplique fidèlement la logique de sélection de useEventSelector.ts
 * pour mesurer quel pourcentage du catalogue de 2654 événements est réellement utilisé.
 *
 * Usage: node scripts/simulate_coverage.mjs [options]
 *   --games N       Nombre de parties à simuler par niveau (défaut: 500)
 *   --levels 1,5,10 Niveaux à simuler (défaut: tous 1-20)
 *   --verbose        Affiche les détails de chaque partie
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// ============================================================
// CONFIGURATION SUPABASE (Production)
// ============================================================
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
// CONSTANTES RÉPLIQUÉES DE useEventSelector.ts
// ============================================================
const ANTIQUE_YEAR_THRESHOLD = 500;
const MAX_EVENTS_TO_PROCESS = 500;
const MAX_SCORING_POOL = 300;

const ANTIQUE_EVENTS_LIMITS = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };

const TIER_THRESHOLDS = {
  TIER_1_STAR: 75,
  TIER_2_CLASSIC: 50,
  TIER_3_EXPERT: 0
};

const KEY_PERIODS = [
  { id: 'WWI', start: 1914, end: 1918, traps: ['WWII'] },
  { id: 'WWII', start: 1939, end: 1945, traps: ['WWI'] },
  { id: 'REV_FR', start: 1789, end: 1799, traps: ['NAPOLEON'] },
  { id: 'NAPOLEON', start: 1804, end: 1815, traps: ['REV_FR'] }
];

const HistoricalPeriod = {
  ANTIQUITY: 'ANTIQUITY',
  MIDDLE_AGES: 'MIDDLE_AGES',
  RENAISSANCE: 'RENAISSANCE',
  NINETEENTH: 'NINETEENTH',
  TWENTIETH: 'TWENTIETH',
  TWENTYFIRST: 'TWENTYFIRST'
};

// ============================================================
// LEVEL CONFIGS (répliqué de levelConfigs.ts)
// ============================================================
const LEVEL_CONFIGS = {
  1: { level: 1, eventsNeeded: 5, timeGap: { base: 200, variance: 100, minimum: 80 } },
  2: { level: 2, eventsNeeded: 6, timeGap: { base: 100, variance: 50, minimum: 40 } },
  3: { level: 3, eventsNeeded: 7, timeGap: { base: 60, variance: 30, minimum: 25 } },
  4: { level: 4, eventsNeeded: 8, timeGap: { base: 40, variance: 20, minimum: 15 } },
  5: { level: 5, eventsNeeded: 9, timeGap: { base: 25, variance: 12, minimum: 10 } },
  6: { level: 6, eventsNeeded: 10, timeGap: { base: 18, variance: 10, minimum: 8 } },
  7: { level: 7, eventsNeeded: 11, timeGap: { base: 18, variance: 10, minimum: 8 } },
  8: { level: 8, eventsNeeded: 12, timeGap: { base: 12, variance: 6, minimum: 5 } },
  9: { level: 9, eventsNeeded: 13, timeGap: { base: 12, variance: 8, minimum: 6 } },
  10: { level: 10, eventsNeeded: 14, timeGap: { base: 8, variance: 4, minimum: 3 } },
  11: { level: 11, eventsNeeded: 15, timeGap: { base: 6, variance: 4, minimum: 3 } },
  12: { level: 12, eventsNeeded: 16, timeGap: { base: 5, variance: 3, minimum: 2 } },
  13: { level: 13, eventsNeeded: 17, timeGap: { base: 4, variance: 2, minimum: 2 } },
  14: { level: 14, eventsNeeded: 18, timeGap: { base: 3, variance: 1, minimum: 1 } },
  15: { level: 15, eventsNeeded: 19, timeGap: { base: 3, variance: 1, minimum: 1 } },
  16: { level: 16, eventsNeeded: 20, timeGap: { base: 2, variance: 1, minimum: 1 } },
  17: { level: 17, eventsNeeded: 21, timeGap: { base: 2, variance: 1, minimum: 1 } },
  18: { level: 18, eventsNeeded: 22, timeGap: { base: 2, variance: 1, minimum: 1 } },
  19: { level: 19, eventsNeeded: 23, timeGap: { base: 1, variance: 1, minimum: 1 } },
  20: { level: 20, eventsNeeded: 99999, timeGap: { base: 1, variance: 0, minimum: 1 } },
};

// ============================================================
// SELECTION WEIGHTS (répliqué de selectionWeights.ts)
// ============================================================
function getWeightsForLevel(level) {
  if (level <= 3) return { alphaProximity: 1.2, betaDifficulty: 1.0, gammaNotoriete: 0.6, thetaFrequencyMalus: 25, thetaFrequencyCap: 500 };
  if (level <= 8) return { alphaProximity: 1.1, betaDifficulty: 1.2, gammaNotoriete: 0.5, thetaFrequencyMalus: 22, thetaFrequencyCap: 700 };
  if (level <= 15) return { alphaProximity: 0.9, betaDifficulty: 1.4, gammaNotoriete: 0.4, thetaFrequencyMalus: 20, thetaFrequencyCap: 900 };
  return { alphaProximity: 0.7, betaDifficulty: 1.8, gammaNotoriete: 0.3, thetaFrequencyMalus: 18, thetaFrequencyCap: 1000 };
}

// ============================================================
// FONCTIONS UTILITAIRES (répliquées fidèlement)
// ============================================================
const dateCache = new Map();

function getCachedDateInfo(dateStr) {
  const trimmedKey = (dateStr || '').trim();
  if (!dateCache.has(trimmedKey)) {
    try {
      const date = new Date(trimmedKey);
      const year = date.getFullYear();
      const timestamp = date.getTime();
      if (!isNaN(year) && !isNaN(timestamp)) {
        dateCache.set(trimmedKey, { year, timestamp });
      } else {
        dateCache.set(trimmedKey, { year: 2000, timestamp: 946684800000 });
      }
    } catch {
      dateCache.set(trimmedKey, { year: 2000, timestamp: 946684800000 });
    }
  }
  return dateCache.get(trimmedKey);
}

function getPeriod(date) {
  const { year } = getCachedDateInfo(date);
  if (year < 500) return HistoricalPeriod.ANTIQUITY;
  if (year < 1500) return HistoricalPeriod.MIDDLE_AGES;
  if (year < 1800) return HistoricalPeriod.RENAISSANCE;
  if (year < 1900) return HistoricalPeriod.NINETEENTH;
  if (year < 2000) return HistoricalPeriod.TWENTIETH;
  return HistoricalPeriod.TWENTYFIRST;
}

function getTierProbabilities(level) {
  if (level <= 2) return { t1: 0.75, t2: 0.20, t3: 0.05 };
  if (level <= 5) return { t1: 0.60, t2: 0.30, t3: 0.10 };
  if (level <= 10) return { t1: 0.45, t2: 0.40, t3: 0.15 };
  if (level <= 20) return { t1: 0.30, t2: 0.45, t3: 0.25 };
  return { t1: 0.20, t2: 0.40, t3: 0.40 };
}

function getAdjustedNotoriety(notoriety, year) {
  if (year < 500) return Math.min(100, notoriety + 15);
  if (year < 1500) return Math.min(100, notoriety + 10);
  if (year < 1800) return Math.min(100, notoriety + 5);
  return notoriety;
}

function getEraMultiplier(year, level) {
  let m = 1.0;
  if (year >= 2020) m = 0.15;
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

  if (m > 1) {
    const levelFactor = Math.max(1, 3.5 - (level - 1) * 0.4);
    return m * levelFactor;
  }
  return m;
}

function getAdaptiveTimeGap(referenceYear, levelTimeGap, level) {
  const multiplier = getEraMultiplier(referenceYear, level);
  const adaptedBase = Math.max(1, Math.round(levelTimeGap.base * multiplier));
  const adaptedMin = Math.max(1, Math.round(levelTimeGap.minimum * multiplier));
  const adaptedMax = Math.round((levelTimeGap.base + levelTimeGap.variance) * multiplier);
  return { base: adaptedBase, minimum: adaptedMin, maximum: adaptedMax };
}

function getTimeDifference(date1, date2) {
  if (!date1 || !date2) return Infinity;
  const info1 = getCachedDateInfo(date1);
  const info2 = getCachedDateInfo(date2);
  if (info1.timestamp === info2.timestamp) return 0;
  const diffInMilliseconds = Math.abs(info1.timestamp - info2.timestamp);
  return diffInMilliseconds / (365.25 * 24 * 60 * 60 * 1000);
}

function notorieteProfileForLevel(level) {
  if (level <= 3) return { target: 0.6, tolerance: 0.45 };
  if (level <= 6) return { target: 0.5, tolerance: 0.45 };
  if (level <= 10) return { target: 0.4, tolerance: 0.45 };
  return { target: 0.35, tolerance: 0.5 };
}

function getNextForcedJumpIncrement() {
  return Math.floor(Math.random() * (5 - 3 + 1)) + 3; // 3-5
}

// ============================================================
// SIMULATION D'UNE PARTIE COMPLÈTE
// ============================================================

/**
 * Simule une partie complète du niveau 1 jusqu'au niveau targetLevel.
 * Retourne le Set des IDs d'événements utilisés.
 */
function simulateGame(allEvents, targetLevel, personalHistory = new Map()) {
  const usedEvents = new Set();
  let antiqueEventsCount = 0;
  let eventCount = 2;
  let recentEras = [];
  let consecutiveEraCount = 0;
  let consecutiveErrors = 0;
  let shouldForceEasyEvent = false;
  let shouldForceBonusEvent = false;
  let bonusEventCountdown = Math.floor(Math.random() * (10 - 8 + 1)) + 8;
  let forcedJumpEventCount = Math.floor(Math.random() * (5 - 3 + 1)) + 3;
  let hasFirstForcedJumpHappened = false;

  // ---- SÉLECTION INITIALE (réplique de useInitGame) ----
  const initialCandidates = allEvents.filter(e => {
    if (!e.date) return false;
    const year = getCachedDateInfo(e.date).year;
    const notoriete = e.notoriete ?? 0;
    return notoriete >= 80 && year >= 1850;
  });

  let firstEvent, secondEvent;

  if (initialCandidates.length < 2) {
    const fallback = allEvents.filter(e => {
      if (!e.date) return false;
      const year = getCachedDateInfo(e.date).year;
      const notoriete = e.notoriete ?? 50;
      return notoriete >= 60 && year >= 1800;
    });
    const shuffled = [...fallback].sort(() => 0.5 - Math.random());
    firstEvent = shuffled[0];
    secondEvent = shuffled.find(e => {
      const info = getCachedDateInfo(e.date);
      const refInfo = getCachedDateInfo(firstEvent.date);
      return e.id !== firstEvent.id && info.timestamp !== refInfo.timestamp && info.year !== refInfo.year;
    }) || shuffled[1];
  } else {
    // Tenter d'avoir un événement français
    const frenchEvents = initialCandidates.filter(e => {
      const pays = e.pays;
      return Array.isArray(pays) && pays.includes('France');
    });

    if (frenchEvents.length > 0) {
      const shuffledFrench = [...frenchEvents].sort(() => 0.5 - Math.random());
      firstEvent = shuffledFrench[0];
    } else {
      const shuffled = [...initialCandidates].sort(() => 0.5 - Math.random());
      firstEvent = shuffled[0];
    }

    const remaining = initialCandidates.filter(e => {
      if (e.id === firstEvent.id) return false;
      const info = getCachedDateInfo(e.date);
      const refInfo = getCachedDateInfo(firstEvent.date);
      return info.timestamp !== refInfo.timestamp && info.year !== refInfo.year;
    });
    const shuffledRemaining = [...remaining].sort(() => 0.5 - Math.random());
    secondEvent = shuffledRemaining[0] || initialCandidates.find(e => e.id !== firstEvent.id);
  }

  if (!firstEvent || !secondEvent) return usedEvents;

  usedEvents.add(firstEvent.id);
  usedEvents.add(secondEvent.id);

  if (getCachedDateInfo(firstEvent.date).year < ANTIQUE_YEAR_THRESHOLD) antiqueEventsCount++;
  if (getCachedDateInfo(secondEvent.date).year < ANTIQUE_YEAR_THRESHOLD) antiqueEventsCount++;

  let referenceEvent = secondEvent;
  let previousEvent = firstEvent;

  // ---- BOUCLE DE SÉLECTION PAR NIVEAU ----
  for (let level = 1; level <= targetLevel; level++) {
    const config = LEVEL_CONFIGS[level];
    if (!config) break;

    const eventsForThisLevel = (level === 1) ? config.eventsNeeded - 2 : config.eventsNeeded;
    // Le premier niveau commence déjà avec 2 événements

    for (let i = 0; i < eventsForThisLevel; i++) {
      const selected = selectNewEvent(
        allEvents, referenceEvent, level, usedEvents, 0,
        { antiqueEventsCount, eventCount, recentEras, consecutiveEraCount,
          shouldForceEasyEvent, shouldForceBonusEvent, bonusEventCountdown,
          forcedJumpEventCount, hasFirstForcedJumpHappened, personalHistory }
      );

      if (!selected) continue;

      // Mettre à jour l'état
      usedEvents.add(selected.id);
      eventCount++;

      if (getCachedDateInfo(selected.date).year < ANTIQUE_YEAR_THRESHOLD) {
        antiqueEventsCount++;
      }

      // Mettre à jour ères récentes
      const selectedEra = getPeriod(selected.date);
      recentEras = [...recentEras, selectedEra].slice(-3);
      const lastEra = recentEras.length > 1 ? recentEras[recentEras.length - 2] : null;
      consecutiveEraCount = lastEra === selectedEra ? consecutiveEraCount + 1 : 1;

      // Mettre à jour la ref
      previousEvent = referenceEvent;
      referenceEvent = selected;

      // Mettre à jour l'historique personnel
      const current = personalHistory.get(selected.id) || { times_seen: 0 };
      personalHistory.set(selected.id, { times_seen: current.times_seen + 1 });

      // Anti-frustration simulation (50% chance de réponse correcte pour simuler)
      const isCorrect = Math.random() > 0.3; // 70% de succès moyen
      if (isCorrect) {
        consecutiveErrors = 0;
        shouldForceEasyEvent = false;
      } else {
        consecutiveErrors++;
        if (consecutiveErrors >= 2) {
          shouldForceEasyEvent = true;
        }
      }

      // Bonus event countdown
      if (eventCount % bonusEventCountdown === 0) {
        shouldForceBonusEvent = true;
        bonusEventCountdown = Math.floor(Math.random() * (10 - 8 + 1)) + 8;
      } else {
        shouldForceBonusEvent = false;
      }
    }
  }

  return usedEvents;
}

// ============================================================
// SÉLECTION D'UN ÉVÉNEMENT (réplique fidèle de selectNewEvent)
// ============================================================
function selectNewEvent(allEvents, referenceEvent, userLevel, usedEvents, currentStreak, state) {
  if (!allEvents?.length || !referenceEvent?.date) return null;

  const config = LEVEL_CONFIGS[userLevel];
  if (!config) return null;

  state.eventCount++;
  const localEventCount = state.eventCount;

  // ---- LOGIQUE DE SAUT TEMPOREL ----
  const { year: currentRefYear } = getCachedDateInfo(referenceEvent.date);
  const isFarFromPresent = currentRefYear < 1900;

  let forceReturnToPresent = false;
  if (userLevel <= 5 && isFarFromPresent) {
    const returnProbability = userLevel <= 2 ? 0.4 : 0.2;
    if (Math.random() < returnProbability) {
      forceReturnToPresent = true;
    }
  }

  const isForcedJumpTriggered = localEventCount === state.forcedJumpEventCount || forceReturnToPresent;

  if (isForcedJumpTriggered) {
    const { year: refYear } = getCachedDateInfo(referenceEvent.date);

    let jumpDistance, jumpForward;

    // Tunnel detection
    let tunnelThreshold = 2;
    if (userLevel > 15) tunnelThreshold = 4;
    else if (userLevel > 10) tunnelThreshold = 3;

    const isStuckInPast = userLevel <= 19 &&
      state.recentEras.length >= tunnelThreshold &&
      state.recentEras.slice(-tunnelThreshold).every(era =>
        era === HistoricalPeriod.ANTIQUITY || era === HistoricalPeriod.MIDDLE_AGES);

    const isStuckInModern = state.recentEras.length >= 3 &&
      state.recentEras.every(era =>
        era === HistoricalPeriod.NINETEENTH ||
        era === HistoricalPeriod.TWENTIETH ||
        era === HistoricalPeriod.TWENTYFIRST);

    if (forceReturnToPresent || isStuckInPast) {
      const targetYear = Math.floor(Math.random() * (2024 - 1800 + 1)) + 1800;
      jumpDistance = Math.abs(refYear - targetYear);
      jumpForward = true;
    } else if (isStuckInModern) {
      const targetYear = Math.floor(Math.random() * (1700 - (-500) + 1)) - 500;
      jumpDistance = Math.abs(refYear - targetYear);
      jumpForward = false;
    } else if (refYear > 1700) {
      const goToAncientTimes = Math.random() < 0.8;
      if (goToAncientTimes) {
        const antiquity = HistoricalPeriod.ANTIQUITY;
        const middleAges = HistoricalPeriod.MIDDLE_AGES;
        let targetEra;
        if (state.recentEras.includes(antiquity) && !state.recentEras.includes(middleAges)) {
          targetEra = middleAges;
        } else if (state.recentEras.includes(middleAges) && !state.recentEras.includes(antiquity)) {
          targetEra = antiquity;
        } else {
          targetEra = Math.random() < 0.5 ? antiquity : middleAges;
        }
        if (targetEra === antiquity) {
          const targetYear = Math.floor(Math.random() * 1000) - 500;
          jumpDistance = Math.abs(refYear - targetYear);
          jumpForward = false;
        } else {
          const targetYear = Math.floor(Math.random() * 1000) + 500;
          jumpDistance = Math.abs(refYear - targetYear);
          jumpForward = false;
        }
      } else {
        jumpDistance = Math.floor(Math.random() * 300) + 100;
        jumpForward = Math.random() > 0.5;
      }
    } else if (refYear > 1500) {
      if (Math.random() < 0.6) {
        const antiquity = HistoricalPeriod.ANTIQUITY;
        const middleAges = HistoricalPeriod.MIDDLE_AGES;
        let targetEra;
        if (state.recentEras.includes(antiquity)) targetEra = middleAges;
        else if (state.recentEras.includes(middleAges)) targetEra = antiquity;
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
      jumpDistance = Math.floor(Math.random() * 800) + 200;
      jumpForward = Math.random() > 0.5;
    } else if (refYear > 0) {
      jumpDistance = Math.floor(Math.random() * 600) + 300;
      jumpForward = Math.random() > 0.5;
    } else {
      jumpDistance = Math.floor(Math.random() * 1500) + 500;
      jumpForward = Math.random() > 0.7;
    }

    const targetYear = jumpForward ? refYear + jumpDistance : refYear - jumpDistance;

    const jumpCandidates = allEvents
      .filter(e => {
        if (usedEvents.has(e.id) || !e.date || e.id === referenceEvent.id) return false;
        const info = getCachedDateInfo(e.date);
        const refInfo = getCachedDateInfo(referenceEvent.date);
        if (info.timestamp === refInfo.timestamp) return false;
        if (info.year === refInfo.year) return false;
        return true;
      })
      .filter(e => {
        const { year: eventYear } = getCachedDateInfo(e.date);
        const notoriete = e.notoriete ?? 0;
        const adjustedNotoriety = getAdjustedNotoriety(notoriete, eventYear);

        if (userLevel <= 2 && adjustedNotoriety < TIER_THRESHOLDS.TIER_1_STAR) return false;
        if (userLevel <= 5 && adjustedNotoriety < TIER_THRESHOLDS.TIER_2_CLASSIC) return false;

        const adaptiveGap = getAdaptiveTimeGap(refYear, config.timeGap, userLevel);
        if (Math.abs(eventYear - refYear) < adaptiveGap.minimum) return false;

        const timeDiffFromTarget = Math.abs(eventYear - targetYear);
        if (jumpForward && eventYear <= refYear) return false;
        if (!jumpForward && eventYear >= refYear) return false;

        return timeDiffFromTarget <= jumpDistance * 1.5;
      })
      .slice(0, 50);

    if (jumpCandidates.length > 0) {
      const jumpEvent = jumpCandidates[Math.floor(Math.random() * jumpCandidates.length)];

      // Mettre à jour le prochain saut
      const nextIncrement = getNextForcedJumpIncrement();
      state.forcedJumpEventCount = localEventCount + nextIncrement;
      state.hasFirstForcedJumpHappened = true;

      return jumpEvent;
    }
    // Si pas de candidat pour le saut, on continue vers la sélection normale
  }

  // ---- PRÉ-FILTRAGE (réplique de preFilterEvents) ----
  const canAddMoreAntiques = (() => {
    const safeLevel = Math.max(1, Math.min(5, userLevel));
    const currentLimit = ANTIQUE_EVENTS_LIMITS[safeLevel] || 5;
    return state.antiqueEventsCount < currentLimit;
  })();

  let filtered = allEvents.filter(e => {
    if (usedEvents.has(e.id) || !e.date || e.id === referenceEvent.id) return false;
    const info = getCachedDateInfo(e.date);
    const refInfo = getCachedDateInfo(referenceEvent.date);
    if (info.timestamp === refInfo.timestamp) return false;
    if (info.year === refInfo.year) return false;
    return true;
  });

  // Tier probabiliste
  const probs = getTierProbabilities(userLevel);
  const rand = Math.random();
  let targetTier = 3;
  if (rand < probs.t1) targetTier = 1;
  else if (rand < probs.t1 + probs.t2) targetTier = 2;

  const afterTier = filtered.filter(e => {
    const rawNotoriety = e.notoriete ?? 0;
    const { year } = getCachedDateInfo(e.date);
    const adjustedNotoriety = getAdjustedNotoriety(rawNotoriety, year);
    if (targetTier === 1) return adjustedNotoriety >= TIER_THRESHOLDS.TIER_1_STAR;
    if (targetTier === 2) return adjustedNotoriety >= TIER_THRESHOLDS.TIER_2_CLASSIC;
    return true;
  });
  filtered = afterTier;

  // Filtrage temporel préliminaire (FIX 1: fenêtre min 2500 ans)
  const timeGapBase = config.timeGap.base || 100;
  const preTimeLimit = Math.max(timeGapBase * 3, 2500);
  filtered = filtered.filter(e => {
    const timeDiff = getTimeDifference(e.date, referenceEvent.date);
    return timeDiff <= preTimeLimit;
  });

  // Filtrage antique
  if (!canAddMoreAntiques) {
    filtered = filtered.filter(e => getCachedDateInfo(e.date).year >= ANTIQUE_YEAR_THRESHOLD);
  }

  // Diversité d'époque
  const currentEra = state.recentEras.length > 0 ? state.recentEras[state.recentEras.length - 1] : null;
  if (userLevel <= 5 && state.consecutiveEraCount >= 2 && currentEra) {
    const afterDiversity = filtered.filter(e => getPeriod(e.date) !== currentEra);
    if (afterDiversity.length >= 10) {
      filtered = afterDiversity;
    }
  }

  // Sort par historique personnel puis fréquence, avec jitter
  filtered.sort((a, b) => {
    const personalA = state.personalHistory.get(a.id)?.times_seen ?? 0;
    const personalB = state.personalHistory.get(b.id)?.times_seen ?? 0;
    if (personalA !== personalB) return personalA - personalB;
    const jitter = Math.random() - 0.5;
    const freqA = a.frequency_score || 0;
    const freqB = b.frequency_score || 0;
    if (Math.abs(freqA - freqB) > 2) return freqA - freqB;
    return jitter;
  });

  // FIX 2: Pool équilibré par période historique
  const MIN_PERIOD_SHARE = 0.08;
  const allPeriods = [HistoricalPeriod.ANTIQUITY, HistoricalPeriod.MIDDLE_AGES, HistoricalPeriod.RENAISSANCE,
                      HistoricalPeriod.NINETEENTH, HistoricalPeriod.TWENTIETH, HistoricalPeriod.TWENTYFIRST];
  const periodBuckets = {};
  for (const evt of filtered) {
    const p = getPeriod(evt.date);
    if (!periodBuckets[p]) periodBuckets[p] = [];
    periodBuckets[p].push(evt);
  }
  const minPerPeriod = Math.max(5, Math.floor(MAX_EVENTS_TO_PROCESS * MIN_PERIOD_SHARE));
  const reserved = [];
  const reservedIds = new Set();
  for (const period of allPeriods) {
    const bucket = periodBuckets[period] || [];
    const toReserve = bucket.slice(0, minPerPeriod);
    for (const evt of toReserve) {
      reserved.push(evt);
      reservedIds.add(evt.id);
    }
  }
  const remainingFiltered = filtered.filter(e => !reservedIds.has(e.id));
  const fillCount = Math.max(0, MAX_EVENTS_TO_PROCESS - reserved.length);
  const limited = [...reserved, ...remainingFiltered.slice(0, fillCount)];

  // ---- Si pré-filtrage vide -> fallback ----
  let preFilteredEvents = limited;
  if (preFilteredEvents.length === 0) {
    preFilteredEvents = allEvents.filter(e => {
      if (usedEvents.has(e.id) || !e.date || e.id === referenceEvent.id) return false;
      const info = getCachedDateInfo(e.date);
      const refInfo = getCachedDateInfo(referenceEvent.date);
      if (info.timestamp === refInfo.timestamp) return false;
      if (info.year === refInfo.year) return false;
      return true;
    });

    if (preFilteredEvents.length === 0) {
      preFilteredEvents = allEvents.filter(e => {
        if (!e.date || e.id === referenceEvent.id) return false;
        const info = getCachedDateInfo(e.date);
        const refInfo = getCachedDateInfo(referenceEvent.date);
        if (info.timestamp === refInfo.timestamp) return false;
        if (info.year === refInfo.year) return false;
        return true;
      });
    }
    if (preFilteredEvents.length === 0) return null;
  }

  // ---- SCORING ----
  const { year: refYear } = getCachedDateInfo(referenceEvent.date);
  const proximityFactor = Math.max(0.2, Math.min(1, 1 - (2024 - refYear) / 2000));
  const timeGap = {
    base: (config.timeGap.base || 100) * proximityFactor,
    min: Math.max(10, (config.timeGap.minimum || 50) * proximityFactor),
    max: Math.max(200, (config.timeGap.base || 100) * 1.5 * proximityFactor)
  };

  // Notoriété min
  let minNotoriete = 0;
  if (state.shouldForceBonusEvent) {
    minNotoriete = 85;
  } else if (state.shouldForceEasyEvent) {
    minNotoriete = Math.max(70, 30 + 25);
  } else {
    if (userLevel <= 1) minNotoriete = 45;
    else if (userLevel === 2) minNotoriete = 50;
    else if (userLevel === 3) minNotoriete = 55;
    else if (userLevel <= 5) minNotoriete = 40;
  }

  let notorieteConstrainedPool = preFilteredEvents;
  if (minNotoriete > 0) {
    const filteredByNotoriete = preFilteredEvents.filter(evt => (evt.notoriete ?? 0) >= minNotoriete);
    notorieteConstrainedPool = filteredByNotoriete.length >= 25 ? filteredByNotoriete : preFilteredEvents;
  }

  // Diversité d'époque
  const prevEpoch = referenceEvent.epoque;
  const diversityFilteredPool = notorieteConstrainedPool.filter(evt => {
    const epoch = evt.epoque;
    return !(prevEpoch != null && epoch != null && epoch === prevEpoch);
  });

  const scoringPool = diversityFilteredPool.slice(0, MAX_SCORING_POOL);

  // Score chaque événement
  const scoredEvents = scoringPool
    .map(evt => {
      const score = scoreEvent(evt, referenceEvent, userLevel, timeGap, state.personalHistory);
      const timeDiff = getTimeDifference(evt.date, referenceEvent.date);
      return { event: evt, score, timeDiff };
    })
    .filter(({ score, timeDiff }) =>
      isFinite(score) && score > 0 && timeDiff >= timeGap.min && timeDiff <= timeGap.max
    )
    .sort((a, b) => b.score - a.score);

  // FIX 3: Chemin diversité parallèle (pas de filtre timeGap, période != ref)
  const refPeriod = getPeriod(referenceEvent.date);
  const diversityEvents = scoringPool
    .map(evt => ({
      event: evt,
      score: scoreEvent(evt, referenceEvent, userLevel, timeGap, state.personalHistory),
      timeDiff: getTimeDifference(evt.date, referenceEvent.date)
    }))
    .filter(({ event, score }) =>
      isFinite(score) && score > 0 && getPeriod(event.date) !== refPeriod
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  let finalEvents = scoredEvents;

  // Fallbacks (répliqués fidèlement)
  if (finalEvents.length === 0) {
    finalEvents = scoringPool
      .map(evt => ({ event: evt, score: scoreEvent(evt, referenceEvent, userLevel, timeGap, state.personalHistory), timeDiff: getTimeDifference(evt.date, referenceEvent.date) }))
      .filter(({ score, timeDiff }) => isFinite(score) && score > 0 && timeDiff >= timeGap.min * 0.7 && timeDiff <= timeGap.max * 1.5)
      .sort((a, b) => b.score - a.score);
  }

  if (finalEvents.length === 0) {
    finalEvents = scoringPool
      .map(evt => ({ event: evt, score: scoreEvent(evt, referenceEvent, userLevel, timeGap, state.personalHistory), timeDiff: getTimeDifference(evt.date, referenceEvent.date) }))
      .filter(({ score, timeDiff }) => isFinite(score) && score > 0 && timeDiff >= timeGap.min * 0.4 && timeDiff <= timeGap.max * 2.5)
      .sort((a, b) => b.score - a.score);
  }

  if (finalEvents.length === 0) {
    finalEvents = scoringPool
      .map(evt => ({ event: evt, score: scoreEvent(evt, referenceEvent, userLevel, timeGap, state.personalHistory), timeDiff: getTimeDifference(evt.date, referenceEvent.date) }))
      .filter(({ score, timeDiff }) => isFinite(score) && score > 0 && timeDiff >= timeGap.min * 0.2 && timeDiff <= timeGap.max * 5)
      .sort((a, b) => b.score - a.score);
  }

  if (finalEvents.length === 0) {
    finalEvents = scoringPool
      .map(evt => ({ event: evt, score: scoreEvent(evt, referenceEvent, userLevel, timeGap, state.personalHistory), timeDiff: getTimeDifference(evt.date, referenceEvent.date) }))
      .filter(({ score }) => isFinite(score) && score > 0)
      .sort((a, b) => b.score - a.score);
  }

  if (finalEvents.length === 0) {
    const allUnused = allEvents.filter(e => {
      if (usedEvents.has(e.id) || !e.date || e.id === referenceEvent.id) return false;
      const info = getCachedDateInfo(e.date);
      const refInfo = getCachedDateInfo(referenceEvent.date);
      if (info.timestamp === refInfo.timestamp) return false;
      if (info.year === refInfo.year) return false;
      return true;
    });
    finalEvents = allUnused.slice(0, 50).map(evt => ({
      event: evt, score: Math.random() * 100, timeDiff: getTimeDifference(evt.date, referenceEvent.date)
    }));
  }

  if (finalEvents.length === 0) {
    // Reset 50% des usedEvents
    const usedArray = Array.from(usedEvents);
    const toReset = usedArray.slice(0, Math.floor(usedArray.length * 0.5));
    toReset.forEach(id => usedEvents.delete(id));

    const resetEvents = allEvents.filter(e => {
      if (usedEvents.has(e.id) || !e.date || e.id === referenceEvent.id) return false;
      const info = getCachedDateInfo(e.date);
      const refInfo = getCachedDateInfo(referenceEvent.date);
      if (info.timestamp === refInfo.timestamp) return false;
      if (info.year === refInfo.year) return false;
      return true;
    });
    finalEvents = resetEvents.slice(0, 50).map(evt => ({
      event: evt, score: Math.random() * 100, timeDiff: getTimeDifference(evt.date, referenceEvent.date)
    }));
  }

  if (finalEvents.length === 0) {
    // Dernière tentative
    const desperate = allEvents.filter(e => {
      if (!e.date || e.id === referenceEvent.id) return false;
      const info = getCachedDateInfo(e.date);
      const refInfo = getCachedDateInfo(referenceEvent.date);
      if (info.timestamp === refInfo.timestamp) return false;
      if (info.year === refInfo.year) return false;
      return true;
    }).slice(0, 10);
    if (desperate.length > 0) {
      finalEvents = [{ event: desperate[0], score: 1, timeDiff: 0 }];
    } else {
      return null;
    }
  }

  // Sélection finale : mélange chemin normal + chemin diversité
  const normalTop = finalEvents.slice(0, Math.min(4, finalEvents.length));
  const normalIds = new Set(normalTop.map(x => x.event.id));
  const diversityCandidates = diversityEvents.filter(x => !normalIds.has(x.event.id));
  const diversityPicks = diversityCandidates.slice(0, Math.min(2, diversityCandidates.length));
  const topEvents = [...normalTop, ...diversityPicks];
  const pickedIndex = Math.floor(Math.random() * topEvents.length);
  const selected = topEvents[pickedIndex].event;

  // Mettre à jour le prochain saut si c'est nécessaire
  if (isForcedJumpTriggered) {
    const nextIncrement = getNextForcedJumpIncrement();
    state.forcedJumpEventCount = localEventCount + nextIncrement;
  }

  return selected;
}

// ============================================================
// FONCTION DE SCORING (réplique de scoreEventOptimized)
// ============================================================
function scoreEvent(evt, referenceEvent, userLevel, timeGap, personalHistory) {
  const timeDiff = getTimeDifference(evt.date, referenceEvent.date);
  if (!isFinite(timeDiff)) return -Infinity;

  const weights = getWeightsForLevel(userLevel);
  const randomFactor = 0.9 + Math.random() * 0.2;

  const refYear = getCachedDateInfo(referenceEvent.date).year;
  const configTimeGap = LEVEL_CONFIGS[userLevel]?.timeGap || { base: 100, variance: 50, minimum: 50 };
  const adaptiveGap = getAdaptiveTimeGap(refYear, configTimeGap, userLevel);
  const idealGap = adaptiveGap.base;

  // Score de proximité temporelle
  let gapScore = 0;
  if (idealGap > 0 && isFinite(timeDiff)) {
    const diffRatio = Math.abs(timeDiff - idealGap) / idealGap;
    const baseGapScore = 35 * Math.max(0, 1 - diffRatio) * randomFactor;
    gapScore = baseGapScore * weights.alphaProximity;
  }

  // Notoriété
  const notorieteValue = Math.max(0, Math.min(100, Number(evt.notoriete ?? 60)));
  const notorieteNormalized = notorieteValue / 100;
  const { target, tolerance } = notorieteProfileForLevel(userLevel);
  const notorieteDistance = Math.abs(notorieteNormalized - target);
  const notorieteFactor = Math.max(0, 1 - (notorieteDistance / Math.max(tolerance, 0.01)));
  const notorieteScore = notorieteFactor * weights.gammaNotoriete * 30;

  // Fréquence
  const frequencyScore = Math.max(0, Number(evt.frequency_score) || 0);
  const frequencyMalus = Math.min(weights.thetaFrequencyCap, frequencyScore * weights.thetaFrequencyMalus);

  // Pénalité personnelle
  let personalPenaltyMultiplier = 1.0;
  const historyItem = personalHistory.get(evt.id);
  if (historyItem) {
    personalPenaltyMultiplier = 1 / (1 + Math.pow(historyItem.times_seen, 1.5));
  }

  // Récence (pas simulé en détail, on skip car pas de last_used fiable en simulation)
  let recencyPenalty = 0;

  // Jitter
  const variationBonus = Math.random() * 12;

  // Scoring sémantique
  let contextScore = 0;
  const candYear = getCachedDateInfo(evt.date).year;
  const refKeyPeriod = KEY_PERIODS.find(p => refYear >= p.start && refYear <= p.end);
  const candKeyPeriod = KEY_PERIODS.find(p => candYear >= p.start && candYear <= p.end);

  if (refKeyPeriod) {
    const isSamePeriod = candKeyPeriod?.id === refKeyPeriod.id;
    const isTrapPeriod = refKeyPeriod.traps.includes(candKeyPeriod?.id || '');

    if (userLevel <= 4) {
      if (isSamePeriod) contextScore = -500;
      else if (isTrapPeriod) contextScore = -300;
      else contextScore = 50;
    } else if (userLevel >= 5) {
      if (isSamePeriod) contextScore = 150;
      else if (isTrapPeriod) contextScore = 100;
    }
  }

  const totalScore = Math.max(0, (gapScore + notorieteScore + variationBonus + contextScore - frequencyMalus - recencyPenalty) * personalPenaltyMultiplier);
  return totalScore;
}

// ============================================================
// MAIN: Charger les événements et lancer les simulations
// ============================================================
async function main() {
  const args = process.argv.slice(2);
  const gamesPerLevel = parseInt(args.find((_, i, a) => a[i - 1] === '--games') || '500');
  const levelsArg = args.find((_, i, a) => a[i - 1] === '--levels');
  const verbose = args.includes('--verbose');
  const targetLevels = levelsArg
    ? levelsArg.split(',').map(Number)
    : [1, 3, 5, 7, 10, 15, 20];

  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║     SIMULATEUR DE COUVERTURE DU CATALOGUE D\'ÉVÉNEMENTS          ║');
  console.log('║     Réplication fidèle de useEventSelector.ts                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log();

  // 1. Charger les événements de production
  console.log('📡 Chargement des événements depuis Supabase production...');

  // Supabase limite à 1000 lignes par défaut. On pagine pour tout récupérer.
  let allEventsRaw = [];
  let page = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data, error: pageError } = await supabase
      .from('evenements')
      .select('id, titre, date, date_formatee, types_evenement, illustration_url, frequency_score, notoriete, description_detaillee, last_used, pays, epoque')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (pageError) {
      console.error('❌ Erreur Supabase:', pageError.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    allEventsRaw.push(...data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }
  const events = allEventsRaw;
  const error = null;

  if (error) {
    console.error('❌ Erreur Supabase:', error.message);
    process.exit(1);
  }

  const validEvents = events.filter(e =>
    !!e.id && !!e.date && !!e.titre && Array.isArray(e.types_evenement)
  );

  console.log(`✅ ${events.length} événements chargés, ${validEvents.length} valides`);
  console.log();

  // Analyse initiale de la distribution
  const periodDist = {};
  const notorietyDist = { tier1: 0, tier2: 0, tier3: 0 };
  validEvents.forEach(e => {
    const period = getPeriod(e.date);
    periodDist[period] = (periodDist[period] || 0) + 1;
    const notoriete = e.notoriete ?? 0;
    const year = getCachedDateInfo(e.date).year;
    const adjusted = getAdjustedNotoriety(notoriete, year);
    if (adjusted >= 75) notorietyDist.tier1++;
    else if (adjusted >= 50) notorietyDist.tier2++;
    else notorietyDist.tier3++;
  });

  console.log('📊 Distribution par période:');
  Object.entries(periodDist).sort().forEach(([period, count]) => {
    const pct = ((count / validEvents.length) * 100).toFixed(1);
    console.log(`   ${period.padEnd(15)} : ${count} événements (${pct}%)`);
  });
  console.log();

  console.log('📊 Distribution par Tier de notoriété (ajustée):');
  console.log(`   TIER 1 (Stars ≥75)  : ${notorietyDist.tier1} (${((notorietyDist.tier1 / validEvents.length) * 100).toFixed(1)}%)`);
  console.log(`   TIER 2 (Classic ≥50): ${notorietyDist.tier2} (${((notorietyDist.tier2 / validEvents.length) * 100).toFixed(1)}%)`);
  console.log(`   TIER 3 (Expert <50) : ${notorietyDist.tier3} (${((notorietyDist.tier3 / validEvents.length) * 100).toFixed(1)}%)`);
  console.log();

  // 2. Simulations
  console.log(`🎮 Lancement de ${gamesPerLevel} parties par scénario de niveau...`);
  console.log('━'.repeat(70));

  const globalSeenEvents = new Set();
  const results = [];

  for (const maxLevel of targetLevels) {
    const levelSeenEvents = new Set();
    const levelPeriodUsage = {};
    const eventFrequency = new Map(); // Combien de fois chaque événement est sélectionné
    let totalEventsPerGame = [];

    const startTime = Date.now();

    for (let game = 0; game < gamesPerLevel; game++) {
      const personalHistory = new Map();
      const gameUsed = simulateGame(validEvents, maxLevel, personalHistory);

      totalEventsPerGame.push(gameUsed.size);

      gameUsed.forEach(id => {
        levelSeenEvents.add(id);
        globalSeenEvents.add(id);
        eventFrequency.set(id, (eventFrequency.get(id) || 0) + 1);
      });

      // Track period usage per game
      gameUsed.forEach(id => {
        const evt = validEvents.find(e => e.id === id);
        if (evt) {
          const period = getPeriod(evt.date);
          levelPeriodUsage[period] = (levelPeriodUsage[period] || 0) + 1;
        }
      });
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const avgEventsPerGame = (totalEventsPerGame.reduce((a, b) => a + b, 0) / totalEventsPerGame.length).toFixed(1);
    const coverage = ((levelSeenEvents.size / validEvents.length) * 100).toFixed(1);

    // Analyser la distribution de fréquence
    const freqValues = Array.from(eventFrequency.values());
    const maxFreq = Math.max(...freqValues);
    const avgFreq = (freqValues.reduce((a, b) => a + b, 0) / freqValues.length).toFixed(1);
    const medianFreq = freqValues.sort((a, b) => a - b)[Math.floor(freqValues.length / 2)];

    // Événements vus 1 seule fois
    const seenOnce = freqValues.filter(f => f === 1).length;
    const seenOncePercent = ((seenOnce / levelSeenEvents.size) * 100).toFixed(1);

    console.log();
    console.log(`🎯 Niveau max atteint: ${maxLevel} | ${gamesPerLevel} parties simulées (${elapsed}s)`);
    console.log(`   ├─ Événements par partie:    ~${avgEventsPerGame} (total nécessaire: ${computeTotalEventsNeeded(maxLevel)})`);
    console.log(`   ├─ Événements uniques vus:   ${levelSeenEvents.size} / ${validEvents.length}`);
    console.log(`   ├─ 📈 COUVERTURE:            ${coverage}%`);
    console.log(`   ├─ Fréquence sélection:      moy=${avgFreq}, médiane=${medianFreq}, max=${maxFreq}`);
    console.log(`   ├─ Vus 1 seule fois:         ${seenOnce} (${seenOncePercent}% des vus)`);
    console.log(`   └─ Répartition par période:`);

    const totalPeriodUsage = Object.values(levelPeriodUsage).reduce((a, b) => a + b, 0);
    Object.entries(levelPeriodUsage).sort().forEach(([period, count]) => {
      const pct = ((count / totalPeriodUsage) * 100).toFixed(1);
      console.log(`       ${period.padEnd(15)} : ${pct}%`);
    });

    results.push({
      maxLevel,
      coverage: parseFloat(coverage),
      uniqueSeen: levelSeenEvents.size,
      avgEventsPerGame: parseFloat(avgEventsPerGame),
      seenOnce,
      avgFreq: parseFloat(avgFreq)
    });
  }

  // 3. Résumé global
  console.log();
  console.log('━'.repeat(70));
  console.log('📊 RÉSUMÉ GLOBAL');
  console.log('━'.repeat(70));
  console.log(`   Total événements en base:     ${validEvents.length}`);
  console.log(`   Total événements vus (global): ${globalSeenEvents.size} / ${validEvents.length}`);
  console.log(`   📈 COUVERTURE GLOBALE:         ${((globalSeenEvents.size / validEvents.length) * 100).toFixed(1)}%`);
  console.log();

  // Événements JAMAIS vus
  const neverSeen = validEvents.filter(e => !globalSeenEvents.has(e.id));
  console.log(`   ⚠️  Événements JAMAIS sélectionnés: ${neverSeen.length}`);
  if (neverSeen.length > 0 && neverSeen.length <= 50) {
    console.log('   Détail des événements jamais vus:');
    neverSeen.forEach(e => {
      const year = getCachedDateInfo(e.date).year;
      console.log(`     - [${year}] ${e.titre} (notoriété: ${e.notoriete ?? '?'}, période: ${getPeriod(e.date)})`);
    });
  } else if (neverSeen.length > 50) {
    // Analyser par période
    const neverSeenByPeriod = {};
    const neverSeenByNotoriety = { high: 0, medium: 0, low: 0 };
    neverSeen.forEach(e => {
      const period = getPeriod(e.date);
      neverSeenByPeriod[period] = (neverSeenByPeriod[period] || 0) + 1;
      const n = e.notoriete ?? 0;
      if (n >= 75) neverSeenByNotoriety.high++;
      else if (n >= 50) neverSeenByNotoriety.medium++;
      else neverSeenByNotoriety.low++;
    });
    console.log('   Par période:');
    Object.entries(neverSeenByPeriod).sort().forEach(([p, c]) => {
      console.log(`     ${p.padEnd(15)}: ${c}`);
    });
    console.log('   Par notoriété:');
    console.log(`     Haute (≥75): ${neverSeenByNotoriety.high}, Moyenne (50-74): ${neverSeenByNotoriety.medium}, Basse (<50): ${neverSeenByNotoriety.low}`);
  }

  // Tableau récapitulatif
  console.log();
  console.log('┌─────────┬───────────┬──────────────┬───────────────┬──────────┐');
  console.log('│ Niveau  │ Couv. (%) │ Uniques vus  │ Evts/partie   │ Fréq moy │');
  console.log('├─────────┼───────────┼──────────────┼───────────────┼──────────┤');
  for (const r of results) {
    console.log(`│ ${String(r.maxLevel).padStart(4)}    │ ${String(r.coverage.toFixed(1)).padStart(7)}%  │ ${String(r.uniqueSeen).padStart(7)} / ${validEvents.length} │ ${String(r.avgEventsPerGame.toFixed(1)).padStart(9)}     │ ${String(r.avgFreq.toFixed(1)).padStart(6)}   │`);
  }
  console.log('└─────────┴───────────┴──────────────┴───────────────┴──────────┘');
  console.log();
  console.log(`✅ Simulation terminée. ${gamesPerLevel} parties × ${targetLevels.length} scénarios = ${gamesPerLevel * targetLevels.length} parties simulées.`);
}

function computeTotalEventsNeeded(maxLevel) {
  let total = 0;
  for (let l = 1; l <= maxLevel; l++) {
    const config = LEVEL_CONFIGS[l];
    if (config) total += config.eventsNeeded;
  }
  return total;
}

main().catch(err => {
  console.error('❌ Erreur fatale:', err);
  process.exit(1);
});
