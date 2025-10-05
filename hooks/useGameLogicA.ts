// hooks/useGameLogicA.ts
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions } from 'react-native';
import { supabase } from '@/lib/supabase/supabaseClients';
import { FirebaseAnalytics } from '../lib/firebase';
import { devLog } from '../utils/devLog';
import { todayWindow } from '../utils/time';
import {
  Event,
  User,
  ExtendedLevelConfig,
  RewardType,
  LevelEventSummary,
} from './types';
import { LEVEL_CONFIGS } from './levelConfigs';
import type { MusicTheme } from './useAudio';

import {
  useInitGame,
  useTimer,
  useAds,
  useAnalytics,
  usePerformance,
  useAudio,
  useRewards,
  useEventSelector,
  usePlays, // Importer le nouveau hook
} from './game';
import { getGameModeConfig, GameModeConfig } from '../constants/gameModes';
import { applyEndOfRunEconomy } from 'lib/economy/apply';

const screenWidth = Dimensions.get('window').width;

export function useGameLogicA(initialEvent?: string, modeId?: string) {
  const gameMode = useMemo<GameModeConfig>(() => getGameModeConfig(modeId), [modeId]);
  const timeLimit = Math.max(1, gameMode.timeLimit);
  const [streak, setStreak] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showDates, setShowDates] = useState(!!gameMode.showDatesByDefault);
  const [isCorrect, setIsCorrect] = useState<boolean | undefined>(undefined);
  const [isWaitingForCountdown, setIsWaitingForCountdown] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [isLevelPaused, setIsLevelPaused] = useState(false);
  const [leaderboardsReady, setLeaderboardsReady] = useState(false);
  const [leaderboards, setLeaderboards] = useState({ daily: [], monthly: [], allTime: [] });
  const [currentLevelConfig, setCurrentLevelConfig] = useState<ExtendedLevelConfig>({
    ...LEVEL_CONFIGS[1],
    eventsSummary: [],
  });

  const [pendingAdDisplay, setPendingAdDisplay] = useState<"interstitial" | "rewarded" | "gameOver" | "levelUp" | null>(null);

  // ---------- PROFIL UTILISATEUR (affichage pseudo / xp / parties) ----------
  type ProfileLite = {
    id: string;
    display_name: string | null;
    xp_total: number;
    title_key?: string | null;
    parties_per_day: number;
    high_score?: number | null;
  };
  const [profile, setProfile] = useState<ProfileLite | null>(null);

  const [progressAnim] = useState(() => new Animated.Value(0));
  const isApplyingEconomyRef = useRef(false);
  const [endSummary, setEndSummary] = useState<{
    mode: 'classic' | 'date';
    points: number;
    xpEarned: number;
    newXp: number;
    rank: { key: string; label: string; partiesPerDay: number };
    leveledUp: boolean;
  } | null>(null);
  const [endSummaryError, setEndSummaryError] = useState<string | null>(null);
  const currentRunIdRef = useRef<string | null>(null);

  useEffect(() => {
    setShowDates(!!gameMode.showDatesByDefault);
  }, [gameMode.showDatesByDefault]);

  const {
    loading,
    error,
    highScore,
    user,
    allEvents,
    previousEvent,
    newEvent,
    usedEvents,
    levelsHistory,
    displayedEvent,
    setUser,
    setPreviousEvent,
    setNewEvent,
    setUsedEvents,
    setLevelsHistory,
    setDisplayedEvent,
    setError,
    setLoading,
    markEventUsageLocal,
    initGame: baseInitGame,
  } = useInitGame();

  const refreshProfile = useCallback(async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, xp_total, title_key, parties_per_day, high_score')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        setProfile(null);
        return;
      }
      if (!data) {
        setProfile(null);
        return;
      }
      setProfile({
        id: data.id,
        display_name: data.display_name ?? null,
        xp_total: data.xp_total ?? 0,
        title_key: data.title_key ?? 'page',
        parties_per_day: data.parties_per_day ?? 3,
        high_score: data.high_score ?? 0,
      });
    } catch (err) {
      setProfile(null);
    }
  }, []);

  // Charger au montage et sur changement d'auth
  useEffect(() => {
    refreshProfile();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refreshProfile();
    });
    return () => {
      try { sub?.subscription?.unsubscribe?.(); } catch {}
    };
  }, [refreshProfile]);

  // Utiliser le nouveau hook pour gérer les parties
  const { playsInfo, canStartRun, refreshPlaysInfo } = usePlays();

  const initGame = useCallback(async () => {
    setEndSummary(null);
    setEndSummaryError(null);
    await baseInitGame({ initialLives: gameMode.initialLives });
  }, [baseInitGame, gameMode.initialLives]);

  const getThemeForLevel = useCallback((level: number): MusicTheme => {
    if (level >= 7) {
      return 'scifi';
    }
    if (level >= 4) {
      return 'western';
    }
    return 'mystery';
  }, []);

  const {
    periodStats,
    categoryMastery,
    eventHistory,
    performanceStats,
    currentLevelEvents,
    levelCompletedEvents,
    updatePerformanceStats,
    calculatePoints,
    addEventToLevel,
    resetLevelCompletedEvents,
    resetCurrentLevelEvents,
  } = usePerformance();

  const {
    playCorrectSound,
    playIncorrectSound,
    playLevelUpSound,
    playCountdownSound,
    playGameOverSound,
    playTimePortalSound,
    playParchmentSound,
    playMusicTheme,
    stopMusic,
  } = useAudio();

  const userLevel = user?.level ?? 1;

  useEffect(() => {
    if (isGameOver) {
      return;
    }
    if (userLevel > 0) {
      void playMusicTheme(getThemeForLevel(userLevel));
    }
  }, [userLevel, isGameOver, playMusicTheme, getThemeForLevel]);

  useEffect(() => {
    if (isGameOver) {
      void stopMusic();
    }
  }, [isGameOver, stopMusic]);

  useEffect(() => {
    return () => {
      void stopMusic();
    };
  }, [stopMusic]);

  const {
    trackGameStarted,
    trackLevelStarted,
    trackLevelCompleted,
    trackQuestion,
    trackStreak,
    trackReward,
    trackGameOver,
    trackError,
  } = useAnalytics();

  // --- AJOUT : Fonction pour réinitialiser l'état de contrôle du jeu ---
  const resetGameFlowState = useCallback(() => {
    setIsGameOver(false);
    setIsLevelPaused(false);
    setShowLevelModal(false);
    setShowDates(!!gameMode.showDatesByDefault);
    setIsCorrect(undefined);
    setIsWaitingForCountdown(false);
    setStreak(0);
    progressAnim.setValue(0); // Réinitialiser l'animation de progression
    setCurrentLevelConfig({ ...LEVEL_CONFIGS[1], eventsSummary: [] }); // Revenir à la config niveau 1
    setPendingAdDisplay(null); // Annuler les pubs en attente
    setError(null); // Nettoyer les erreurs précédentes
    setEndSummary(null);
    setEndSummaryError(null);
    // Réinitialiser aussi l'état des sous-hooks si nécessaire
    resetCurrentLevelEvents(); // Réinitialise les events du niveau en cours
    resetLevelCompletedEvents(); // Réinitialise les events du niveau complété
    resetAntiqueCount(); // Réinitialise le compteur d'events antiques
    setLeaderboardsReady(false); // Masquer les classements précédents
  }, [
    progressAnim,
    resetCurrentLevelEvents,
    resetLevelCompletedEvents,
    resetAntiqueCount,
    setLeaderboardsReady,
    gameMode.showDatesByDefault,
    setEndSummary,
    setEndSummaryError,
  ]);
  // --- FIN AJOUT ---

  const clearEndSummary = useCallback(() => {
    setEndSummary(null);
    setEndSummaryError(null);
  }, []);

  const handleTimeout = useCallback(() => {
    if (isLevelPaused || isGameOver) {
      return;
    }
    setIsWaitingForCountdown(false);

    FirebaseAnalytics.logEvent('timeout', {
      level_id: user.level,
      events_completed_in_level: user.eventsCompletedInLevel,
      current_streak: streak,
    });

    playIncorrectSound();
    setStreak(0);

    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();

    setUser((prev) => {
      const newLives = prev.lives - 1;
      FirebaseAnalytics.logEvent('life_lost', {
        reason: 'timeout',
        remaining_lives: newLives,
        level_id: prev.level,
        event_id: newEvent?.id || 'unknown',
      });

      return newLives <= 0
        ? { ...prev, lives: 0, streak: 0 }
        : { ...prev, lives: newLives, streak: 0 };
    });

    if (user.lives <= 1) {
        endGame();
    } else if (newEvent) {
      setIsCorrect(false);
      setShowDates(true);
      setTimeout(() => {
        if (!isGameOver) {
          setPreviousEvent(newEvent);
          setDisplayedEvent(null);
          selectNewEvent(allEvents, newEvent);
        }
      }, 1500);
    } else {
      setError('Erreur interne: impossible de charger l\'événement suivant après timeout.');
      setIsGameOver(true);
      FirebaseAnalytics.error('timeout_null_event', 'newEvent was null in handleTimeout', 'handleTimeout');
    }
  }, [
    isLevelPaused,
    isGameOver,
    user.level,
    user.lives,
    user.eventsCompletedInLevel,
    streak,
    newEvent,
    allEvents,
    playIncorrectSound,
    progressAnim,
    endGame,
    selectNewEvent,
    setPreviousEvent,
    setDisplayedEvent,
    setError,
    setIsGameOver,
    setIsCorrect,
    setShowDates,
    setUser,
    setStreak,
    setIsWaitingForCountdown,
  ]);

  const {
    timeLeft,
    isCountdownActive,
    setTimeLeft,
    setIsCountdownActive,
    resetTimer,
    handleImageLoad,
    isImageLoaded,
    setIsImageLoaded,
  } = useTimer({
    user,
    isLevelPaused,
    isGameOver,
    handleTimeout,
    isImageLoaded: false,
    initialTime: timeLimit,
  });

  const updateGameState = useCallback(
    async (selectedEvent: Event) => {
      try {
        setUsedEvents((prev) => new Set([...prev, selectedEvent.id]));
        setNewEvent(selectedEvent);
        setDisplayedEvent(selectedEvent);
        setIsImageLoaded(false);
        setShowDates(!!gameMode.showDatesByDefault);
        setIsCorrect(undefined);
        setIsCountdownActive(false);
        setTimeLeft(timeLimit);
          devLog('EVENT_PLAYED', {
            date: selectedEvent.date,
            titre: selectedEvent.titre,
            notoriete: (selectedEvent as any)?.notoriete ?? null,
          });

        const { error: usageError } = await supabase.rpc('increment_event_usage', {
          event_id: selectedEvent.id,
        });

        if (usageError) {
          devLog('SUPABASE_INCREMENT_ERROR', {
            id: selectedEvent.id,
            message: usageError.message,
            details: (usageError as any)?.details ?? null,
          });
        }

        markEventUsageLocal(selectedEvent.id);
        invalidateEventCaches(selectedEvent.id);

        if (selectedEvent && isAntiqueEvent(selectedEvent)) {
          updateAntiqueCount(selectedEvent);
        }
      } catch (err) {
        FirebaseAnalytics.error('update_game_state_error', err instanceof Error ? err.message : 'Unknown', 'updateGameState');
        setError("Erreur lors de la mise à jour de l'état du jeu.");
      }
    },
    [
      setUsedEvents,
      setNewEvent,
      setDisplayedEvent,
      setIsImageLoaded,
      setShowDates,
      setIsCorrect,
      setIsCountdownActive,
      setTimeLeft,
      isAntiqueEvent, // from useEventSelector
      updateAntiqueCount, // from useEventSelector
      markEventUsageLocal,
      invalidateEventCaches,
      setError,
      gameMode.showDatesByDefault,
      timeLimit
    ]
  );


  const {
    antiqueEventsCount,
    eventCount,
    forcedJumpEventCount,
    selectNewEvent: baseSelectNewEvent,
    getPeriod,
    isAntiqueEvent,
    updateAntiqueCount,
    resetAntiqueCount,
    invalidateEventCaches,
  } = useEventSelector({
    setError,
    setIsGameOver,
    updateStateCallback: updateGameState
  });

  const selectNewEvent = useCallback(
    async (events: Event[], referenceEvent: Event | null): Promise<Event | null> => {
      const result = await baseSelectNewEvent(
        events,
        referenceEvent,
        user.level,
        usedEvents
      );
      return result;
    },
    [baseSelectNewEvent, user.level, usedEvents]
  );

  const applyReward = useCallback(
    (reward: { type: RewardType; amount: number }) => {
      try {
        const safeAmount = Math.max(0, Math.floor(Number(reward.amount) || 0));
        setUser((prev) => {
          const currentPoints = Math.max(0, Number(prev.points) || 0);
          const updatedPoints = currentPoints + (reward.type === RewardType.POINTS ? safeAmount : 0);
        const updatedLives =
          reward.type === RewardType.EXTRA_LIFE
            ? Math.min(prev.lives + 1, gameMode.maxLives)
            : prev.lives;

          FirebaseAnalytics.logEvent('reward_applied', {
            reward_type: reward.type,
            reward_amount: safeAmount,
            new_points: updatedPoints,
            new_lives: updatedLives,
            level: prev.level,
          });
          return { ...prev, points: updatedPoints, lives: updatedLives };
        });
      } catch (err) {
        FirebaseAnalytics.error('apply_reward_error', err instanceof Error ? err.message : 'Unknown', 'applyReward');
        setError("Erreur lors de l'application de la récompense.");
      }
    },
    [setUser, setError, gameMode.maxLives]
  );

  const { currentReward, checkRewards, completeRewardAnimation, updateRewardPosition } = useRewards({
    onRewardEarned: (reward) => {
      if (!reward.targetPosition) {
        reward.targetPosition =
          reward.type === RewardType.EXTRA_LIFE
            ? { x: screenWidth * 0.45, y: 50 }
            : { x: 80, y: 30 };
      }
      applyReward(reward);
    },
    maxLives: gameMode.maxLives,
  });

  const {
    adState,
    canShowAd,
    showRewardedAd,
    showGenericInterstitial,
    showLevelUpInterstitial,
    showGameOverInterstitial,
    resetAdsState,
  } = useAds({
    user,
    setUser,
    previousEvent,
    allEvents,
    selectNewEvent,
    resetTimer,
    setIsGameOver,
    setIsLevelPaused,
    setIsWaitingForCountdown,
    setError,
    pendingAdDisplay,
    setPendingAdDisplay,
    maxLives: gameMode.maxLives,
  });

  useEffect(() => {
    if (isImageLoaded && !isLevelPaused && !isGameOver && !isCountdownActive) {
      setIsCountdownActive(true);
    }
  }, [isImageLoaded, isLevelPaused, isGameOver, isCountdownActive, setIsCountdownActive]);

  const finalizeCurrentLevelHistory = useCallback(
    (eventsToFinalize: LevelEventSummary[]) => {
      if (!eventsToFinalize || eventsToFinalize.length === 0) {
        return;
      }

      const currentLvl = user.level;

      setLevelsHistory((prevHistory) => {
        const existingIndex = prevHistory.findIndex((lh) => lh.level === currentLvl);

        if (existingIndex > -1) {
          const updated = [...prevHistory];
          updated[existingIndex] = {
            level: currentLvl,
            events: [...updated[existingIndex].events, ...eventsToFinalize],
          };
          return updated;
        } else {
          return [...prevHistory, { level: currentLvl, events: eventsToFinalize }];
        }
      });
    },
    [user.level, setLevelsHistory]
  );

  const handleChoice = useCallback(
    (choice: 'avant' | 'après') => {
      if (!previousEvent || !newEvent || isLevelPaused || isGameOver || isWaitingForCountdown) {
        return;
      }

      const responseTime = timeLimit - timeLeft;
      setIsCountdownActive(false);

      const prevDate = new Date(previousEvent.date);
      const newDate = new Date(newEvent.date);
      if (isNaN(prevDate.getTime()) || isNaN(newDate.getTime())) {
        setError("Erreur interne: date d'événement invalide.");
        FirebaseAnalytics.error(
          'invalid_event_date',
          `p=${previousEvent.date}, n=${newEvent.date}`,
          'handleChoice'
        );
        setIsWaitingForCountdown(false);
        return;
      }

      const isNewBefore = newDate < prevDate;
      const isAnswerCorrect = (choice === 'avant' && isNewBefore) || (choice === 'après' && !isNewBefore);

      trackQuestion(
        newEvent.id,
        newEvent.titre,
        getPeriod(newEvent.date),
        Math.max(0, Math.round(((newEvent as any)?.notoriete ?? 0))),
        choice,
        isAnswerCorrect,
        responseTime,
        user.level,
        streak
      );

      setIsCorrect(isAnswerCorrect);
      setShowDates(true);

      const eventSummaryItem: LevelEventSummary = {
        id: newEvent.id,
        titre: newEvent.titre,
        date: newEvent.date,
        date_formatee: newEvent.date_formatee || newDate.toLocaleDateString('fr-FR'),
        illustration_url: newEvent.illustration_url,
        wasCorrect: isAnswerCorrect,
        responseTime,
        description_detaillee: newEvent.description_detaillee,
      };

      updatePerformanceStats(
        newEvent.types_evenement?.[0] || 'default',
        getPeriod(newEvent.date),
        isAnswerCorrect
      );

      setPreviousEvent(newEvent);
      setIsWaitingForCountdown(true);

      if (isAnswerCorrect) {
        console.log('[Audio] GameLogicA: correct answer – triggering SFX', { eventId: newEvent.id, streak });
        playCorrectSound();
        const newStreak = streak + 1;
        setStreak(newStreak);
        trackStreak(newStreak, user.level);

        Animated.timing(progressAnim, {
          toValue: newStreak,
          duration: 300,
          useNativeDriver: false
        }).start();

        const normalizedTimeLeft = Math.round((timeLeft / Math.max(1, timeLimit)) * 20);
        const safeNormalizedTime = Math.max(0, Math.min(20, normalizedTimeLeft));
        const basePoints = calculatePoints(
          safeNormalizedTime,
          1,
          newStreak,
          user.level
        );
        const pointsEarned = Math.max(10, Math.round(basePoints * gameMode.scoreMultiplier));

        trackReward(
          'POINTS',
          pointsEarned,
          'correct_answer',
          'correct_answer',
          user.level,
          user.points + pointsEarned
        );

        checkRewards({ type: 'streak', value: newStreak }, user);
        addEventToLevel(eventSummaryItem);
        playParchmentSound();

        setUser((prev) => {
          const updatedPoints = prev.points + pointsEarned;
          const eventsDone = prev.eventsCompletedInLevel + 1;

          let updated = {
            ...prev,
            points: updatedPoints,
            streak: newStreak,
            maxStreak: Math.max(prev.maxStreak, newStreak),
            eventsCompletedInLevel: eventsDone,
            totalEventsCompleted: prev.totalEventsCompleted + 1,
          };

          const config = LEVEL_CONFIGS[prev.level];
          if (config && eventsDone >= config.eventsNeeded) {
            trackLevelCompleted(prev.level, config.name || `Niveau ${prev.level}`, eventsDone, updatedPoints);
            finalizeCurrentLevelHistory(levelCompletedEvents); // Use levelCompletedEvents here

            updated.level += 1;
            updated.eventsCompletedInLevel = 0;

            setCurrentLevelConfig({ ...LEVEL_CONFIGS[updated.level], eventsSummary: [] });
            resetCurrentLevelEvents(); // Reset events for the *new* level
            resetAntiqueCount(); // Reset antique count for the new level

            setShowLevelModal(true);
            setIsLevelPaused(true);

            console.log('[Audio] GameLogicA: level up – triggering SFX', { level: updated.level });
            playTimePortalSound();
            playLevelUpSound();
            void playMusicTheme(getThemeForLevel(updated.level));

            if ([2, 6].includes(prev.level) || prev.level % 5 === 0) {
              setPendingAdDisplay('levelUp');
              FirebaseAnalytics.ad('interstitial', 'triggered', 'level_up', prev.level);
            }

            checkRewards({ type: 'level', value: updated.level }, updated);
          } else {
            setTimeout(() => {
              setIsWaitingForCountdown(false);
              if (!isGameOver && !showLevelModal) {
                 selectNewEvent(allEvents, newEvent);
              }
            }, 750); // Shorter delay for correct answers
          }

          return updated;
        });
      } else { // Incorrect Answer
        console.log('[Audio] GameLogicA: incorrect answer – triggering SFX', { eventId: newEvent.id, livesBefore: user.lives });
        playIncorrectSound();
        setStreak(0);

        Animated.timing(progressAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false
        }).start();

        addEventToLevel(eventSummaryItem); // Still add the incorrect event to the level summary
        playParchmentSound();

        setUser((prev) => {
          const newLives = prev.lives - 1;
          FirebaseAnalytics.logEvent('life_lost', {
            reason: 'incorrect_answer',
            remaining_lives: newLives,
            level_id: prev.level,
            event_id: newEvent.id,
          });

          return newLives <= 0
            ? { ...prev, lives: 0, streak: 0 }
            : { ...prev, lives: newLives, streak: 0 };
        });

        if (user.lives <= 1) { // Check if *about* to be game over
          setTimeout(() => {
            // Re-check isGameOver in case something else ended the game during the delay
            if (!isGameOver) endGame();
          }, 500); // Short delay before game over screen
        } else {
          setTimeout(() => {
            setIsWaitingForCountdown(false);
            if (!isGameOver && !showLevelModal) {
              selectNewEvent(allEvents, newEvent);
            }
          }, 1500); // Longer delay for incorrect answers
        }
      }
    },
    [
      previousEvent, newEvent, isLevelPaused, isGameOver, isWaitingForCountdown, timeLeft, streak, user, allEvents, progressAnim, levelCompletedEvents, getPeriod, calculatePoints, checkRewards, selectNewEvent, finalizeCurrentLevelHistory, playCorrectSound, playIncorrectSound, playLevelUpSound, updatePerformanceStats, trackQuestion, trackStreak, trackReward, trackLevelCompleted, addEventToLevel, resetCurrentLevelEvents, resetAntiqueCount, endGame, setPreviousEvent, setError, setIsCorrect, setShowDates, setIsWaitingForCountdown, setIsCountdownActive, setStreak, setUser, setLevelsHistory, setCurrentLevelConfig, setShowLevelModal, setIsLevelPaused, setPendingAdDisplay, gameMode.scoreMultiplier, timeLimit
    ]
  );

  const setScoresAndShow = useCallback(
    (dailyScores: any[], monthlyScores: any[], allTimeScores: any[]) => {
      const formatScores = (scores: any[], scoreField: string = 'score') =>
        scores
          .filter(s => s && typeof s === 'object')
          .map((s, index) => ({
            name: s.display_name?.trim() || 'Joueur Anonyme',
            score: Number(s[scoreField]) || 0,
            rank: index + 1,
          }));

      const formatted = {
        daily: formatScores(dailyScores, 'score'),
        monthly: formatScores(monthlyScores, 'score'),
        allTime: formatScores(allTimeScores, 'high_score')
      };

      setLeaderboards(formatted);
      setLeaderboardsReady(true);
      FirebaseAnalytics.leaderboard('summary_loaded');
    },
    [setLeaderboards, setLeaderboardsReady]
  );

  type StartRunSuccess = {
    ok: true;
    runId: string;
    window: { startISO: string; endISO: string };
    allowed: number;
    used: number;
  };

  type StartRunFailure = {
    ok: false;
    reason: 'NO_PLAYS_LEFT' | 'DB_ERROR' | 'AUTH_REQUIRED' | 'UNKNOWN';
    message: string;
  };

  const startRun = useCallback(
    async (mode: 'classic' | 'date'): Promise<StartRunSuccess | StartRunFailure> => {
      try {
        currentRunIdRef.current = null;

        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !authUser?.id) {
          currentRunIdRef.current = null;
          return {
            ok: false,
            reason: 'AUTH_REQUIRED',
            message: 'Veuillez vous (re)connecter.'
          };
        }

        // On rafraîchit l'état des parties pour être sûr
        await refreshPlaysInfo();

        // La vérification se fait maintenant sur la valeur fraîche de canStartRun
        if (!canStartRun) {
             return { ok: false, reason: 'NO_PLAYS_LEFT', message: "Plus de parties disponibles aujourd'hui." };
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, parties_per_day')
          .eq('id', authUser.id)
          .maybeSingle();

        if (profileError) {
          currentRunIdRef.current = null;
          return {
            ok: false,
            reason: 'DB_ERROR',
            message: profileError.message || 'Erreur de chargement du profil.'
          };
        }

        const allowed = Math.max(1, profile?.parties_per_day ?? 3);
        const window = todayWindow();

        const { count: runsToday, error: runsCountError } = await supabase
          .from('runs')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', authUser.id)
          .gte('created_at', window.startISO)
          .lt('created_at', window.endISO);

        if (runsCountError) {
          currentRunIdRef.current = null;
          return {
            ok: false,
            reason: 'DB_ERROR',
            message: runsCountError.message || 'Erreur de vérification des parties.'
          };
        }

        const used = runsToday ?? 0;
        const insertPayload = { user_id: authUser.id, mode, points: 0 };

        const { data: inserted, error: insertError } = await supabase
          .from('runs')
          .insert(insertPayload)
          .select('id, created_at')
          .single();

        if (insertError || !inserted) {
          currentRunIdRef.current = null;
          return {
            ok: false,
            reason: 'DB_ERROR',
            message: insertError?.message || 'Insert failed (runs).'
          };
        }

        await refreshPlaysInfo();
        currentRunIdRef.current = inserted.id;

        return {
          ok: true,
          runId: inserted.id,
          window,
          allowed,
          used,
        };
      } catch (e: any) {
        currentRunIdRef.current = null;
        return {
          ok: false,
          reason: 'UNKNOWN',
          message: e?.message || 'Erreur inconnue.'
        };
      }
    },
    [refreshPlaysInfo, canStartRun],
  );

  const endGame = useCallback(async () => {
    if (isGameOver) {
      return;
    }

    const runIdForThisEndGame = currentRunIdRef.current; // Capture the runId at the moment endGame starts
    setIsGameOver(true);
    setIsCountdownActive(false);
    setIsLevelPaused(true); // Pause the game logic
    console.log('[Audio] GameLogicA: game over – triggering SFX', { points: user.points, level: user.level });
    playGameOverSound();
    setLeaderboardsReady(false);

    trackGameOver(
      user.points,
      user.level,
      user.totalEventsCompleted,
      user.maxStreak,
      user.points > highScore
    );

    finalizeCurrentLevelHistory(currentLevelEvents); // Finalize history with events from the last, incomplete level

    setTimeout(() => {
      if (canShowAd()) {
         setPendingAdDisplay('gameOver');
      }
    }, 1500); // Delay ad trigger slightly


    try {
      // Vérifier si l'utilisateur est connecté via le profil déjà chargé
      const userId = profile?.id;

      console.log('[END GAME] User check:', { userId, hasProfile: !!profile });

      if (!userId) {
        console.log('[END GAME] ⚠️ Mode invité détecté - Quêtes NON mises à jour');
        // For guests, show their score and the current high score
        setEndSummary(null);
        setEndSummaryError(null);
        const guestScores = {
          daily: [{ name: user.name || 'Voyageur', score: user.points, rank: 1 }],
          monthly: [{ name: '👑 Meilleur score', score: highScore || user.points, rank: 1 }],
          allTime: [{ name: '🏆 Record', score: highScore || user.points, rank: 1 }],
        };
        setLeaderboards(guestScores);
        setLeaderboardsReady(true);
         if (pendingAdDisplay === 'gameOver') {
            showGameOverInterstitial(); // Show ad now after setting guest scores
            setPendingAdDisplay(null);
         }
        return;
      }

      // Logged-in user logic
      console.log('[END GAME] ✅ Utilisateur connecté:', userId);
      const currentDisplayName = user.name || 'Joueur'; // Use fetched name or default
      const finalPoints = user.points;
      const economyMode: 'classic' | 'date' = gameMode.variant === 'precision' ? 'date' : 'classic';
      const runId = runIdForThisEndGame;

      if (!runId) {
      } else if (!isApplyingEconomyRef.current) {
        isApplyingEconomyRef.current = true;
        try {
          // Calculer les stats de jeu
          const gameStats = {
            totalAnswers: user.totalEventsCompleted,
            correctAnswers: user.totalEventsCompleted, // Approximation, à améliorer
            perfectRound: user.lives === 3, // Partie parfaite si aucune vie perdue
            fastWin: false, // À implémenter avec un timer
            speedMaster: false, // À implémenter
            noMistakes: user.lives === 3 ? user.totalEventsCompleted : 0,
            maxAnswerStreak: user.maxStreak, // Meilleur streak de réponses dans la partie
          };

          console.log('[useGameLogicA] Appel applyEndOfRunEconomy avec stats:', {
            runId,
            mode: economyMode,
            points: finalPoints,
            gameStats,
          });

          const summary = await applyEndOfRunEconomy({
            runId,
            userId,
            mode: economyMode,
            points: finalPoints,
            gameStats,
          });

          console.log('[useGameLogicA] applyEndOfRunEconomy réussi:', summary);

          setEndSummary({
            mode: economyMode,
            points: finalPoints,
            xpEarned: summary.xpEarned,
            newXp: summary.newXp,
            rank: summary.rank,
            leveledUp: summary.leveledUp,
          });
          setEndSummaryError(null);
          currentRunIdRef.current = null;
        } catch (economyError) {
          console.error('[useGameLogicA] Erreur applyEndOfRunEconomy:', economyError);
          setEndSummaryError(
            economyError instanceof Error ? economyError.message : String(economyError),
          );
          currentRunIdRef.current = null;
        } finally {
          isApplyingEconomyRef.current = false;
        }
      }

      // 1. Insert current game score
      const { error: insertError } = await supabase.from('game_scores').insert({
        user_id: userId,
        display_name: currentDisplayName,
        score: user.points,
      });
      if (insertError) {
        FirebaseAnalytics.error('score_insert_error', insertError.message, 'endGame');
      }

      // 2. Check and update high score in profiles table
      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('high_score')
        .eq('id', userId)
        .single();

      if (profileError) {
        FirebaseAnalytics.error('profile_fetch_error', profileError.message, 'endGame');
      } else if (currentProfile && user.points > (currentProfile.high_score || 0)) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ high_score: user.points })
          .eq('id', userId);

        if (updateError) {
          FirebaseAnalytics.error('profile_update_error', updateError.message, 'endGame');
        } else {
          FirebaseAnalytics.logEvent('new_high_score', {
            score: user.points,
            previous_high_score: currentProfile.high_score || 0,
          });
        }
      }

      // 3. Fetch leaderboards
      const today = new Date().toISOString().split('T')[0];
      const firstDayOfMonth = `${today.substring(0, 7)}-01`;

      const [dailyRes, monthlyRes, allTimeRes] = await Promise.all([
        supabase
          .from('game_scores')
          .select('display_name, score')
          .gte('created_at', `${today}T00:00:00.000Z`)
          .order('score', { ascending: false })
          .limit(5),
        supabase
          .from('game_scores')
          .select('display_name, score')
          .gte('created_at', `${firstDayOfMonth}T00:00:00.000Z`)
          .order('score', { ascending: false })
          .limit(5),
        supabase
          .from('profiles')
          .select('display_name, high_score')
          .not('high_score', 'is', null)
          .order('high_score', { ascending: false })
          .limit(5),
      ]);

      if (dailyRes.error) FirebaseAnalytics.error('leaderboard_fetch_error', `Daily: ${dailyRes.error.message}`, 'endGame');
      if (monthlyRes.error) FirebaseAnalytics.error('leaderboard_fetch_error', `Monthly: ${monthlyRes.error.message}`, 'endGame');
      if (allTimeRes.error) FirebaseAnalytics.error('leaderboard_fetch_error', `AllTime: ${allTimeRes.error.message}`, 'endGame');

      setScoresAndShow(dailyRes.data || [], monthlyRes.data || [], allTimeRes.data || []);

       if (pendingAdDisplay === 'gameOver') {
          showGameOverInterstitial(); // Show ad now after fetching scores
          setPendingAdDisplay(null);
       }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown endGame processing error';
      FirebaseAnalytics.error('endgame_processing_error', errorMessage, 'endGame');

      // Fallback: show guest-like scores on error
      const fallbackScores = {
        daily: [{ name: user.name || 'Voyageur', score: user.points, rank: 1 }],
        monthly: [{ name: '👑 Meilleur score', score: highScore || user.points, rank: 1 }],
        allTime: [{ name: '🏆 Record', score: highScore || user.points, rank: 1 }]
      };
      setLeaderboards(fallbackScores);
      setLeaderboardsReady(true);
       if (pendingAdDisplay === 'gameOver') {
            showGameOverInterstitial(); // Show ad now after setting fallback scores
            setPendingAdDisplay(null);
       }
    }
  }, [
    isGameOver,
    user.points,
    user.level,
    user.totalEventsCompleted,
    user.maxStreak,
    user.name,
    highScore,
    playGameOverSound,
    trackGameOver,
    finalizeCurrentLevelHistory,
    currentLevelEvents,
    canShowAd,
    showGameOverInterstitial,
    setScoresAndShow,
    setIsGameOver,
    setIsCountdownActive,
    setIsLevelPaused,
    setLeaderboardsReady,
    setPendingAdDisplay,
    setLevelsHistory,
    pendingAdDisplay,
    gameMode.variant,
    setEndSummary,
    setEndSummaryError,
  ]);


  const handleLevelUp = useCallback(() => {
    // Capture state at the moment the level up occurs
    const currentLevelState = user.level;
    const currentPointsState = user.points;
    const referenceEvent = previousEvent; // Use the event just answered correctly

    // --- Pre-computation and validation ---
    if (!referenceEvent) {
      setError('Erreur interne critique: impossible de démarrer le niveau suivant (référence manquante).');
      FirebaseAnalytics.error('levelup_null_prev_event', 'previousEvent was null when handleLevelUp called', 'handleLevelUp');
      setIsGameOver(true); // End the game if state is inconsistent
      return; // Stop execution
    }

    const nextConfig = LEVEL_CONFIGS[currentLevelState]; // Config for the level *just completed* (user.level was already incremented)
    if (!nextConfig) {
      setError('Félicitations ! Vous avez terminé tous les niveaux disponibles !');
      FirebaseAnalytics.error('config_missing_on_levelup', `Level ${currentLevelState} config missing`, 'handleLevelUp');
      endGame(); // Treat as game end if no next level config
      return; // Stop execution
    }

    // --- State Resets for New Level ---
    setShowLevelModal(false); // Hide the modal first

    resetTimer(timeLimit); // Reset timer for the new level
    // resetLevelCompletedEvents(); // Already done when finalizing history
    // resetCurrentLevelEvents(); // Already done when user state was updated
    setIsWaitingForCountdown(false); // Not waiting for next event yet
    setShowDates(false); // Hide previous dates
    setIsCorrect(undefined); // Reset correctness indicator
    setIsImageLoaded(false); // Need to load the new image
    setDisplayedEvent(null); // Clear the displayed event temporarily

    // --- Analytics ---
    trackLevelStarted(
      currentLevelState, // The new level number
      nextConfig.name || `Niveau ${currentLevelState}`,
      nextConfig.eventsNeeded,
      currentPointsState // Points at the start of the new level
    );

    // --- Ad Handling ---
    if (pendingAdDisplay === 'levelUp' && canShowAd()) {
      showLevelUpInterstitial(); // Show the ad *after* resetting state but *before* selecting the next event
    }
    setPendingAdDisplay(null); // Clear the pending ad regardless of whether it was shown

    // --- Load Next Event ---
    selectNewEvent(allEvents, referenceEvent) // Use the last correct event as reference
      .then((selectedEvent) => {
        // Only unpause if an event was successfully selected AND the game hasn't ended in the meantime
        if (selectedEvent && !isGameOver) {
           // Crucially unpause *after* the new event is ready (updateGameState callback handles setting displayedEvent etc.)
           setIsLevelPaused(false);
        } else if (!isGameOver) {
          // If no event could be selected, it's a critical error for continuing play
          setError('Impossible de trouver un événement valide pour continuer le jeu après la montée de niveau.');
          setIsGameOver(true); // End the game
          FirebaseAnalytics.error('select_event_null_levelup', 'selectNewEvent returned null unexpectedly after level up', 'handleLevelUp');
        }
      })
      .catch((err) => {
        setError(`Erreur critique lors du chargement du niveau suivant: ${err.message}`);
        FirebaseAnalytics.error('select_event_error_levelup', err instanceof Error ? err.message : 'Unknown', 'handleLevelUp');
        setIsGameOver(true); // End the game on critical error
        // Ensure game remains paused if it wasn't already over
        setIsLevelPaused(true);
      });

  }, [
    user.level, user.points, previousEvent, allEvents, // Core data
    pendingAdDisplay, canShowAd, showLevelUpInterstitial, // Ad logic
    selectNewEvent, // Event selection logic
    resetTimer, // Timer logic
    timeLimit,
    trackLevelStarted, // Analytics
    setDisplayedEvent, setError, setIsGameOver, endGame, // State setters & core actions
    setShowLevelModal, setIsLevelPaused, setIsWaitingForCountdown, // UI/Flow state setters
    setShowDates, setIsCorrect, setIsImageLoaded, setPendingAdDisplay, // More state setters
    isGameOver // Need to check isGameOver status within the callback
  ]);

  useEffect(() => {
    initGame();
    trackGameStarted();
  }, [initGame, trackGameStarted]); // Dependencies ensure this runs only once on mount


  // --- MODIFIER LA SECTION RETURN (tout à la fin du hook) ---
    return {
    user,
    previousEvent,
    newEvent,
    displayedEvent,
    timeLeft,
    loading,
    error,
    isGameOver,
    leaderboardsReady,
    showDates,
    isCorrect,
    isImageLoaded,
    streak,
    highScore,
    showLevelModal,
    isLevelPaused,
    currentLevelConfig,
    leaderboards,
    currentReward,
    handleChoice,
    handleLevelUp,
    showRewardedAd,
    initGame, // Fonction de useInitGame
    completeRewardAnimation,
    updateRewardPosition,
    remainingEvents: allEvents ? allEvents.length - usedEvents.size : 0,
    progressAnim,
    onImageLoad: handleImageLoad, // from useTimer
    levelCompletedEvents, // from usePerformance (read-only access for display)
    levelsHistory, // from useInitGame (read-only access for display)
    resetAdsState, // from useAds
    resetGameFlowState, // <-- EXPOSER LA NOUVELLE FONCTION
    adState: {
      hasRewardedAd: adState.rewardedLoaded,
      hasWatchedRewardedAd: adState.hasWatchedRewardedAd,
    },
    startRun,
    canStartRun,
    playsInfo,
    clearEndSummary,
    gameMode,
    timeLimit,
    endSummary,
    endSummaryError,
    // --- Profil exposé pour la Home (vue1) ---
    profile,
    refreshProfile,
  };
}


export default useGameLogicA;
