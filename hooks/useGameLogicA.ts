// hooks/useGameLogicA.ts
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions } from 'react-native';
import { supabase } from '@/lib/supabase/supabaseClients';
import { FirebaseAnalytics } from '../lib/firebase';
import { todayWindow } from '../utils/time';
import {
  Event,
  User,
  ExtendedLevelConfig,
  RewardType,
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
  usePlays, // Importer le nouveau hook
} from './game';
import { Logger } from '@/utils/logger';
import { useAppStateDetection } from './game/useAppStateDetection';
import { getGameModeConfig, GameModeConfig } from '../constants/gameModes';
import { applyEndOfRunEconomy } from 'lib/economy/apply';
import { useGuestPlays } from './useGuestPlays';
import { GameSessionMetadataManager } from '../services/GameSessionMetadata';
import { registerDebugCommand } from '../ReactotronConfig';

const screenWidth = Dimensions.get('window').width;

export function useGameLogicA(initialEvent?: string, modeId?: string) {
  if (__DEV__) console.log('[useGameLogicA] Hook executed for mode:', modeId || 'default');
  const gameMode = useMemo<GameModeConfig>(() => getGameModeConfig(modeId), [modeId]);
  const timeLimit = Math.max(1, gameMode.timeLimit);
  const [streak, setStreak] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showDates, setShowDates] = useState(!!gameMode.showDatesByDefault);
  const [isCorrect, setIsCorrect] = useState<boolean | undefined>(undefined);
  const [isWaitingForCountdown, setIsWaitingForCountdown] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [isLevelPaused, setIsLevelPaused] = useState(false);
  const [showLevelTransition, setShowLevelTransition] = useState(false);
  const [triggerLevelEndAnim, setTriggerLevelEndAnim] = useState(false);
  const [leaderboardsReady, setLeaderboardsReady] = useState(false);
  const [leaderboards, setLeaderboards] = useState<{
    daily: any[];
    monthly: any[];
    allTime: any[];
  }>({ daily: [], monthly: [], allTime: [] });
  const [currentLevelConfig, setCurrentLevelConfig] = useState<ExtendedLevelConfig>({
    ...LEVEL_CONFIGS[1],
    eventsSummary: [],
  });

  // 🎬 Gestionnaire de métadonnées temporelles pour Reporters Corp
  const metadataManagerRef = useRef<GameSessionMetadataManager | null>(null);
  const currentTourRef = useRef(0);

  // Utiliser un state au lieu d'une ref pour que useAds puisse réagir aux changements
  const [pendingAdDisplay, setPendingAdDisplayState] = useState<"interstitial" | "rewarded" | "gameOver" | "levelUp" | null>(null);
  // Utiliser une ref pour maintenir une référence stable à la valeur actuelle
  const pendingAdDisplayRef = useRef<"interstitial" | "rewarded" | "gameOver" | "levelUp" | null>(null);

  const setPendingAdDisplay = useCallback((value: "interstitial" | "rewarded" | "gameOver" | "levelUp" | null) => {
    setPendingAdDisplayState(prev => {
      pendingAdDisplayRef.current = value; // Sync ref
      return value;
    });
  }, []); // Pas de dépendances - utilise la forme fonctionnelle de setState

  // Sync ref avec state
  useEffect(() => {
    pendingAdDisplayRef.current = pendingAdDisplay;
  }, [pendingAdDisplay]);

  // ---------- PROFIL UTILISATEUR (affichage pseudo / xp / parties) ----------
  type ProfileLite = {
    id: string;
    display_name: string | null;
    xp_total: number;
    title_key?: string | null;
    parties_per_day: number;
    high_score?: number | null;
    last_reroll_date?: string | null;
    reroll_count?: number;
  };
  const [profile, setProfile] = useState<ProfileLite | null>(null);

  const [progressAnim] = useState(() => new Animated.Value(0));
  const isApplyingEconomyRef = useRef(false);
  const hasConsumedRunInInstanceRef = useRef(false);

  // Refs pour stabiliser les callbacks circulaires et éviter les ReferenceErrors
  const endGameRef = useRef<() => Promise<void>>(async () => { console.warn('endGame called before initialization'); });
  const updateGameStateRef = useRef<(evt: Event) => Promise<void>>(async () => { console.warn('updateGameState called before initialization'); });
  const selectNewEventRef = useRef<any>(async () => { console.warn('selectNewEvent called before initialization'); return null; });
  const handleTimeoutRef = useRef<() => void>(() => { console.warn('handleTimeout called before initialization'); });
  const handleAppBackgroundedRef = useRef<() => void>(() => { console.warn('handleAppBackgrounded called before initialization'); });

  const [endSummary, setEndSummary] = useState<{
    mode: 'classic' | 'date' | 'precision';
    points: number;
    xpEarned: number;
    newXp: number;
    rank: { key: string; label: string; partiesPerDay: number };
    leveledUp: boolean;
  } | null>(null);
  const [endSummaryError, setEndSummaryError] = useState<string | null>(null);
  const currentRunIdRef = useRef<string | null>(null);
  const isStartingRunRef = useRef(false);

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
    handleTimeout: () => handleTimeoutRef.current(),
    isImageLoaded: false,
    initialTime: timeLimit,
  });

  const {
    antiqueEventsCount,
    eventCount,
    forcedJumpEventCount,
    selectNewEvent: baseSelectNewEvent,
    getPeriod,
    isAntiqueEvent,
    updateAntiqueCount,
    resetAntiqueCount,
    resetEventCount,
    invalidateEventCaches,
    recordCorrectAnswer,
    recordIncorrectAnswer,
    resetAntiFrustration,
  } = useEventSelector({
    setError,
    setIsGameOver,
    updateStateCallback: (e) => updateGameStateRef.current(e)
  });

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
    isAdLoaded,
  } = useAds({
    user,
    setUser,
    previousEvent,
    allEvents,
    selectNewEvent: (e: any, r: any) => selectNewEventRef.current(e, r),
    resetTimer,
    setIsGameOver,
    setIsLevelPaused,
    setIsWaitingForCountdown,
    setError,
    pendingAdDisplay: pendingAdDisplay,
    setPendingAdDisplay,
    maxLives: gameMode.maxLives,
  });

  // Détecter la sortie de l'application pendant une partie active
  const isDetectionActive = !isGameOver && !isLevelPaused && !isWaitingForCountdown && !!newEvent && isImageLoaded;
  useAppStateDetection({
    onAppBackgrounded: () => handleAppBackgroundedRef.current(),
    isActive: isDetectionActive,
    currentEventId: newEvent?.id,
    analytics: {
      level: user.level,
      streak,
      context: 'classic_game',
      screen: 'useGameLogicA',
      reason: 'background',
    },
  });

  // Calculer si c'est le dernier événement du niveau
  const isLastEventOfLevel = useMemo(() => {
    const config = LEVEL_CONFIGS[user.level];
    if (!config) return false;
    return user.eventsCompletedInLevel + 1 >= config.eventsNeeded;
  }, [user.level, user.eventsCompletedInLevel]);

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
        .maybeSingle() as any;

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
      try { sub?.subscription?.unsubscribe?.(); } catch { }
    };
  }, [refreshProfile]);

  // Utiliser le nouveau hook pour gérer les parties (utilisateurs connectés)
  const { playsInfo, canStartRun, refreshPlaysInfo } = usePlays();

  // Utiliser le hook pour gérer les parties invité
  const {
    guestPlaysUsed,
    guestPlaysRemaining,
    guestPlaysLimit,
    canStartGuestPlay,
    isLoading: isGuestPlaysLoading,
    incrementGuestPlays,
    grantExtraPlay: grantGuestExtraPlay,
    refreshGuestPlays,
  } = useGuestPlays();

  const baseInitGameWrapper = useCallback(async () => {
    setEndSummary(null);
    setEndSummaryError(null);
    await baseInitGame({ initialLives: gameMode.initialLives });
  }, [baseInitGame, gameMode.initialLives]);


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



  const clearEndSummary = useCallback(() => {
    setEndSummary(null);
    setEndSummaryError(null);
  }, []);

  const handleTimeout = useCallback(() => {
    if (isLevelPaused || isGameOver) {
      return;
    }
    setIsWaitingForCountdown(false);

    FirebaseAnalytics.trackEvent('timeout', {
      level: user.level,
      events_completed_in_level: user.eventsCompletedInLevel,
      current_streak: streak,
    });

    playIncorrectSound();
    recordIncorrectAnswer(); // Anti-frustration : tracker l'erreur
    setStreak(0);

    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();

    setUser((prev) => {
      const newLives = prev.lives - 1;
      FirebaseAnalytics.trackEvent('life_lost', {
        reason: 'timeout',
        remaining_lives: newLives,
        level: prev.level,
        event_id: newEvent?.id || 'unknown',
        context: 'classic_game',
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
          selectNewEventRef.current(allEvents, newEvent);
        }
      }, 1500);
    } else {
      setError('Erreur interne: impossible de charger l\'événement suivant après timeout.');
      setIsGameOver(true);
      FirebaseAnalytics.trackError('timeout_null_event', {
        message: 'newEvent was null in handleTimeout',
        screen: 'handleTimeout',
      });
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
    setIsWaitingForCountdown,
  ]);

  handleTimeoutRef.current = handleTimeout;

  // Callback pour gérer la sortie de l'application (même comportement qu'un timeout)
  const handleAppBackgrounded = useCallback(() => {
    if (isLevelPaused || isGameOver || isWaitingForCountdown) {
      return;
    }

    playIncorrectSound();
    recordIncorrectAnswer(); // Anti-frustration : tracker l'erreur
    setStreak(0);

    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start();

    setUser((prev) => {
      const newLives = prev.lives - 1;
      FirebaseAnalytics.trackEvent('life_lost', {
        reason: 'app_backgrounded',
        remaining_lives: newLives,
        level: prev.level,
        event_id: newEvent?.id || 'unknown',
        context: 'classic_game',
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
          selectNewEventRef.current(allEvents, newEvent);
        }
      }, 1500);
    } else {
      setError('Erreur interne: impossible de charger l\'événement suivant.');
      setIsGameOver(true);
      FirebaseAnalytics.trackError('app_backgrounded_null_event', {
        message: 'newEvent was null in handleAppBackgrounded',
        screen: 'handleAppBackgrounded',
      });
    }
  }, [
    isLevelPaused,
    isGameOver,
    isWaitingForCountdown,
    user.level,
    user.lives,
    streak,
    newEvent,
    allEvents,
    playIncorrectSound,
    progressAnim,
    setPreviousEvent,
    setDisplayedEvent,
    setError,
    setIsGameOver,
    setIsCorrect,
    setShowDates,
    setUser,
    setStreak,
  ]);

  handleAppBackgroundedRef.current = handleAppBackgrounded;



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

        // 🎬 Enregistrer l'apparition du nouvel événement avec timecode
        // Note: on ne passe pas previousEvent car c'est géré dans handleChoice
        if (metadataManagerRef.current) {
          currentTourRef.current += 1;
          metadataManagerRef.current.onEventAppear(
            currentTourRef.current,
            selectedEvent,
            null // La référence sera capturée dans handleChoice
          );
        }

        // Synchroniser l'usage de l'événement dans la DB
        try {
          const { data: evtData } = await (supabase
            .from('evenements')
            .select('frequency_score')
            .eq('id', selectedEvent.id)
            .single() as any);

          const newScore = (evtData?.frequency_score ?? 0) + 1;

          await (supabase.from('evenements') as any)
            .update({
              frequency_score: newScore,
              last_used: new Date().toISOString()
            })
            .eq('id', selectedEvent.id);

          Logger.debug('GameLogic', `Synced usage for event: ${selectedEvent.titre}`, { newScore });
        } catch (syncErr) {
          Logger.warn('GameLogic', 'Failed to sync event usage to DB', syncErr);
        }

        markEventUsageLocal(selectedEvent.id);
        invalidateEventCaches(selectedEvent.id);

        if (selectedEvent && isAntiqueEvent(selectedEvent)) {
          updateAntiqueCount(selectedEvent);
        }
      } catch (err) {
        FirebaseAnalytics.trackError('update_game_state_error', {
          message: err instanceof Error ? err.message : 'Unknown',
          screen: 'updateGameState',
        });
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
      timeLimit,
    ]
  );

  updateGameStateRef.current = updateGameState;




  const selectNewEvent = useCallback(
    async (events: Event[], referenceEvent: Event | null, currentStreak?: number): Promise<Event | null> => {
      // Logger.debug('GameLogic', 'Selecting new event', { 
      //   level: user.level, 
      //   usedCount: usedEvents.size, 
      //   streak: currentStreak ?? streak 
      // });

      const result = await baseSelectNewEvent(
        events,
        referenceEvent,
        user.level,
        usedEvents,
        currentStreak ?? streak
      );

      if (result) {
        // Logger.info('GameLogic', 'Event selected', { id: result.id, title: result.titre });
      } else {
        Logger.warn('GameLogic', 'No event selected (returned null)');
      }

      return result;
    },
    [baseSelectNewEvent, user.level, usedEvents, streak]
  );

  selectNewEventRef.current = selectNewEvent;

  // Wrapper initGame qui réinitialise aussi le système anti-frustration et le compteur d'événements
  const startNewGame = useCallback(async () => {
    resetAntiFrustration();
    resetEventCount(); // Réinitialiser le compteur pour les sauts temporels
    await baseInitGame();
    // 🎬 Initialiser les métadonnées (utilise les valeurs courantes via closure)
    currentTourRef.current = 0;
    metadataManagerRef.current = new GameSessionMetadataManager(
      gameMode.label || 'Classique',
      'Joueur',
      1,
      0,
      gameMode.initialLives
    );
    console.log('[useGameLogicA] 🎬 Gestionnaire de métadonnées initialisé');
  }, [baseInitGameWrapper, resetAntiFrustration, resetEventCount, gameMode.label, gameMode.initialLives]);

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

          FirebaseAnalytics.trackEvent('reward_applied', {
            reward_type: reward.type,
            reward_amount: safeAmount,
            new_points: updatedPoints,
            new_lives: updatedLives,
            level: prev.level,
          });
          return { ...prev, points: updatedPoints, lives: updatedLives };
        });
      } catch (err) {
        FirebaseAnalytics.trackError('apply_reward_error', {
          message: err instanceof Error ? err.message : 'Unknown',
          screen: 'applyReward',
        });
        setError("Erreur lors de l'application de la récompense.");
      }
    },
    [setUser, setError, gameMode.maxLives]
  );



  // --- REPLACÉ ICI : Fonction pour réinitialiser l'état de contrôle du jeu ---
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
    setTriggerLevelEndAnim(false); // Réinitialiser l'animation de fin de niveau
    setError(null); // Nettoyer les erreurs précédentes
    setEndSummary(null);
    setEndSummaryError(null);
    // Réinitialiser aussi l'état des sous-hooks si nécessaire
    resetCurrentLevelEvents(); // Réinitialise les events du niveau en cours
    resetLevelCompletedEvents(); // Réinitialise les events du niveau complété
    resetAntiqueCount(); // Réinitialise le compteur d'events antiques
    // Note: resetAntiFrustration et resetEventCount sont appelés dans initGame
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
        FirebaseAnalytics.trackError('invalid_event_date', {
          message: `p=${previousEvent.date}, n=${newEvent.date}`,
          screen: 'handleChoice',
        });
        setIsWaitingForCountdown(false);
        return;
      }

      const isNewBefore = newDate < prevDate;
      const isAnswerCorrect = (choice === 'avant' && isNewBefore) || (choice === 'après' && !isNewBefore);

      // 🎬 Enregistrer le choix du joueur avec timecode
      if (metadataManagerRef.current) {
        metadataManagerRef.current.onPlayerChoice(
          currentTourRef.current,
          choice,
          isAnswerCorrect
        );
      }

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
        playCorrectSound();
        recordCorrectAnswer(); // Anti-frustration : réinitialiser le compteur d'erreurs
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

        // Vérifier si c'est un événement bonus
        const isBonusEvent = (newEvent as any)?._isBonusEvent === true;
        const bonusMultiplier = isBonusEvent ? 1.5 : 1.0;

        const pointsEarned = Math.max(10, Math.round(basePoints * gameMode.scoreMultiplier * bonusMultiplier));

        if (isBonusEvent) {

        }

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

            const completedLevel = prev.level;
            const newLevel = updated.level;
            const isDevAndLevel1 = __DEV__ && completedLevel === 1;
            const shouldShowAd = (completedLevel === 1 || completedLevel % 5 === 0) && !isDevAndLevel1;

            // Séquence de timing pour la fin de niveau:
            // 0s: Animation de validation (triggerLevelEndAnim)
            // 800ms: Modal/Pub apparaît

            // --- AJOUT : Récompense de fin de niveau ---
            // On utilise prev.level + 1 car le niveau vient d'être incrémenté dans updated.level
            // Mais checkRewards utilise le niveau passé en paramètre pour chercher la config.
            // Si on vient de finir le niveau 1, on passe au niveau 2.
            // On veut donner la récompense associée à l'atteinte du niveau 2 (ou fin du 1).
            // La logique dans useRewards.ts utilise LEVEL_CONFIGS[newLevel].
            checkRewards({ type: 'level', value: newLevel }, updated);
            // -------------------------------------------


            setTriggerLevelEndAnim(true);

            // 2. Attendre 1500ms (temps de l'animation de validation allongée)
            setTimeout(() => {


              // Maintenant on peut pauser
              setIsLevelPaused(true);

              setShowLevelModal(true);
              playLevelUpSound();

              // DÉCLENCHEMENT DE LA PUB ICI, après l'animation
              if (shouldShowAd) {

                setPendingAdDisplay('levelUp');
                FirebaseAnalytics.ad('interstitial', 'triggered', 'level_up', newLevel);
              }
            }, 1500);
          } else {
            setTimeout(() => {
              setIsWaitingForCountdown(false);
              if (!isGameOver && !showLevelModal) {
                selectNewEventRef.current(allEvents, newEvent);
              }
            }, 750);
          }

          return updated;
        });
      } else { // Incorrect Answer
        playIncorrectSound();
        recordIncorrectAnswer(); // Anti-frustration : tracker l'erreur
        setStreak(0);

        Animated.timing(progressAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false
        }).start();

        addEventToLevel(eventSummaryItem); // Still add the incorrect event to the level summary

        setUser((prev) => {
          const newLives = prev.lives - 1;
          FirebaseAnalytics.trackEvent('life_lost', {
            reason: 'incorrect_answer',
            remaining_lives: newLives,
            level: prev.level,
            event_id: newEvent.id,
            context: 'classic_game',
          });

          return newLives <= 0
            ? { ...prev, lives: 0, streak: 0 }
            : { ...prev, lives: newLives, streak: 0 };
        });

        if (user.lives <= 1) { // Check if *about* to be game over
          setTimeout(() => {
            // Re-check isGameOver in case something else ended the game during the delay
            if (!isGameOver) endGameRef.current();
          }, 500); // Short delay before game over screen
        } else {
          setTimeout(() => {
            setIsWaitingForCountdown(false);
            if (!isGameOver && !showLevelModal) {
              selectNewEventRef.current(allEvents, newEvent);
            }
          }, 1500); // Longer delay for incorrect answers
        }
      }
    },
    [
      previousEvent, newEvent, isLevelPaused, isGameOver, isWaitingForCountdown, timeLeft, streak, user, allEvents, progressAnim, levelCompletedEvents, getPeriod, calculatePoints, checkRewards, finalizeCurrentLevelHistory, playCorrectSound, playIncorrectSound, playLevelUpSound, updatePerformanceStats, trackQuestion, trackStreak, trackReward, trackLevelCompleted, addEventToLevel, resetCurrentLevelEvents, resetAntiqueCount, setPreviousEvent, setError, setIsCorrect, setShowDates, setIsWaitingForCountdown, setIsCountdownActive, setStreak, setUser, setLevelsHistory, setCurrentLevelConfig, setShowLevelModal, setIsLevelPaused, setPendingAdDisplay, gameMode.scoreMultiplier, timeLimit
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
    reason: 'NO_PLAYS_LEFT' | 'DB_ERROR' | 'AUTH_REQUIRED' | 'UNKNOWN' | 'ALREADY_STARTING';
    message: string;
  };

  const startRun = useCallback(
    async (mode: 'classic' | 'date' | 'precision'): Promise<StartRunSuccess | StartRunFailure> => {
      try {
        currentRunIdRef.current = null;

        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser();

        // === MODE INVITÉ ===
        if (authError || !authUser?.id) {
          // Rafraîchir les infos invité
          await refreshGuestPlays();

          // Vérifier la limite
          if (!canStartGuestPlay) {
            return {
              ok: false,
              reason: 'NO_PLAYS_LEFT',
              message: `Plus de parties disponibles aujourd'hui. Créez un compte pour débloquer jusqu'à 8 parties par jour !`
            };
          }

          // Incrémenter le compteur
          const incremented = await incrementGuestPlays();
          if (!incremented) {
            return {
              ok: false,
              reason: 'NO_PLAYS_LEFT',
              message: `Impossible de démarrer la partie.`
            };
          }

          // Retourner un succès sans runId (mode invité)
          currentRunIdRef.current = null;
          return {
            ok: true,
            runId: 'guest-mode',
            window: todayWindow(),
            allowed: guestPlaysLimit,
            used: guestPlaysUsed + 1,
          };
        }

        if (isStartingRunRef.current) {
          Logger.warn('Plays', '[startRun] Already starting a run, ignoring duplicate call');
          if (__DEV__ && (console as any).tron) {
            (console as any).tron.log('[startRun] Démarrage déjà en cours, appel ignoré');
          }
          return { ok: false, reason: 'ALREADY_STARTING', message: 'Démarrage déjà en cours' };
        }
        isStartingRunRef.current = true;

        if (hasConsumedRunInInstanceRef.current && (mode === 'classic' || mode === 'date' || mode === 'precision')) {
          Logger.info('Plays', '[startRun] Run already consumed for this component instance, skipping DB record');
          return {
            ok: true,
            runId: currentRunIdRef.current || 'already-started',
            window: todayWindow(),
            allowed: playsInfo?.allowed ?? 3,
            used: playsInfo?.used ?? 0
          };
        }

        const freshPlays = await refreshPlaysInfo();
        const canStartActually = freshPlays?.remaining ? freshPlays.remaining > 0 : canStartRun;

        if (__DEV__ && (console as any).tron) {
          (console as any).tron.display({
            name: '🚀 START RUN ATTEMPT',
            preview: `Mode: ${mode}`,
            value: { freshPlays, canStartActually, timestamp: new Date().toISOString() },
            important: true
          });
        }

        // La vérification se fait maintenant sur la valeur fraîche
        if (!canStartActually) {
          Logger.warn('Plays', '[startRun] Blocked: No plays left', { remaining: freshPlays?.remaining });
          isStartingRunRef.current = false;
          return { ok: false, reason: 'NO_PLAYS_LEFT', message: "Plus de parties disponibles aujourd'hui." };
        }

        Logger.info('Plays', '[startRun] Allowed: Starting run creation', { remaining: freshPlays?.remaining });

        const { data: profile, error: profileError } = await (supabase
          .from('profiles')
          .select('id, parties_per_day')
          .eq('id', authUser.id)
          .maybeSingle() as any);

        if (profileError) {
          isStartingRunRef.current = false;
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
          isStartingRunRef.current = false;
          currentRunIdRef.current = null;
          return {
            ok: false,
            reason: 'DB_ERROR',
            message: runsCountError.message || 'Erreur de vérification des parties.'
          };
        }

        const used = runsToday ?? 0;
        const insertPayload: any = { user_id: authUser.id, mode, points: 0 };

        const { data: inserted, error: insertError } = await (supabase
          .from('runs')
          .insert(insertPayload)
          .select('id, created_at')
          .single() as any);

        if (insertError || !inserted) {
          isStartingRunRef.current = false;
          currentRunIdRef.current = null;
          return {
            ok: false,
            reason: 'DB_ERROR',
            message: insertError?.message || 'Insert failed (runs).'
          };
        }

        const insertedRun = inserted as any;
        Logger.info('Plays', `[startRun] Run successfully created in DB with ID: ${insertedRun.id}`);

        hasConsumedRunInInstanceRef.current = true;
        await refreshPlaysInfo();
        currentRunIdRef.current = insertedRun.id;

        isStartingRunRef.current = false;
        return {
          ok: true,
          runId: insertedRun.id,
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
    [refreshPlaysInfo, canStartRun, refreshGuestPlays, canStartGuestPlay, incrementGuestPlays, guestPlaysLimit, guestPlaysUsed],
  );

  const endGame = useCallback(async () => {
    if (isGameOver) {
      return;
    }

    const runIdForThisEndGame = currentRunIdRef.current; // Capture the runId at the moment endGame starts
    setIsGameOver(true);
    setIsCountdownActive(false);
    setIsLevelPaused(true); // Pause the game logic
    playGameOverSound();
    setLeaderboardsReady(false);

    // 🎬 Terminer la session et exporter les métadonnées
    if (metadataManagerRef.current) {
      try {
        const finalMetadata = metadataManagerRef.current.endSession(
          user.lives > 0 ? 'victoire' : 'defaite',
          user.level,
          user.points,
          user.lives
        );

        // Exporter en JSON et TXT
        await metadataManagerRef.current.exportToJSON();
        await metadataManagerRef.current.exportToText();

        console.log('[useGameLogicA] 💾 Métadonnées exportées:', finalMetadata.session_id);
      } catch (metadataError) {
        console.error('[useGameLogicA] ❌ Erreur export métadonnées:', metadataError);
      }
    }

    trackGameOver(
      user.points,
      user.level,
      user.totalEventsCompleted,
      user.maxStreak,
      user.points > highScore
    );

    finalizeCurrentLevelHistory(currentLevelEvents); // Finalize history with events from the last, incomplete level

    setTimeout(() => {
      if (canShowAd('gameOver')) {
        setPendingAdDisplay('gameOver');
      }
    }, 1500); // Delay ad trigger slightly


    try {
      // Vérifier si l'utilisateur est connecté via le profil déjà chargé
      const userId = profile?.id;

      if (!userId) {
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
      const currentDisplayName = user.name || 'Joueur'; // Use fetched name or default
      const finalPoints = user.points;
      const economyMode: 'classic' | 'date' | 'precision' = gameMode.variant === 'precision' ? 'precision' : 'classic';
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

          const summary = await applyEndOfRunEconomy({
            runId,
            userId,
            mode: economyMode,
            points: finalPoints,
            gameStats,
          });

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
          setEndSummaryError(
            economyError instanceof Error ? economyError.message : String(economyError),
          );
          currentRunIdRef.current = null;
        } finally {
          isApplyingEconomyRef.current = false;
        }
      }

      // 1. Insert current game score
      const { error: insertError } = await ((supabase as any).from('game_scores').insert({
        user_id: userId,
        display_name: currentDisplayName,
        score: user.points,
        mode: economyMode,
      }));
      if (insertError) {
        FirebaseAnalytics.trackError('score_insert_error', {
          message: insertError.message,
          screen: 'endGame',
        });
      }

      // 2. Check and update high score in profiles table
      const { data: currentProfile, error: profileError } = await ((supabase as any)
        .from('profiles')
        .select('high_score')
        .eq('id', userId)
        .single());

      if (profileError) {
        FirebaseAnalytics.trackError('profile_fetch_error', {
          message: profileError.message,
          screen: 'endGame',
        });
      } else if (currentProfile && user.points > (currentProfile.high_score || 0)) {
        const { error: updateError } = await ((supabase as any)
          .from('profiles')
          .update({ high_score: user.points })
          .eq('id', userId));

        if (updateError) {
          FirebaseAnalytics.trackError('profile_update_error', {
            message: updateError.message,
            screen: 'endGame',
          });
        } else {
          FirebaseAnalytics.trackEvent('new_high_score', {
            score: user.points,
            previous_high_score: currentProfile.high_score || 0,
            mode: economyMode,
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

      if (dailyRes.error) {
        FirebaseAnalytics.trackError('leaderboard_fetch_error', {
          message: `Daily: ${dailyRes.error.message}`,
          screen: 'endGame',
          severity: 'warning',
        });
      }
      if (monthlyRes.error) {
        FirebaseAnalytics.trackError('leaderboard_fetch_error', {
          message: `Monthly: ${monthlyRes.error.message}`,
          screen: 'endGame',
          severity: 'warning',
        });
      }
      if (allTimeRes.error) {
        FirebaseAnalytics.trackError('leaderboard_fetch_error', {
          message: `AllTime: ${allTimeRes.error.message}`,
          screen: 'endGame',
          severity: 'warning',
        });
      }

      setScoresAndShow(dailyRes.data || [], monthlyRes.data || [], allTimeRes.data || []);

      if (pendingAdDisplay === 'gameOver') {
        showGameOverInterstitial(); // Show ad now after fetching scores
        setPendingAdDisplay(null);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown endGame processing error';
      FirebaseAnalytics.trackError('endgame_processing_error', {
        message: errorMessage,
        screen: 'endGame',
      });

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
    gameMode.variant,
    setEndSummary,
    setEndSummaryError,
    pendingAdDisplay,
    profile?.id,
  ]);


  const handleLevelUp = useCallback(() => {
    const currentLevelState = user.level;
    const currentPointsState = user.points;
    const referenceEvent = previousEvent;

    if (!referenceEvent) {

      setError('Erreur interne critique: impossible de démarrer le niveau suivant (référence manquante).');
      FirebaseAnalytics.trackError('levelup_null_prev_event', {
        message: 'previousEvent was null when handleLevelUp called',
        screen: 'handleLevelUp',
      });
      setIsGameOver(true);
      return;
    }

    const nextConfig = LEVEL_CONFIGS[currentLevelState];
    if (!nextConfig) {
      setError('Félicitations ! Vous avez terminé tous les niveaux disponibles !');
      FirebaseAnalytics.trackError('config_missing_on_levelup', {
        message: `Level ${currentLevelState} config missing`,
        screen: 'handleLevelUp',
      });
      endGame();
      return;
    }

    setShowLevelModal(false);
    resetTimer(timeLimit);
    setIsWaitingForCountdown(false);
    setShowDates(false);
    setIsCorrect(undefined);
    setIsImageLoaded(false);
    setTriggerLevelEndAnim(false);
    setDisplayedEvent(null);

    trackLevelStarted(
      currentLevelState,
      nextConfig.name || `Niveau ${currentLevelState}`,
      nextConfig.eventsNeeded,
      currentPointsState
    );

    const currentPendingAd = pendingAdDisplayRef.current;
    if (currentPendingAd === 'levelUp' && canShowAd('levelUp')) {
      showLevelUpInterstitial();
    } else {
      setPendingAdDisplay(null);
    }

    // --- Load Next Event ---


    // Sélectionner un événement aléatoire comme référence (previousEvent)
    const availableForReference = allEvents.filter(e => !usedEvents.has(e.id));
    if (availableForReference.length === 0) {

      setError('Impossible de démarrer le niveau.');
      setIsGameOver(true);
      return;
    }

    // SÉLECTION INTELLIGENTE DU DÉBUT DE NIVEAU
    // Au lieu de prendre au hasard, on choisit une référence adaptée au niveau
    let candidates = availableForReference;

    if (user.level <= 5) {
      // Niveaux Débutants : On veut une référence SOLIDE (Moderne + Très Connue)
      candidates = availableForReference.filter(e => {
        const year = new Date(e.date).getFullYear();
        const not = (e as any).notoriete ?? 0;
        return year >= 1700 && not >= 75;
      });
      // Fallback si pas assez de candidats
      if (candidates.length === 0) {
        candidates = availableForReference.filter(e => ((e as any).notoriete ?? 0) >= 60);
      }
    } else if (user.level <= 10) {
      // Niveaux Intermédiaires : On veut une référence CONNUE (Toutes époques)
      candidates = availableForReference.filter(e => ((e as any).notoriete ?? 0) >= 60);
    }

    // Si le filtrage est trop strict et ne donne rien, on revient au pool global
    if (candidates.length === 0) candidates = availableForReference;

    const firstEvent = candidates[Math.floor(Math.random() * candidates.length)];
    console.log('[LEVEL_START] Référence sélectionnée:', firstEvent.id);

    // Marquer comme utilisé et définir comme previousEvent ET afficher immédiatement
    setUsedEvents(prev => new Set([...prev, firstEvent.id]));

    setPreviousEvent(firstEvent);
    setNewEvent(firstEvent); // Mettre à jour newEvent pour l'affichage en haut
    setDisplayedEvent(firstEvent); // Afficher immédiatement la carte de référence

    // Maintenant sélectionner le premier événement à deviner

    selectNewEventRef.current(allEvents, firstEvent)
      .then((selectedEvent: Event | null) => {
        console.log('[LEVEL_START] Événement sélectionné:', selectedEvent?.id);
        // Only unpause if an event was successfully selected AND the game hasn't ended in the meantime
        if (selectedEvent && !isGameOver) {

          // Crucially unpause *after* the new event is ready (updateGameState callback handles setting displayedEvent etc.)
          setIsLevelPaused(false);
        } else if (!isGameOver) {
          // If no event could be selected, it's a critical error for continuing play

          setError('Impossible de trouver un événement valide pour continuer le jeu après la montée de niveau.');
          setIsGameOver(true); // End the game
          FirebaseAnalytics.trackError('select_event_null_levelup', {
            message: 'selectNewEvent returned null unexpectedly after level up',
            screen: 'handleLevelUp',
          });
        }
      })
      .catch((err: any) => {

        setError(`Erreur critique lors du chargement du niveau suivant: ${err.message}`);
        FirebaseAnalytics.trackError('select_event_error_levelup', {
          message: err instanceof Error ? err.message : 'Unknown',
          screen: 'handleLevelUp',
        });
        setIsGameOver(true); // End the game on critical error
        // Ensure game remains paused if it wasn't already over
        setIsLevelPaused(true);
      });

  }, [
    user.level, user.points, previousEvent, allEvents, usedEvents, // Core data
    canShowAd, showLevelUpInterstitial, setPendingAdDisplay, pendingAdDisplay, // Ad logic
    selectNewEvent, // Event selection logic
    resetTimer, // Timer logic
    timeLimit,
    trackLevelStarted, // Analytics
    setDisplayedEvent, setError, setIsGameOver, endGame, setPreviousEvent, setUsedEvents, // State setters & core actions
    setShowLevelModal, setIsLevelPaused, setIsWaitingForCountdown, // UI/Flow state setters
    setShowDates, setIsCorrect, setIsImageLoaded, // More state setters
    isGameOver // Need to check isGameOver status within the callback
  ]);

  endGameRef.current = endGame;

  // --- REACTOTRON DEBUG COMMANDS ---
  const hasRegisteredDebugRef = useRef(false);
  useEffect(() => {
    if (__DEV__ && !hasRegisteredDebugRef.current) {
      console.log('[DEBUG] Registering hook-based Reactotron commands...');

      registerDebugCommand({
        command: 'addLife',
        handler: () => {
          setUser(prev => ({ ...prev, lives: Math.min((user.lives || 0) + 1, gameMode.maxLives) }));
          // @ts-ignore
          console.tron.log('Debug: Added 1 life');
        },
        description: 'Ajouter une vie (mode debug)',
      });

      registerDebugCommand({
        command: 'simulateRewardedAd',
        handler: () => {
          setPendingAdDisplay('rewarded');
          showRewardedAd();
          // @ts-ignore
          console.tron.log('Debug: Simulating Rewarded Ad trigger');
        },
        description: 'Simuler le déclenchement d\'une pub récompensée',
      });

      registerDebugCommand({
        command: 'skipLevel',
        handler: () => {
          setUser(prev => ({ ...prev, level: prev.level + 1, eventsCompletedInLevel: 0 }));
          // @ts-ignore
          console.tron.log('Debug: Skiping to next level');
        },
        description: 'Passer au niveau suivant (mode debug)',
      });

      registerDebugCommand({
        command: 'simulate_event_distribution',
        handler: async () => {
          // @ts-ignore
          console.tron.log('🚀 Démarrage de la simulation (100 tirages)...');
          const results = [];
          const duplicates = [];
          const sameDates: any[] = [];
          let currentRef = newEvent || previousEvent;
          let tempUsed = new Set(usedEvents);

          for (let i = 0; i < 100; i++) {
            const next = await baseSelectNewEvent(allEvents, currentRef, user.level, tempUsed, streak);
            if (next) {
              if (tempUsed.has(next.id)) duplicates.push({ title: next.titre, id: next.id });
              if (currentRef && next.date === currentRef.date) sameDates.push({ date: next.date, event: next.titre, prev: currentRef.titre });
              results.push(next.titre);
              tempUsed.add(next.id);
              currentRef = next;
            } else {
              // @ts-ignore
              console.tron.display({ name: '⚠️  Simulateur arrêté', value: `Arrêté au tour ${i} (plus d'événements)` });
              break;
            }
          }

          // @ts-ignore
          console.tron.display({
            name: '🎲 DISTRIBUTION (100 tours)',
            value: {
              total: results.length,
              unique: new Set(results).size,
              duplicates,
              sameDates_count: sameDates.length,
              sameDates_list: sameDates,
              first_10: results.slice(0, 10)
            },
            important: true
          });

          // Envoyer aussi à l'OBSERVER pour que l'IA puisse voir
          Logger.info('GameLogic', 'Simulation Distribution Result', {
            total: results.length,
            unique: new Set(results).size,
            duplicates_count: duplicates.length,
            sameDates_count: sameDates.length,
            duplicates,
            sameDates_list: sameDates
          });
        },
        description: 'Simuler 100 sélections successives pour auditer les doublons et la diversité.',
      });
      hasRegisteredDebugRef.current = true;
    }
  }, [setUser, user.lives, showRewardedAd, setPendingAdDisplay, gameMode.maxLives, allEvents, baseSelectNewEvent, newEvent, previousEvent, usedEvents, streak]);
  // --- FIN REACTOTRON DEBUG COMMANDS ---

  // --- SUPPRESSION DE L'INITIALISATION AUTOMATIQUE ICI ---
  // Elle est déjà gérée par useInitGame.ts via baseInitGame
  // On ne garde que le tracking si nécessaire, mais startNewGame() ici causait des doubles appels.
  useEffect(() => {
    const playerName = profile?.display_name || user.name || 'Joueur';
    trackGameStarted(playerName, !profile?.id, user.level);
  }, [trackGameStarted, user.name, user.level, profile]);


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
    showLevelTransition,
    triggerLevelEndAnim,
    isLevelPaused,
    isLastEventOfLevel,
    currentLevelConfig,
    leaderboards,
    currentReward,
    handleChoice,
    handleLevelUp,
    showRewardedAd,
    initGame: startNewGame, // Utilisation du nouveau nom
    completeRewardAnimation,
    updateRewardPosition,
    remainingEvents: allEvents ? allEvents.length - usedEvents.size : 0,
    progressAnim,
    onImageLoad: handleImageLoad, // from useTimer
    levelCompletedEvents, // from usePerformance (read-only access for display)
    levelsHistory, // from useInitGame (read-only access for display)
    resetAdsState, // from useAds
    resetGameFlowState, // <-- EXPOSER LA NOUVELLE FONCTION
    isAdLoaded, // from useAds - helper pour vérifier le chargement des pubs
    adState: {
      rewardedLoaded: adState.rewardedLoaded,
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
    // --- Infos parties invité ---
    guestPlaysInfo: {
      used: guestPlaysUsed,
      remaining: guestPlaysRemaining,
      limit: guestPlaysLimit,
      canStart: canStartGuestPlay,
      isLoading: isGuestPlaysLoading,
      grantExtraPlay: grantGuestExtraPlay,
    },
  };
}


export default useGameLogicA;
