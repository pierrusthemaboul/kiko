// hooks/useGameLogicA.ts
// Version corrigée - Focus sur le problème setPendingAdDisplay

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

// Hooks importés depuis le dossier game/
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

// Constante globale
const screenWidth = Dimensions.get('window').width;

export function useGameLogicA(initialEvent?: string) {
  // ===== États internes =====
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
  
  // État pour les publicités
  const [pendingAdDisplay, setPendingAdDisplay] = useState<"interstitial" | "rewarded" | "gameOver" | "levelUp" | null>(null);
  
  // Animation
  const [progressAnim] = useState(() => new Animated.Value(0));

  // ===== Utilisation des sous-hooks =====
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

  // Performance et scoring
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

  // Audio
  const {
    playCorrectSound,
    playIncorrectSound,
    playLevelUpSound,
    playCountdownSound,
    playGameOverSound,
  } = useAudio();

  // Analytics
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

  // Gestion du timeout
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
      setError('Erreur interne: impossible de charger l\'événement suivant.'); 
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

  // Timer
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
        setUsedEvents((prev) => new Set([...prev, selectedEvent.id]));
        
        setNewEvent(selectedEvent);
        setDisplayedEvent(selectedEvent);
        
        setIsImageLoaded(false);
        setShowDates(false);
        setIsCorrect(undefined);
        setIsCountdownActive(false);
        
        setTimeLeft(20);
        
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
      updateAntiqueCount
    ]
  );

  // Sélecteur d'événements
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

  // Wrapper pour selectNewEvent qui intègre les états locaux
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
              ? Math.min(prev.lives + 1, MAX_LIVES)
              : prev.lives;
              
          return { ...prev, points: updatedPoints, lives: updatedLives };
        });
      } catch (err) {
        FirebaseAnalytics.error('apply_reward_error', err instanceof Error ? err.message : 'Unknown', 'applyReward');
      }
    },
    [setUser]
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

  // IMPORTANT: Cette partie est cruciale pour corriger le problème
  // Nous allons maintenant passer explicitement pendingAdDisplay et setPendingAdDisplay
  // au hook useAds
  const {
    adState,
    canShowAd,
    showRewardedAd,
    showGenericInterstitial,
    showLevelUpInterstitial,
    showGameOverInterstitial,
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
    pendingAdDisplay,           // Passé explicitement
    setPendingAdDisplay,        // Passé explicitement
  });

  // Effet pour démarrer le compte à rebours automatiquement quand
  // l'image est chargée et que le jeu n'est pas en pause
  useEffect(() => {
    if (isImageLoaded && !isLevelPaused && !isGameOver && !isCountdownActive) {
      setIsCountdownActive(true);
    }
  }, [isImageLoaded, isLevelPaused, isGameOver, isCountdownActive]);

  const finalizeCurrentLevelHistory = useCallback(
    (eventsToFinalize: LevelEventSummary[]) => {
      if (!eventsToFinalize.length) {
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
      
      const responseTime = 20 - timeLeft;
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
            finalizeCurrentLevelHistory(levelCompletedEvents);
            
            updated.level += 1;
            updated.eventsCompletedInLevel = 0;
            
            setCurrentLevelConfig({ ...LEVEL_CONFIGS[updated.level], eventsSummary: [] });
            resetCurrentLevelEvents();
            resetAntiqueCount();
            
            setShowLevelModal(true);
            setIsLevelPaused(true);
            playLevelUpSound();
            
            if ([1, 6].includes(prev.level) || prev.level % 5 === 0) {
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
            }, 750);
          }

          return updated;
        });
      } else {
        playIncorrectSound();
        setStreak(0);
        
        Animated.timing(progressAnim, { 
          toValue: 0, 
          duration: 300, 
          useNativeDriver: false 
        }).start();
        
        addEventToLevel(eventSummaryItem);
        
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
        
        if (user.lives <= 1) {
          setTimeout(() => {
            if (!isGameOver) endGame();
          }, 500);
        } else {
          setTimeout(() => {
            setIsWaitingForCountdown(false);
            if (!isGameOver && !showLevelModal) {
              selectNewEvent(allEvents, newEvent);
            }
          }, 1500);
        }
      }
    },
    [
      previousEvent,
      newEvent,
      isLevelPaused,
      isGameOver,
      isWaitingForCountdown,
      timeLeft,
      streak,
      user,
      allEvents,
      progressAnim,
      levelCompletedEvents,
      getPeriod,
      calculatePoints,
      checkRewards,
      selectNewEvent,
      finalizeCurrentLevelHistory,
      playCorrectSound,
      playIncorrectSound,
      playLevelUpSound,
      updatePerformanceStats,
      trackQuestion,
      trackStreak,
      trackReward,
      trackLevelCompleted,
      addEventToLevel,
      resetCurrentLevelEvents,
      resetAntiqueCount,
      endGame,
      setPreviousEvent,
      setError,
      setIsCorrect,
      setShowDates,
      setIsWaitingForCountdown,
      setIsCountdownActive,
      setStreak,
    ]
  );

  const setScoresAndShow = useCallback(
    (dailyScores: any[], monthlyScores: any[], allTimeScores: any[]) => {
      const formatScores = (scores: any[], scoreField: string = 'score') =>
        scores.map((s, index) => ({
          name: s.display_name?.trim() || 'Joueur',
          score: s[scoreField] || 0,
          rank: index + 1,
        }));

      const formatted = {
        daily: formatScores(dailyScores, 'score'),
        monthly: formatScores(monthlyScores, 'score'),
        allTime: formatScores(allTimeScores, 'high_score')
      };

      setLeaderboards(formatted);
      setLeaderboardsReady(true);
      
      FirebaseAnalytics.leaderboard('summary');
    },
    [setLeaderboards, setLeaderboardsReady]
  );

  const endGame = useCallback(async () => {
    if (isGameOver) {
      return;
    }

    setIsGameOver(true);
    setIsCountdownActive(false);
    setIsLevelPaused(true);
    playGameOverSound();
    setLeaderboardsReady(false);

    trackGameOver(
      user.points,
      user.level,
      user.totalEventsCompleted,
      user.maxStreak,
      user.points > highScore
    );

    finalizeCurrentLevelHistory(currentLevelEvents);
    
    setTimeout(() => {
      if (canShowAd()) {
        showGameOverInterstitial();
      }
    }, 1500);

    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser?.id) {
        const guestScores = {
          daily: [{ name: user.name || 'Voyageur', score: user.points, rank: 1 }],
          monthly: [{ name: '👑 Meilleur score', score: highScore || user.points, rank: 1 }],
          allTime: [{ name: '🏆 Record', score: highScore || user.points, rank: 1 }],
        };
        setLeaderboards(guestScores);
        setLeaderboardsReady(true);
        return;
      }

      const userId = authUser.id;
      const currentDisplayName = user.name || 'Joueur';

      await supabase.from('game_scores').insert({
        user_id: userId,
        display_name: currentDisplayName,
        score: user.points,
      });

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

    if (dailyRes.error) {
      FirebaseAnalytics.error('leaderboard_fetch_error', `Daily: ${dailyRes.error.message}`, 'endGame');
    }
    if (monthlyRes.error) {
      FirebaseAnalytics.error('leaderboard_fetch_error', `Monthly: ${monthlyRes.error.message}`, 'endGame');
    }
    if (allTimeRes.error) {
      FirebaseAnalytics.error('leaderboard_fetch_error', `AllTime: ${allTimeRes.error.message}`, 'endGame');
    }

    setScoresAndShow(dailyRes.data || [], monthlyRes.data || [], allTimeRes.data || []);

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown endGame processing error';
    FirebaseAnalytics.error('endgame_processing_error', errorMessage, 'endGame');
    
    const fallbackScores = {
      daily: [{ name: user.name || 'Voyageur', score: user.points, rank: 1 }],
      monthly: [{ name: '👑 Meilleur score', score: highScore || user.points, rank: 1 }],
      allTime: [{ name: '🏆 Record', score: highScore || user.points, rank: 1 }]
    };
    setLeaderboards(fallbackScores);
    setLeaderboardsReady(true);
  }
}, [
  isGameOver,
  setIsCountdownActive,
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
]);

const handleLevelUp = useCallback(() => {
  const currentLevelState = user.level;
  const currentPointsState = user.points;
  const referenceEvent = previousEvent;
  
  if (!referenceEvent) {
    setError('Erreur interne critique: impossible de démarrer le niveau suivant (référence manquante).');
    FirebaseAnalytics.error('levelup_null_prev_event', 'previousEvent was null when handleLevelUp called', 'handleLevelUp');
    setIsGameOver(true);
    return;
  }
  
  const nextConfig = LEVEL_CONFIGS[currentLevelState];
  if (!nextConfig) {
    setError('Félicitations ! Vous avez terminé tous les niveaux disponibles !');
    FirebaseAnalytics.error('config_missing_on_levelup', `Level ${currentLevelState} config missing`, 'handleLevelUp');
    endGame();
    return;
  }
  
  setShowLevelModal(false);
  setIsLevelPaused(false);
  setIsCountdownActive(false);
  
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
    showLevelUpInterstitial();
  }
  setPendingAdDisplay(null);
  
  selectNewEvent(allEvents, referenceEvent)
    .then((sel) => {
      if (!sel && !isGameOver) {
        setError('Impossible de trouver un événement valide pour continuer le jeu.');
        setIsGameOver(true);
        FirebaseAnalytics.error('select_event_null_levelup', 'selectNewEvent returned null unexpectedly after level up', 'handleLevelUp');
      }
    })
    .catch((err) => {
      setError(`Erreur critique lors du chargement du niveau suivant: ${err.message}`);
      FirebaseAnalytics.error('select_event_error_levelup', err instanceof Error ? err.message : 'Unknown', 'handleLevelUp');
      setIsGameOver(true);
    });
}, [
  user.level,
  user.points,
  previousEvent,
  pendingAdDisplay,
  canShowAd,
  showLevelUpInterstitial,
  allEvents,
  selectNewEvent,
  resetTimer,
  resetLevelCompletedEvents,
  trackLevelStarted,
  setDisplayedEvent,
  error,
  isGameOver,
  endGame,
]);

// Appel initGame() au montage pour lancer le chargement des données
useEffect(() => {
  initGame();
}, [initGame]);

// Retourne tous les états et fonctions nécessaires aux composants UI
return {
  // États utilisateur et jeu
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

  // Récompenses
  currentReward,

  // Fonctions de jeu principales à exposer aux composants UI
  handleChoice,
  handleLevelUp,
  showRewardedAd,
  initGame,
  completeRewardAnimation,
  updateRewardPosition,

  // Infos diverses
  remainingEvents: allEvents.length - usedEvents.size,

  // Animations et callbacks UI
  progressAnim,
  onImageLoad: handleImageLoad,

  // Données pour affichage spécifique
  levelCompletedEvents,
  levelsHistory,

  // État publicitaire simplifié pour l'UI
  adState: {
    hasRewardedAd: adState.rewardedLoaded,
    hasWatchedRewardedAd: adState.hasWatchedRewardedAd,
    isAdFreePeriod: false, // Ajouté pour compatibilité avec GameContentA
  }
};
}

export default useGameLogicA;