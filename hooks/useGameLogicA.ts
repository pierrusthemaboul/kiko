// hooks/useGameLogicA.ts
import { useState, useCallback, useEffect } from 'react';
import { Animated, Dimensions } from 'react-native';
import { supabase } from '../lib/supabase/supabaseClients';
import { FirebaseAnalytics } from '../lib/firebase';
import {
  Event,
  User,
  ExtendedLevelConfig,
  RewardType,
  MAX_LIVES,
  LevelEventSummary,
} from './types';
import { LEVEL_CONFIGS } from './levelConfigs';

import {
  useInitGame,
  useTimer,
  useAds,
  useAnalytics,
  usePerformance,
  useAudio,
  useRewards,
  useEventSelector,
} from './game';

const screenWidth = Dimensions.get('window').width;

export function useGameLogicA(initialEvent?: string) {
  const [streak, setStreak] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showDates, setShowDates] = useState(false);
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

  const [progressAnim] = useState(() => new Animated.Value(0));

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
    initGame,
    fetchUserData,
  } = useInitGame();

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
  } = useAudio();

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

  const handleTimeout = useCallback(() => {
    // console.log(`[useGameLogicA] handleTimeout called. isLevelPaused: ${isLevelPaused}, isGameOver: ${isGameOver}`);
    if (isLevelPaused || isGameOver) {
      // console.log(`[useGameLogicA] handleTimeout aborted: paused or game over.`);
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
      // console.log(`[useGameLogicA] Timeout: Life lost. New lives: ${newLives}`);
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
        // console.log(`[useGameLogicA] Timeout: Lives <= 1. Ending game.`);
        endGame();
    } else if (newEvent) {
      setIsCorrect(false);
      setShowDates(true);
      // console.log(`[useGameLogicA] Timeout: Scheduling next event load.`);
      setTimeout(() => {
        if (!isGameOver) {
            // console.log(`[useGameLogicA] Timeout: Loading next event after delay.`);
          setPreviousEvent(newEvent);
          setDisplayedEvent(null);
          selectNewEvent(allEvents, newEvent);
        } else {
            // console.log(`[useGameLogicA] Timeout: Game over during delay, not loading next event.`);
        }
      }, 1500);
    } else {
      setError('Erreur interne: impossible de charger l\'événement suivant après timeout.');
      setIsGameOver(true);
      FirebaseAnalytics.error('timeout_null_event', 'newEvent was null in handleTimeout', 'handleTimeout');
      // console.error('[useGameLogicA] Timeout: newEvent is null, cannot proceed.');
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
  });

  const updateGameState = useCallback(
    async (selectedEvent: Event) => {
      try {
        // console.log(`[useGameLogicA] updateGameState called with event: ${selectedEvent.id}`);
        setUsedEvents((prev) => new Set([...prev, selectedEvent.id]));
        setNewEvent(selectedEvent);
        setDisplayedEvent(selectedEvent);
        setIsImageLoaded(false);
        setShowDates(false);
        setIsCorrect(undefined);
        setIsCountdownActive(false);
        setTimeLeft(20);
        // console.log(`[useGameLogicA] updateGameState completed. isImageLoaded: false, isCountdownActive: false, timeLeft: 20`);

        await supabase
          .from("evenements")
          .update({
            frequency_score: ((selectedEvent as any).frequency_score || 0) + 1,
            last_used: new Date().toISOString(),
          })
          .eq("id", selectedEvent.id);

        if (selectedEvent && isAntiqueEvent(selectedEvent)) {
          updateAntiqueCount(selectedEvent);
        }
      } catch (err) {
        FirebaseAnalytics.error('update_game_state_error', err instanceof Error ? err.message : 'Unknown', 'updateGameState');
        setError("Erreur lors de la mise à jour de l'état du jeu.");
        // console.error(`[useGameLogicA] Error in updateGameState:`, err);
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
      isAntiqueEvent,
      updateAntiqueCount,
      setError
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
    resetAntiqueCount
  } = useEventSelector({
    setError,
    setIsGameOver,
    updateStateCallback: updateGameState
  });

  const selectNewEvent = useCallback(
    async (events: Event[], referenceEvent: Event | null): Promise<Event | null> => {
        // console.log(`[useGameLogicA] selectNewEvent called. Ref Event: ${referenceEvent?.id}, Level: ${user.level}`);
      const result = await baseSelectNewEvent(
        events,
        referenceEvent,
        user.level,
        usedEvents
      );
      // console.log(`[useGameLogicA] selectNewEvent finished. Selected: ${result?.id}`);
      return result;
    },
    [baseSelectNewEvent, user.level, usedEvents]
  );

  const applyReward = useCallback(
    (reward: { type: RewardType; amount: number }) => {
      try {
        const safeAmount = Math.max(0, Math.floor(Number(reward.amount) || 0));
        // console.log(`[useGameLogicA] Applying reward: ${reward.type}, Amount: ${safeAmount}`);
        setUser((prev) => {
          const currentPoints = Math.max(0, Number(prev.points) || 0);
          const updatedPoints = currentPoints + (reward.type === RewardType.POINTS ? safeAmount : 0);
          const updatedLives =
            reward.type === RewardType.EXTRA_LIFE
              ? Math.min(prev.lives + 1, MAX_LIVES)
              : prev.lives;

          FirebaseAnalytics.logEvent('reward_applied', {
            reward_type: reward.type,
            reward_amount: safeAmount,
            new_points: updatedPoints,
            new_lives: updatedLives,
            level: prev.level,
          });
          // console.log(`[useGameLogicA] Reward applied. New points: ${updatedPoints}, New lives: ${updatedLives}`);
          return { ...prev, points: updatedPoints, lives: updatedLives };
        });
      } catch (err) {
        FirebaseAnalytics.error('apply_reward_error', err instanceof Error ? err.message : 'Unknown', 'applyReward');
        setError("Erreur lors de l'application de la récompense.");
        // console.error(`[useGameLogicA] Error applying reward:`, err);
      }
    },
    [setUser, setError]
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
  });

  useEffect(() => {
    //  console.log(`[useGameLogicA] useEffect check timer start: isImageLoaded=${isImageLoaded}, isLevelPaused=${isLevelPaused}, isGameOver=${isGameOver}, isCountdownActive=${isCountdownActive}`);
    if (isImageLoaded && !isLevelPaused && !isGameOver && !isCountdownActive) {
      // console.log(`[useGameLogicA] Conditions met, setting isCountdownActive to true.`);
      setIsCountdownActive(true);
    }
  }, [isImageLoaded, isLevelPaused, isGameOver, isCountdownActive, setIsCountdownActive]);

  const finalizeCurrentLevelHistory = useCallback(
    (eventsToFinalize: LevelEventSummary[]) => {
      if (!eventsToFinalize || eventsToFinalize.length === 0) {
        return;
      }

      const currentLvl = user.level;
      // console.log(`[useGameLogicA] Finalizing level history for level ${currentLvl}. Events count: ${eventsToFinalize.length}`);

      setLevelsHistory((prevHistory) => {
        const existingIndex = prevHistory.findIndex((lh) => lh.level === currentLvl);

        if (existingIndex > -1) {
          const updated = [...prevHistory];
          updated[existingIndex] = {
            level: currentLvl,
            events: [...updated[existingIndex].events, ...eventsToFinalize],
          };
           // console.log(`[useGameLogicA] Updated existing history for level ${currentLvl}.`);
          return updated;
        } else {
           // console.log(`[useGameLogicA] Added new history entry for level ${currentLvl}.`);
          return [...prevHistory, { level: currentLvl, events: eventsToFinalize }];
        }
      });
    },
    [user.level, setLevelsHistory]
  );

  const handleChoice = useCallback(
    (choice: 'avant' | 'après') => {
      // console.log(`[useGameLogicA] handleChoice called: ${choice}. Prev: ${previousEvent?.id}, New: ${newEvent?.id}, Paused: ${isLevelPaused}, GameOver: ${isGameOver}, Waiting: ${isWaitingForCountdown}`);
      if (!previousEvent || !newEvent || isLevelPaused || isGameOver || isWaitingForCountdown) {
        // console.log(`[useGameLogicA] handleChoice aborted.`);
        return;
      }

      const responseTime = 20 - timeLeft;
      // console.log(`[useGameLogicA] handleChoice: Stopping countdown. Response time: ${responseTime}`);
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
        // console.error(`[useGameLogicA] handleChoice: Invalid date.`);
        return;
      }

      const isNewBefore = newDate < prevDate;
      const isAnswerCorrect = (choice === 'avant' && isNewBefore) || (choice === 'après' && !isNewBefore);
      // console.log(`[useGameLogicA] handleChoice: Answer is correct: ${isAnswerCorrect}`);

      trackQuestion(
        newEvent.id,
        newEvent.titre,
        getPeriod(newEvent.date),
        newEvent.niveau_difficulte,
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
      // console.log(`[useGameLogicA] handleChoice: Set previousEvent to ${newEvent.id}, isWaitingForCountdown to true.`);

      if (isAnswerCorrect) {
        playCorrectSound();
        const newStreak = streak + 1;
        setStreak(newStreak);
        trackStreak(newStreak, user.level);

        Animated.timing(progressAnim, {
          toValue: newStreak,
          duration: 300,
          useNativeDriver: false
        }).start();

        const pointsEarned = calculatePoints(
          timeLeft,
          newEvent.niveau_difficulte || 1,
          newStreak,
          user.level
        );
        // console.log(`[useGameLogicA] Correct answer. Points earned: ${pointsEarned}, New streak: ${newStreak}`);

        trackReward(
          'POINTS',
          pointsEarned,
          'correct_answer',
          newEvent.niveau_difficulte || 1,
          user.level,
          user.points + pointsEarned
        );

        checkRewards({ type: 'streak', value: newStreak }, user);
        addEventToLevel(eventSummaryItem);

        setUser((prev) => {
          const updatedPoints = prev.points + pointsEarned;
          const eventsDone = prev.eventsCompletedInLevel + 1;
          // console.log(`[useGameLogicA] Updating user state. Points: ${updatedPoints}, Events done in level: ${eventsDone}`);

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
             // console.log(`[useGameLogicA] LEVEL UP condition met! Level ${prev.level} completed.`);
            trackLevelCompleted(prev.level, config.name || `Niveau ${prev.level}`, eventsDone, updatedPoints);
            finalizeCurrentLevelHistory(levelCompletedEvents);

            updated.level += 1;
            updated.eventsCompletedInLevel = 0;
             // console.log(`[useGameLogicA] Updating user to level ${updated.level}. Resetting level events.`);

            setCurrentLevelConfig({ ...LEVEL_CONFIGS[updated.level], eventsSummary: [] });
            resetCurrentLevelEvents();
            resetAntiqueCount();

            // console.log(`[useGameLogicA] Setting showLevelModal to true and isLevelPaused to true.`);
            setShowLevelModal(true);
            setIsLevelPaused(true);

            playLevelUpSound();

            if ([2, 6].includes(prev.level) || prev.level % 5 === 0) {
                // console.log(`[useGameLogicA] Scheduling level up ad.`);
              setPendingAdDisplay('levelUp');
              FirebaseAnalytics.ad('interstitial', 'triggered', 'level_up', prev.level);
            }

            checkRewards({ type: 'level', value: updated.level }, updated);
          } else {
            // console.log(`[useGameLogicA] Correct answer: Scheduling next event load.`);
            setTimeout(() => {
              setIsWaitingForCountdown(false);
              if (!isGameOver && !showLevelModal) {
                 // console.log(`[useGameLogicA] Correct answer: Loading next event after delay.`);
                 selectNewEvent(allEvents, newEvent);
              } else {
                 // console.log(`[useGameLogicA] Correct answer: Game over or modal shown during delay, not loading next event.`);
              }
            }, 750);
          }

          return updated;
        });
      } else {
        playIncorrectSound();
        setStreak(0);
        // console.log(`[useGameLogicA] Incorrect answer. Streak reset to 0.`);

        Animated.timing(progressAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false
        }).start();

        addEventToLevel(eventSummaryItem);

        setUser((prev) => {
          const newLives = prev.lives - 1;
          // console.log(`[useGameLogicA] Incorrect answer: Life lost. New lives: ${newLives}`);
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

        if (user.lives <= 1) {
          // console.log(`[useGameLogicA] Incorrect answer: Lives <= 1. Ending game after delay.`);
          setTimeout(() => {
            if (!isGameOver) endGame();
          }, 500);
        } else {
          // console.log(`[useGameLogicA] Incorrect answer: Scheduling next event load.`);
          setTimeout(() => {
            setIsWaitingForCountdown(false);
            if (!isGameOver && !showLevelModal) {
               // console.log(`[useGameLogicA] Incorrect answer: Loading next event after delay.`);
              selectNewEvent(allEvents, newEvent);
            } else {
               // console.log(`[useGameLogicA] Incorrect answer: Game over or modal shown during delay, not loading next event.`);
            }
          }, 1500);
        }
      }
    },
    [
      previousEvent, newEvent, isLevelPaused, isGameOver, isWaitingForCountdown, timeLeft, streak, user, allEvents, progressAnim, levelCompletedEvents, getPeriod, calculatePoints, checkRewards, selectNewEvent, finalizeCurrentLevelHistory, playCorrectSound, playIncorrectSound, playLevelUpSound, updatePerformanceStats, trackQuestion, trackStreak, trackReward, trackLevelCompleted, addEventToLevel, resetCurrentLevelEvents, resetAntiqueCount, endGame, setPreviousEvent, setError, setIsCorrect, setShowDates, setIsWaitingForCountdown, setIsCountdownActive, setStreak, setUser, setLevelsHistory, setCurrentLevelConfig, setShowLevelModal, setIsLevelPaused, setPendingAdDisplay
    ]
  );

  const setScoresAndShow = useCallback(
    (dailyScores: any[], monthlyScores: any[], allTimeScores: any[]) => {
      // console.log(`[useGameLogicA] setScoresAndShow called.`);
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
       // console.log(`[useGameLogicA] Leaderboards set and ready.`);
      FirebaseAnalytics.leaderboard('summary_loaded');
    },
    [setLeaderboards, setLeaderboardsReady]
  );

  const endGame = useCallback(async () => {
    if (isGameOver) {
       // console.log(`[useGameLogicA] endGame called but already game over.`);
      return;
    }

    // console.log("[useGameLogicA] --- GAME OVER ---");
    setIsGameOver(true);
    setIsCountdownActive(false);
    setIsLevelPaused(true);
    playGameOverSound();
    setLeaderboardsReady(false);
     // console.log(`[useGameLogicA] endGame: Set isGameOver=true, isLevelPaused=true, isCountdownActive=false.`);

    trackGameOver(
      user.points,
      user.level,
      user.totalEventsCompleted,
      user.maxStreak,
      user.points > highScore
    );

    finalizeCurrentLevelHistory(currentLevelEvents);

     // console.log(`[useGameLogicA] endGame: Scheduling potential game over ad.`);
    setTimeout(() => {
      if (canShowAd()) {
        // console.log(`[useGameLogicA] endGame: Showing game over ad.`);
         setPendingAdDisplay('gameOver');
         showGameOverInterstitial();
      } else {
         // console.log(`[useGameLogicA] endGame: Not showing game over ad (canShowAd is false).`);
      }
    }, 1500);

    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser?.id) {
        // console.log("[useGameLogicA] Game Over - User not logged in or auth error:", authError?.message);
        const guestScores = {
          daily: [{ name: user.name || 'Voyageur', score: user.points, rank: 1 }],
          monthly: [{ name: '👑 Meilleur score', score: highScore || user.points, rank: 1 }],
          allTime: [{ name: '🏆 Record', score: highScore || user.points, rank: 1 }],
        };
        setLeaderboards(guestScores);
        setLeaderboardsReady(true);
         // console.log("[useGameLogicA] Game Over - Set guest leaderboards.");
        return;
      }

      const userId = authUser.id;
      const currentDisplayName = user.name || 'Joueur';

      // console.log(`[useGameLogicA] Game Over - User ${userId} logged in. Score: ${user.points}`);

      const { error: insertError } = await supabase.from('game_scores').insert({
        user_id: userId,
        display_name: currentDisplayName,
        score: user.points,
      });
      if (insertError) {
        FirebaseAnalytics.error('score_insert_error', insertError.message, 'endGame');
        // console.error("[useGameLogicA] Error inserting game score:", insertError.message);
      } else {
         // console.log("[useGameLogicA] Game score inserted successfully.");
      }

      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('high_score')
        .eq('id', userId)
        .single();

      if (profileError) {
        FirebaseAnalytics.error('profile_fetch_error', profileError.message, 'endGame');
         // console.error("[useGameLogicA] Error fetching profile:", profileError.message);
      } else if (currentProfile && user.points > (currentProfile.high_score || 0)) {
         // console.log(`[useGameLogicA] New high score! ${user.points} > ${currentProfile.high_score || 0}`);
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ high_score: user.points })
          .eq('id', userId);

        if (updateError) {
          FirebaseAnalytics.error('profile_update_error', updateError.message, 'endGame');
          // console.error("[useGameLogicA] Error updating high score:", updateError.message);
        } else {
          // console.log("[useGameLogicA] High score updated successfully.");
          FirebaseAnalytics.logEvent('new_high_score', {
            score: user.points,
            previous_high_score: currentProfile.high_score || 0,
          });
        }
      }

      const today = new Date().toISOString().split('T')[0];
      const firstDayOfMonth = `${today.substring(0, 7)}-01`;

      // console.log("[useGameLogicA] Fetching leaderboards...");
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

      // console.log("[useGameLogicA] Leaderboards fetched:", { daily: dailyRes.data?.length, monthly: monthlyRes.data?.length, allTime: allTimeRes.data?.length });

      setScoresAndShow(dailyRes.data || [], monthlyRes.data || [], allTimeRes.data || []);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown endGame processing error';
      FirebaseAnalytics.error('endgame_processing_error', errorMessage, 'endGame');
      // console.error("[useGameLogicA] Error during endGame processing:", errorMessage);

      const fallbackScores = {
        daily: [{ name: user.name || 'Voyageur', score: user.points, rank: 1 }],
        monthly: [{ name: '👑 Meilleur score', score: highScore || user.points, rank: 1 }],
        allTime: [{ name: '🏆 Record', score: highScore || user.points, rank: 1 }]
      };
      setLeaderboards(fallbackScores);
      setLeaderboardsReady(true);
       // console.log("[useGameLogicA] Game Over - Set fallback leaderboards due to error.");
    }
  }, [
    isGameOver, user.points, user.level, user.totalEventsCompleted, user.maxStreak, user.name, highScore, playGameOverSound, trackGameOver, finalizeCurrentLevelHistory, currentLevelEvents, canShowAd, showGameOverInterstitial, setScoresAndShow, setIsGameOver, setIsCountdownActive, setIsLevelPaused, setLeaderboardsReady, setPendingAdDisplay, setLevelsHistory
  ]);

  const handleLevelUp = useCallback(() => {
    const currentLevelState = user.level;
    const currentPointsState = user.points;
    const referenceEvent = previousEvent;

    // console.log(`[useGameLogicA] handleLevelUp called. Current Level: ${currentLevelState}, Ref Event: ${referenceEvent?.id}`);

    if (!referenceEvent) {
      setError('Erreur interne critique: impossible de démarrer le niveau suivant (référence manquante).');
      FirebaseAnalytics.error('levelup_null_prev_event', 'previousEvent was null when handleLevelUp called', 'handleLevelUp');
      setIsGameOver(true);
      // console.error('[useGameLogicA] handleLevelUp: CRITICAL - previousEvent is null. Ending game.');
      return;
    }

    const nextConfig = LEVEL_CONFIGS[currentLevelState];
    if (!nextConfig) {
      setError('Félicitations ! Vous avez terminé tous les niveaux disponibles !');
      FirebaseAnalytics.error('config_missing_on_levelup', `Level ${currentLevelState} config missing`, 'handleLevelUp');
      // console.log(`[useGameLogicA] handleLevelUp: No config found for level ${currentLevelState}. Ending game.`);
      endGame();
      return;
    }

    // console.log(`[useGameLogicA] Handling Level Up to Level ${currentLevelState}`);

    // console.log(`[useGameLogicA] handleLevelUp: Setting showLevelModal to false.`);
    setShowLevelModal(false);

    // console.log(`[useGameLogicA] handleLevelUp: Resetting states - Timer, Events, Waiting, Dates, Correct, ImageLoaded, DisplayedEvent`);
    resetTimer(20);
    resetLevelCompletedEvents();
    setIsWaitingForCountdown(false);
    setShowDates(false);
    setIsCorrect(undefined);
    setIsImageLoaded(false);
    setDisplayedEvent(null);

    trackLevelStarted(
      currentLevelState,
      nextConfig.name || `Niveau ${currentLevelState}`,
      nextConfig.eventsNeeded,
      currentPointsState
    );

    if (pendingAdDisplay === 'levelUp' && canShowAd()) {
       // console.log("[useGameLogicA] handleLevelUp: Showing Level Up Interstitial Ad...");
      showLevelUpInterstitial();
    }
    // console.log(`[useGameLogicA] handleLevelUp: Clearing pendingAdDisplay (${pendingAdDisplay}).`);
    setPendingAdDisplay(null);

    // console.log("[useGameLogicA] handleLevelUp: Calling selectNewEvent...");
    selectNewEvent(allEvents, referenceEvent)
      .then((selectedEvent) => {
        // console.log(`[useGameLogicA] handleLevelUp: selectNewEvent completed. Selected: ${selectedEvent?.id}, isGameOver: ${isGameOver}`);

        if (selectedEvent && !isGameOver) {
           // console.log("[useGameLogicA] handleLevelUp .then(): New event selected and game not over. Setting isLevelPaused to false.");
           setIsLevelPaused(false);
        } else if (!isGameOver) {
          setError('Impossible de trouver un événement valide pour continuer le jeu après la montée de niveau.');
          setIsGameOver(true);
          FirebaseAnalytics.error('select_event_null_levelup', 'selectNewEvent returned null unexpectedly after level up', 'handleLevelUp');
          // console.error("[useGameLogicA] handleLevelUp .then(): Failed to select a new event, but game was not over. Ending game.");
        } else {
            // console.log("[useGameLogicA] handleLevelUp .then(): Game is already over, not unpausing.");
        }
      })
      .catch((err) => {
        setError(`Erreur critique lors du chargement du niveau suivant: ${err.message}`);
        FirebaseAnalytics.error('select_event_error_levelup', err instanceof Error ? err.message : 'Unknown', 'handleLevelUp');
        setIsGameOver(true);
        // console.error("[useGameLogicA] handleLevelUp .catch(): Critical error during selectNewEvent:", err);
      });

    // console.log("[useGameLogicA] handleLevelUp: Function execution finished (selectNewEvent is async). isLevelPaused is still potentially true here.");

  }, [
    user.level, user.points, previousEvent, pendingAdDisplay, canShowAd, showLevelUpInterstitial, allEvents, selectNewEvent, resetTimer, resetLevelCompletedEvents, trackLevelStarted, setDisplayedEvent, setError, setIsGameOver, endGame, setShowLevelModal, setIsLevelPaused, setIsWaitingForCountdown, setShowDates, setIsCorrect, setIsImageLoaded, setPendingAdDisplay, isGameOver // Added isGameOver dependency
  ]);


  useEffect(() => {
    // console.log("[useGameLogicA] Initializing game via useEffect...");
    initGame();
    trackGameStarted();
  }, [initGame, trackGameStarted]);

  useEffect(() => {
    // console.log(`[useGameLogicA] State change monitored: isLevelPaused = ${isLevelPaused}`);
  }, [isLevelPaused]);

  useEffect(() => {
    // console.log(`[useGameLogicA] State change monitored: showLevelModal = ${showLevelModal}`);
  }, [showLevelModal]);

 // Dans hooks/useGameLogicA.ts
// Modifiez la section return à la fin de la fonction (vers la ligne ~1630):

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
  initGame,
  completeRewardAnimation,
  updateRewardPosition,
  remainingEvents: allEvents ? allEvents.length - usedEvents.size : 0,
  progressAnim,
  onImageLoad: handleImageLoad,
  levelCompletedEvents,
  levelsHistory,
  resetAdsState, // Ajoutez cette ligne ici (au niveau racine, pas dans adState)
  adState: {
    hasRewardedAd: adState.rewardedLoaded,
    hasWatchedRewardedAd: adState.hasWatchedRewardedAd,
    // isAdFreePeriod: adState.isAdFreePeriod,
  }
};
}

export default useGameLogicA;