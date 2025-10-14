import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase/supabaseClients';
import { FirebaseAnalytics } from '../../lib/firebase';
import { Event } from '../types';
import { usePrecisionAds } from './usePrecisionAds';
import { applyEndOfRunEconomy } from '../../lib/economy/apply';

// Générateur d'UUID compatible React Native
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const MAX_HP = 1000;
const LEVEL_UP_BONUS_HP = 150;
const MAX_TIME_SECONDS = 20;

interface PrecisionLevel {
  id: number;
  label: string;
  minScore: number;
  nextThreshold: number | null;
  minDifficulty: number;
  maxDifficulty: number;
  minNotoriete: number;
}

const PRECISION_LEVELS: PrecisionLevel[] = [
  {
    id: 1,
    label: 'Novice',
    minScore: 0,
    nextThreshold: 1000,
    minDifficulty: 1,
    maxDifficulty: 2,
    minNotoriete: 70,
  },
  {
    id: 2,
    label: 'Initié',
    minScore: 1000,
    nextThreshold: 2500,
    minDifficulty: 1,
    maxDifficulty: 3,
    minNotoriete: 45,
  },
  {
    id: 3,
    label: 'Historien',
    minScore: 2500,
    nextThreshold: 5000,
    minDifficulty: 2,
    maxDifficulty: 5,
    minNotoriete: 25,
  },
  {
    id: 4,
    label: 'Expert',
    minScore: 5000,
    nextThreshold: null,
    minDifficulty: 2,
    maxDifficulty: 7,
    minNotoriete: 0,
  },
];

export interface PrecisionResult {
  event: Event;
  guessYear: number;
  actualYear: number;
  difference: number;
  absDifference: number;
  hpLoss: number;
  scoreGain: number;
  scoreAfter: number;
  hpAfter: number;
  levelBefore: number;
  levelAfter: number;
  leveledUp: boolean;
  timedOut?: boolean;
}

function extractYear(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const match = dateStr.match(/-?\d{1,4}/);
  if (!match) return null;
  const parsed = parseInt(match[0], 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Calcule le score et la perte de HP en tenant compte de :
 * - L'écart absolu entre la réponse et la date réelle
 * - L'ancienneté de l'événement (événements anciens = tolérance plus grande)
 * - La notoriété de l'événement (événements peu connus = tolérance plus grande)
 */
function calculateScoreAndHP(params: {
  absDifference: number;
  actualYear: number;
  notoriete: number | null | undefined;
}) {
  const { absDifference, actualYear, notoriete } = params;

  // 1. Facteur d'ancienneté : plus l'événement est ancien, plus on est tolérant
  // Référence : 2000 (événements récents)
  const yearDiff = Math.abs(2000 - actualYear);

  // Tolérance de base : 0-50 ans = 1.0x, puis augmentation progressive
  // 0-50 ans du présent : 1.0x
  // 100 ans : 1.15x
  // 500 ans : 1.5x
  // 1000 ans : 2.0x
  // 2000+ ans : 2.5x
  let ageFactor = 1.0;
  if (yearDiff > 2000) {
    ageFactor = 2.5;
  } else if (yearDiff > 1000) {
    ageFactor = 1.5 + ((yearDiff - 1000) / 1000) * 1.0;
  } else if (yearDiff > 500) {
    ageFactor = 1.3 + ((yearDiff - 500) / 500) * 0.2;
  } else if (yearDiff > 100) {
    ageFactor = 1.1 + ((yearDiff - 100) / 400) * 0.2;
  } else if (yearDiff > 50) {
    ageFactor = 1.0 + ((yearDiff - 50) / 50) * 0.1;
  }

  // 2. Facteur de notoriété : événements peu connus = tolérance plus grande
  // notoriete 0-30 : 1.5x
  // notoriete 30-50 : 1.3x
  // notoriete 50-70 : 1.15x
  // notoriete 70-100 : 1.0x
  const actualNotoriete = notoriete ?? 50;
  let notorietyFactor = 1.0;
  if (actualNotoriete < 30) {
    notorietyFactor = 1.5;
  } else if (actualNotoriete < 50) {
    notorietyFactor = 1.3;
  } else if (actualNotoriete < 70) {
    notorietyFactor = 1.15;
  }

  // 3. Facteur combiné (on prend le max des deux pour être plus généreux)
  const toleranceFactor = Math.max(ageFactor, notorietyFactor);

  // 4. Calcul de l'écart ajusté (l'écart "ressenti" après application de la tolérance)
  const adjustedDifference = absDifference / toleranceFactor;

  // 5. Calcul de la perte de HP basée sur l'écart ajusté
  // Formule moins punitive : cap à 400 HP au lieu de 500
  // Progression : 1 an = 1.5 HP au lieu de 2 HP
  const baseHpLoss = Math.floor(adjustedDifference * 1.5);
  const hpLoss = Math.min(400, baseHpLoss);

  // 6. Calcul du score avec doublement des gains
  // Ancienne formule doublée et plus généreuse
  let scoreGain = 0;

  if (adjustedDifference === 0) {
    // Réponse parfaite : gros bonus (doublé de 400 à 800)
    scoreGain = 800;
  } else if (adjustedDifference <= 1) {
    // Très proche : 600-799
    scoreGain = 600 + Math.floor((1 - adjustedDifference) * 199);
  } else if (adjustedDifference <= 5) {
    // Excellent : 400-599
    scoreGain = 400 + Math.floor((5 - adjustedDifference) / 4 * 199);
  } else if (adjustedDifference <= 10) {
    // Très bon : 300-399
    scoreGain = 300 + Math.floor((10 - adjustedDifference) / 5 * 99);
  } else if (adjustedDifference <= 25) {
    // Bon : 200-299
    scoreGain = 200 + Math.floor((25 - adjustedDifference) / 15 * 99);
  } else if (adjustedDifference <= 50) {
    // Correct : 120-199
    scoreGain = 120 + Math.floor((50 - adjustedDifference) / 25 * 79);
  } else if (adjustedDifference <= 100) {
    // Moyen : 60-119
    scoreGain = 60 + Math.floor((100 - adjustedDifference) / 50 * 59);
  } else if (adjustedDifference <= 175) {
    // Faible : 30-59
    scoreGain = 30 + Math.floor((175 - adjustedDifference) / 75 * 29);
  } else if (adjustedDifference <= 250) {
    // Très faible : 15-29
    scoreGain = 15 + Math.floor((250 - adjustedDifference) / 75 * 14);
  } else if (adjustedDifference <= 400) {
    // Minimal : 5-14
    scoreGain = 5 + Math.floor((400 - adjustedDifference) / 150 * 9);
  } else if (adjustedDifference <= 600) {
    // Quasi-nul : 1-4
    scoreGain = 1 + Math.floor((600 - adjustedDifference) / 200 * 3);
  } else {
    // Au-delà de 600 ans d'écart ajusté : 0 point
    scoreGain = 0;
  }

  return { hpLoss, scoreGain, toleranceFactor, adjustedDifference };
}

function getLevelForScore(score: number): PrecisionLevel {
  for (let i = PRECISION_LEVELS.length - 1; i >= 0; i -= 1) {
    const level = PRECISION_LEVELS[i];
    if (score >= level.minScore) {
      return level;
    }
  }
  return PRECISION_LEVELS[0];
}

function filterEventsForLevel(events: Event[], level: PrecisionLevel) {
  return events.filter((event) => {
    const difficulty = event.niveau_difficulte ?? 4;
    const notoriete = event.notoriete ?? 50;
    const hasYear = extractYear(event.date) !== null;
    if (!hasYear) return false;
    if (difficulty < level.minDifficulty) return false;
    if (difficulty > level.maxDifficulty) return false;
    if (notoriete < level.minNotoriete) return false;
    return true;
  });
}

export function usePrecisionGame() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [score, setScore] = useState(0);
  const [hp, setHp] = useState(MAX_HP);
  const [level, setLevel] = useState<PrecisionLevel>(PRECISION_LEVELS[0]);
  const [lastResult, setLastResult] = useState<PrecisionResult | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [timeLeft, setTimeLeft] = useState(MAX_TIME_SECONDS);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [personalBest, setPersonalBest] = useState(0);
  const [playerName, setPlayerName] = useState('Joueur');
  const [leaderboards, setLeaderboards] = useState<{
    daily: Array<{ name: string; score: number; rank: number }>;
    monthly: Array<{ name: string; score: number; rank: number }>;
    allTime: Array<{ name: string; score: number; rank: number }>;
  }>({ daily: [], monthly: [], allTime: [] });
  const [leaderboardsReady, setLeaderboardsReady] = useState(false);
  const [showContinueOffer, setShowContinueOffer] = useState(false);

  const usedIdsRef = useRef<Set<string>>(new Set());
  const initializingRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Hook pour les pubs du mode Précision
  const { adState, showGameOverAd, showContinueAd, resetContinueReward, resetAdsState, forceContinueAdLoad } = usePrecisionAds();

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const loadPlayerProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPlayerName('Invité');
        setPersonalBest(0);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, high_score_precision')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setPlayerName(profile.display_name || 'Joueur');
        setPersonalBest(profile.high_score_precision || 0);
      }
    } catch (err) {
      console.error('[usePrecisionGame] Error loading profile:', err);
    }
  }, []);

  const loadLeaderboards = useCallback(async (finalScore: number, answeredCount: number = 0) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const currentDisplayName = playerName || 'Joueur';

      console.log('[usePrecisionGame] Loading leaderboards, user:', user?.id, 'displayName:', currentDisplayName);

      if (user) {
        // Insert current score in precision_scores (legacy table)
        const { error: insertError } = await supabase.from('precision_scores').insert({
          user_id: user.id,
          display_name: currentDisplayName,
          score: finalScore,
        });

        if (insertError) {
          console.error('[usePrecisionGame] Error inserting score in precision_scores:', insertError);
        } else {
          console.log('[usePrecisionGame] Score inserted successfully in precision_scores:', finalScore);
        }

        // Insert current score in game_scores with mode 'precision' for unified leaderboards
        const { error: gameScoresError } = await supabase.from('game_scores').insert({
          user_id: user.id,
          display_name: currentDisplayName,
          score: finalScore,
          mode: 'precision',
        });

        if (gameScoresError) {
          console.error('[usePrecisionGame] Error inserting score in game_scores:', gameScoresError);
        } else {
          console.log('[usePrecisionGame] Score inserted successfully in game_scores with mode precision:', finalScore);
        }

        // High score mis à jour automatiquement par le trigger DB
        // (voir scripts/APPLY_THIS_IN_SUPABASE_SQL_EDITOR.sql)
        if (finalScore > personalBest) {
          setPersonalBest(finalScore);
        }

        // Apply economy (XP, quests, etc.)
        try {
          const runId = generateUUID();
          await applyEndOfRunEconomy({
            runId,
            userId: user.id,
            mode: 'precision',
            points: finalScore,
            gameStats: {
              totalAnswers: answeredCount,
              correctAnswers: answeredCount,
            },
          });
          console.log('[usePrecisionGame] Economy applied successfully');
        } catch (economyError) {
          console.error('[usePrecisionGame] Error applying economy:', economyError);
        }
      }

      // Fetch leaderboards
      const today = new Date().toISOString().split('T')[0];
      const firstDayOfMonth = `${today.substring(0, 7)}-01`;

      const [dailyRes, monthlyRes, allTimeRes] = await Promise.all([
        supabase
          .from('precision_scores')
          .select('display_name, score')
          .gte('created_at', `${today}T00:00:00.000Z`)
          .order('score', { ascending: false })
          .limit(5),
        supabase
          .from('precision_scores')
          .select('display_name, score')
          .gte('created_at', `${firstDayOfMonth}T00:00:00.000Z`)
          .order('score', { ascending: false })
          .limit(5),
        supabase
          .from('profiles')
          .select('display_name, high_score_precision')
          .not('high_score_precision', 'is', null)
          .order('high_score_precision', { ascending: false })
          .limit(5),
      ]);

      console.log('[usePrecisionGame] Daily scores:', dailyRes.data, 'error:', dailyRes.error);
      console.log('[usePrecisionGame] Monthly scores:', monthlyRes.data, 'error:', monthlyRes.error);
      console.log('[usePrecisionGame] All-time scores:', allTimeRes.data, 'error:', allTimeRes.error);

      const formatScores = (scores: any[], scoreField: string = 'score') =>
        (scores || []).map((s, index) => ({
          name: s.display_name?.trim() || 'Joueur Anonyme',
          score: Number(s[scoreField]) || 0,
          rank: index + 1,
        }));

      setLeaderboards({
        daily: formatScores(dailyRes.data || [], 'score'),
        monthly: formatScores(monthlyRes.data || [], 'score'),
        allTime: formatScores(allTimeRes.data || [], 'high_score_precision'),
      });
      setLeaderboardsReady(true);
    } catch (err) {
      console.error('[usePrecisionGame] Error loading leaderboards:', err);
      setLeaderboards({ daily: [], monthly: [], allTime: [] });
      setLeaderboardsReady(true);
    }
  }, [personalBest, playerName]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('evenements')
        .select('id, titre, date, date_formatee, types_evenement, illustration_url, notoriete, description_detaillee, niveau_difficulte')
        .order('notoriete', { ascending: false });

      if (supabaseError) {
        throw supabaseError;
      }

      const validEvents = (data ?? [])
        .filter((event) => !!event && !!event.id && !!event.titre && !!event.date)
        .map((event) => ({
          ...event,
          illustration_url: event.illustration_url ?? '',
          types_evenement: Array.isArray(event.types_evenement) ? event.types_evenement : [],
          notoriete: typeof event.notoriete === 'number' ? event.notoriete : null,
          niveau_difficulte: typeof event.niveau_difficulte === 'number' ? event.niveau_difficulte : 4,
        }));

      setEvents(validEvents as Event[]);
    } catch (err) {
      setError('Impossible de charger les événements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
    loadPlayerProfile();
  }, [loadEvents, loadPlayerProfile]);

  const pickEventForLevel = useCallback(
    (targetLevel: PrecisionLevel): Event | null => {
      if (events.length === 0) {
        return null;
      }

      const used = usedIdsRef.current;
      const pool = filterEventsForLevel(events, targetLevel);
      let candidates = pool.filter((event) => !used.has(event.id));

      if (candidates.length === 0) {
        if (pool.length === 0) {
          candidates = events.filter((event) => extractYear(event.date) !== null);
        } else {
          used.clear();
          candidates = pool;
        }
      }

      if (candidates.length === 0) {
        return null;
      }

      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      used.add(picked.id);
      return picked;
    },
    [events],
  );

  const startRun = useCallback(() => {
    if (initializingRef.current) return;
    initializingRef.current = true;

    clearTimer();
    setScore(0);
    setHp(MAX_HP);
    setLevel(PRECISION_LEVELS[0]);
    setLastResult(null);
    setIsGameOver(false);
    setTotalAnswered(0);
    setTimeLeft(MAX_TIME_SECONDS);
    setIsTimerPaused(false);
    usedIdsRef.current = new Set();

    const nextEvent = pickEventForLevel(PRECISION_LEVELS[0]);
    setCurrentEvent(nextEvent);

    initializingRef.current = false;
  }, [clearTimer, pickEventForLevel]);

  useEffect(() => {
    if (!loading && events.length > 0 && !currentEvent && !initializingRef.current) {
      startRun();
    }
  }, [currentEvent, events.length, loading, startRun]);

  const scheduleTimer = useCallback(() => {
    clearTimer();
    setTimeLeft(MAX_TIME_SECONDS);
    setIsTimerPaused(false);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  const pauseTimer = useCallback(() => {
    setIsTimerPaused(true);
    clearTimer();
  }, [clearTimer]);

  const resumeTimer = useCallback(() => {
    if (isGameOver || lastResult || !currentEvent) return;
    if (!isTimerPaused) return;
    setIsTimerPaused(false);
    clearTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer, currentEvent, isGameOver, isTimerPaused, lastResult]);

  const finalizeResult = useCallback((
    params: Omit<PrecisionResult, 'scoreAfter' | 'hpAfter' | 'levelAfter' | 'leveledUp' | 'levelBefore' | 'scoreGain' | 'hpLoss'> & {
      hpLoss: number;
      scoreGain: number;
      leveledUp: boolean;
      levelBefore: number;
      levelAfter: number;
      scoreAfter: number;
      hpAfter: number;
      timedOut?: boolean;
    }
  ) => {
    clearTimer();
    setLastResult({
      event: params.event,
      guessYear: params.guessYear,
      actualYear: params.actualYear,
      difference: params.difference,
      absDifference: params.absDifference,
      hpLoss: params.hpLoss,
      scoreGain: params.scoreGain,
      leveledUp: params.leveledUp,
      levelBefore: params.levelBefore,
      levelAfter: params.levelAfter,
      scoreAfter: params.scoreAfter,
      hpAfter: params.hpAfter,
      timedOut: params.timedOut,
    });
  }, [clearTimer]);

  const submitGuess = useCallback(
    (guessYear: number) => {
      if (!currentEvent || Number.isNaN(guessYear) || isGameOver) {
        return;
      }

      const actualYear = extractYear(currentEvent.date);
      if (actualYear === null) {
        setError("Date invalide pour cet événement. Veuillez essayer un autre.");
        return;
      }

      const difference = guessYear - actualYear;
      const absDifference = Math.abs(difference);

      // Nouveau système de calcul tenant compte de l'ancienneté et de la notoriété
      const { hpLoss, scoreGain } = calculateScoreAndHP({
        absDifference,
        actualYear,
        notoriete: currentEvent.notoriete,
      });

      const scoreBefore = score;
      const hpBefore = hp;

      let nextHp = Math.max(0, hpBefore - hpLoss);

      // Bonus de 150 HP si la réponse est exacte (augmenté de 100 à 150)
      if (absDifference === 0) {
        nextHp = Math.min(MAX_HP, nextHp + 150);
      }

      let nextScore = scoreBefore + scoreGain;
      const previousLevel = level;
      const nextLevel = getLevelForScore(nextScore);
      let leveledUp = false;

      if (nextLevel.id !== previousLevel.id) {
        leveledUp = true;
        setLevel(nextLevel);
      }

      setScore(nextScore);
      setHp(nextHp);
      finalizeResult({
        event: currentEvent,
        guessYear,
        actualYear,
        difference,
        absDifference,
        hpLoss,
        scoreGain,
        scoreAfter: nextScore,
        hpAfter: nextHp,
        levelBefore: previousLevel.id,
        levelAfter: nextLevel.id,
        leveledUp,
      });

      setTotalAnswered((prev) => prev + 1);

      if (nextHp <= 0) {
        // Ne pas passer à isGameOver immédiatement, laisser le résultat s'afficher
        // L'écran game over sera déclenché quand le joueur clique sur "Continuer"
        setIsTimerPaused(true);
      } else {
        FirebaseAnalytics.logEvent('precision_guess', {
          event_id: currentEvent.id,
          level: previousLevel.id,
          abs_difference: absDifference,
          hp_loss: hpLoss,
          score_gain: scoreGain,
          leveled_up: leveledUp,
        });
      }
    },
    [currentEvent, finalizeResult, hp, isGameOver, level, score, totalAnswered, loadLeaderboards],
  );

  const handleTimeout = useCallback(() => {
    if (!currentEvent || isGameOver || lastResult) return;

    const actualYear = extractYear(currentEvent.date);
    if (actualYear === null) return;

    // Pénalité de timeout réduite de 350 à 250 HP
    const hpLoss = 250;
    const scoreGain = 0;

    const previousLevel = level;
    const nextLevel = getLevelForScore(score);
    const nextHp = Math.max(0, hp - hpLoss);
    const nextScore = score;

    setHp(nextHp);
    setScore(nextScore);
    finalizeResult({
      event: currentEvent,
      guessYear: actualYear,
      actualYear,
      difference: 0,
      absDifference: 0,
      hpLoss,
      scoreGain,
      scoreAfter: nextScore,
      hpAfter: nextHp,
      levelBefore: previousLevel.id,
      levelAfter: nextLevel.id,
      leveledUp: false,
      timedOut: true,
    });

    setTotalAnswered((prev) => prev + 1);

    if (nextHp <= 0) {
      // Ne pas passer à isGameOver immédiatement, laisser le résultat s'afficher
      // L'écran game over sera déclenché quand le joueur clique sur "Continuer"
      setIsTimerPaused(true);
    } else {
      FirebaseAnalytics.logEvent('precision_timeout', {
        event_id: currentEvent.id,
        level: previousLevel.id,
      });
    }
  }, [currentEvent, finalizeResult, hp, isGameOver, lastResult, level, score, totalAnswered, loadLeaderboards]);

  useEffect(() => {
    if (!currentEvent || isGameOver) {
      clearTimer();
      return;
    }

    if (!lastResult && !isTimerPaused) {
      scheduleTimer();
    } else {
      clearTimer();
    }

    return () => {
      clearTimer();
    };
  }, [currentEvent?.id, lastResult, isGameOver, isTimerPaused, scheduleTimer, clearTimer]);

  useEffect(() => {
    if (timeLeft === 0 && !lastResult && !isGameOver) {
      handleTimeout();
    }
  }, [timeLeft, lastResult, isGameOver, handleTimeout]);

  const timerProgress = useMemo(() => Math.max(0, Math.min(1, timeLeft / MAX_TIME_SECONDS)), [timeLeft]);

  const loadNextEvent = useCallback(() => {
    if (isGameOver) return;

    // Si HP est à 0, c'est le moment de déclencher le game over
    if (hp <= 0) {
      // Proposer le Continue si pas déjà utilisé
      if (!adState.hasContinued) {
        setShowContinueOffer(true);
        setIsTimerPaused(true);
      } else {
        // Sinon, game over
        setIsGameOver(true);
        setLeaderboardsReady(false);
        loadLeaderboards(score, totalAnswered);
        FirebaseAnalytics.logEvent('precision_game_over', {
          total_events: totalAnswered,
          final_score: score,
        });
        // Afficher la pub game over après un délai
        setTimeout(() => {
          showGameOverAd();
        }, 1500);
      }
      return;
    }

    const targetLevel = getLevelForScore(score);
    const nextEvent = pickEventForLevel(targetLevel);
    if (!nextEvent) {
      setError('Plus aucun événement disponible.');
      setCurrentEvent(null);
      return;
    }

    setCurrentEvent(nextEvent);
    setLastResult(null);
    setTimeLeft(MAX_TIME_SECONDS);
    setIsTimerPaused(false);
  }, [isGameOver, pickEventForLevel, score, hp, adState.hasContinued, totalAnswered, loadLeaderboards, showGameOverAd]);

  const restart = useCallback(() => {
    resetAdsState();
    startRun();
  }, [startRun, resetAdsState]);

  // Fonctions pour gérer le Continue
  const handleContinueWithAd = useCallback(() => {
    const success = showContinueAd();
    if (!success) {
      console.error('[PrecisionGame] Failed to show continue ad');
      // Fallback : passer au game over
      setShowContinueOffer(false);
      setIsGameOver(true);
      setLeaderboardsReady(false);
      loadLeaderboards(score, totalAnswered);
    }
  }, [showContinueAd, score, totalAnswered, loadLeaderboards]);

  const handleDeclineContinue = useCallback(() => {
    setShowContinueOffer(false);
    setIsGameOver(true);
    setLeaderboardsReady(false);
    loadLeaderboards(score, totalAnswered);
    FirebaseAnalytics.logEvent('precision_continue_declined', { score });
    // Afficher la pub game over après un délai
    setTimeout(() => {
      showGameOverAd();
    }, 1500);
  }, [score, totalAnswered, loadLeaderboards, showGameOverAd]);

  // Gérer la récompense du Continue
  useEffect(() => {
    if (adState.continueRewardEarned) {
      // Redonner de la vie et continuer
      const bonusHp = 500; // Redonner 500 HP
      setHp(prev => Math.min(MAX_HP, prev + bonusHp));
      setShowContinueOffer(false);
      setIsTimerPaused(false);
      resetContinueReward();
      loadNextEvent();
      FirebaseAnalytics.logEvent('precision_continued', { score, hp_restored: bonusHp });
    }
  }, [adState.continueRewardEarned, score, resetContinueReward, loadNextEvent]);

  // Forcer le chargement de la pub Continue quand le modal s'affiche
  useEffect(() => {
    if (showContinueOffer && !adState.continueLoaded) {
      forceContinueAdLoad();
    }
  }, [showContinueOffer, adState.continueLoaded, forceContinueAdLoad]);

  const levelProgress = useMemo(() => {
    const threshold = level.nextThreshold ?? Infinity;
    if (!Number.isFinite(threshold)) {
      return 1;
    }
    const span = threshold - level.minScore;
    if (span <= 0) return 1;
    const progress = (score - level.minScore) / span;
    return Math.max(0, Math.min(1, progress));
  }, [level, score]);

  return {
    loading,
    error,
    currentEvent,
    score,
    hp,
    hpMax: MAX_HP,
    level,
    levelProgress,
    lastResult,
    isGameOver,
    totalAnswered,
    timeLeft,
    timerProgress,
    isTimerPaused,
    pauseTimer,
    resumeTimer,
    submitGuess,
    loadNextEvent,
    restart,
    reload: loadEvents,
    personalBest,
    playerName,
    leaderboards,
    leaderboardsReady,
    showContinueOffer,
    handleContinueWithAd,
    handleDeclineContinue,
    adState: {
      continueLoaded: adState.continueLoaded,
      hasContinued: adState.hasContinued,
    },
  };
}

export type UsePrecisionGameReturn = ReturnType<typeof usePrecisionGame>;
