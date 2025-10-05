import { useState, useCallback, useEffect, useRef } from 'react';
import { Animated, Dimensions } from 'react-native';
import { supabase } from '../lib/supabase/supabaseClients';
import { FirebaseAnalytics } from '../lib/firebase';
import {
  Event,
  User,
  ExtendedLevelConfig,
  RewardType,
  MAX_LIVES,
  HistoricalPeriod,
  LevelEventSummary,
  LevelHistory
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
  useRewards
} from './game';

// Constante globale
const screenWidth = Dimensions.get('window').width;

/**
 * Hook de logique de jeu principal intégrant tous les sous-hooks.
 * Gère la logique de sélection d'événements, scoring, gestion du niveau,
 * audio, récompenses, fin de partie et système publicitaire.
 * 
 * @param {string} initialEvent - Identifiant éventuel d'un événement initial.
 * @returns {object} - Ensemble d'états et de fonctions utiles au jeu.
 */
export function useGameLogicA(initialEvent?: string, _modeId?: string) {
  // ===== États internes =====
  
  // UI et contrôle
  const [streak, setStreak] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showDates, setShowDates] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | undefined>(undefined);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [isLevelPaused, setIsLevelPaused] = useState(true);
  const [isWaitingForCountdown, setIsWaitingForCountdown] = useState(false);
  const [leaderboardsReady, setLeaderboardsReady] = useState(false);
  const [leaderboards, setLeaderboards] = useState({ daily: [], monthly: [], allTime: [] });
  const [currentLevelConfig, setCurrentLevelConfig] = useState<ExtendedLevelConfig>({
    ...LEVEL_CONFIGS[1],
    eventsSummary: []
  });
  
  // Animation
  const [progressAnim] = useState(() => new Animated.Value(0));
  
  // ===== Utilisation des sous-hooks =====
  
  // Initialisation et états principaux du jeu
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
    setUser,
    setPreviousEvent,
    setNewEvent,
    setUsedEvents,
    setLevelsHistory,
    setError,
    setLoading,
    initGame,
    fetchUserData
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
    setCurrentLevelEvents,
    setLevelCompletedEvents
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
    trackError
  } = useAnalytics();
  
  // Gestion du temps
  const handleTimeout = useCallback(() => {
    if (isLevelPaused || isGameOver) return;
    
    setIsWaitingForCountdown(false);
    
    // Tracking de l'événement de timeout
    FirebaseAnalytics.logEvent('timeout', {
      level_id: user.level,
      events_completed_in_level: user.eventsCompletedInLevel,
      current_streak: streak
    });
    
    playIncorrectSound();
    setStreak(0);
    
    // Animation de la barre de streak
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false
    }).start();
    
    // Perdre une vie
    setUser((prev) => {
      const newLives = prev.lives - 1;
      
      // Tracker la perte de vie
      FirebaseAnalytics.logEvent('life_lost', {
        reason: 'timeout',
        remaining_lives: newLives,
        level_id: prev.level,
        event_id: newEvent?.id || 'unknown',
      });
      
      if (newLives <= 0) {
        return { ...prev, lives: 0, streak: 0 };
      }
      return { ...prev, lives: newLives, streak: 0 };
    });
    
    // Si l'utilisateur n'a plus de vie après la mise à jour, déclencher endGame
    if (user.lives <= 1) {
      endGame();
    } else if (newEvent) {
      // S'il reste des vies, passer à la question suivante
      setIsCorrect(false);
      setShowDates(true);
      setTimeout(() => {
        if (!isGameOver) {
          setPreviousEvent(newEvent);
          selectNewEvent(allEvents, newEvent);
        }
      }, 1500);
    } else {
      setError("Erreur interne: impossible de charger l'événement suivant.");
      setIsGameOver(true);
      FirebaseAnalytics.error('timeout_null_event', 'newEvent was null in handleTimeout', 'handleTimeout');
    }
  }, [
    isLevelPaused, isGameOver, user.level, user.eventsCompletedInLevel, user.lives, 
    streak, newEvent, allEvents, playIncorrectSound, progressAnim, endGame, selectNewEvent
  ]);
  
  const { timeLeft, isCountdownActive, setTimeLeft, setIsCountdownActive, resetTimer, handleImageLoad } = 
    useTimer({
      user,
      isLevelPaused,
      isGameOver,
      handleTimeout,
      isImageLoaded
    });
  
  // Récompenses
  const {
    currentReward,
    checkRewards,
    completeRewardAnimation,
    updateRewardPosition
  } = useRewards({
    onRewardEarned: (reward) => {
      if (!reward.targetPosition) {
        if (reward.type === RewardType.EXTRA_LIFE) {
          reward.targetPosition = { x: screenWidth * 0.45, y: 50 };
        } else {
          reward.targetPosition = { x: 80, y: 30 };
        }
      }
      applyReward(reward);
    },
  });
  
  // Publicités
  const {
    adState,
    pendingAdDisplay,
    setPendingAdDisplay,
    canShowAd,
    showRewardedAd,
    showGenericInterstitial,
    showLevelUpInterstitial,
    showGameOverInterstitial
  } = useAds({
    user,
    setUser,
    previousEvent,
    allEvents,
    selectNewEvent
  });
  
  // ===== Fonctions du hook principal =====
  
  /**
   * Applique une récompense au joueur
   */
  const applyReward = useCallback((reward: { type: RewardType; amount: number }) => {
    try {
      const safeAmount = Math.max(0, Math.floor(Number(reward.amount) || 0));
      
      // Mise à jour de l'état utilisateur
      setUser((prev) => {
        const currentPoints = Math.max(0, Number(prev.points) || 0);
        const updatedPoints = currentPoints + (reward.type === RewardType.POINTS ? safeAmount : 0);
        const updatedLives = reward.type === RewardType.EXTRA_LIFE
          ? Math.min(prev.lives + 1, MAX_LIVES)
          : prev.lives;
          
        return {
          ...prev,
          points: updatedPoints,
          lives: updatedLives
        };
      });
      
    } catch (error) {
      FirebaseAnalytics.error('apply_reward_error', error instanceof Error ? error.message : 'Unknown', 'applyReward');
    }
  }, []);
  
  /**
   * Finalise l'historique du niveau courant
   */
  const finalizeCurrentLevelHistory = useCallback((eventsToFinalize: LevelEventSummary[]) => {
    if (!eventsToFinalize || eventsToFinalize.length === 0) {
      return;
    }
    
    const currentLvl = user.level;
    setLevelsHistory((prevHistory) => {
      const existingLevelIndex = prevHistory.findIndex((lh) => lh.level === currentLvl);
      if (existingLevelIndex > -1) {
        // Si le niveau existe déjà, on met à jour
        const updatedHistory = [...prevHistory];
        updatedHistory[existingLevelIndex] = {
          level: currentLvl,
          events: [...updatedHistory[existingLevelIndex].events, ...eventsToFinalize]
        };
        return updatedHistory;
      } else {
        // Ajoute une nouvelle entrée pour le niveau terminé
        const newHistoryEntry = { level: currentLvl, events: eventsToFinalize };
        return [...prevHistory, newHistoryEntry];
      }
    });
  }, [user.level]);
  
  /**
   * Détermination de la période historique à partir d'une date
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
   * Méthode temporaire pour la sélection d'événements
   * Note: Dans la version finale, cette fonction serait importée du hook useEventSelector
   */
  const selectNewEvent = useCallback(async (events: Event[], referenceEvent: Event | null) => {
    if (!events || events.length === 0 || !referenceEvent) {
      setError("Erreur de sélection d'événement: données manquantes");
      setIsGameOver(true);
      return null;
    }
    
    // Version simplifiée pour la démonstration
    // Sélection aléatoire parmi les événements non utilisés
    const availableEvents = events.filter(e => !usedEvents.has(e.id) && e.id !== referenceEvent.id);
    
    if (availableEvents.length === 0) {
      setError("Tous les événements ont été explorés!");
      setIsGameOver(true);
      return null;
    }
    
    const selectedEvent = availableEvents[Math.floor(Math.random() * availableEvents.length)];
    
    // Mise à jour de l'état
    setUsedEvents(prev => new Set([...prev, selectedEvent.id]));
    setNewEvent(selectedEvent);
    setIsImageLoaded(false);
    setShowDates(false);
    setIsCorrect(undefined);
    setIsCountdownActive(false);
    setTimeLeft(20);
    
    return selectedEvent;
  }, [usedEvents]);
  
  /**
   * Gestion du choix du joueur (avant/après)
   */
  const handleChoice = useCallback((choice: 'avant' | 'après') => {
    if (!previousEvent || !newEvent || isLevelPaused || isGameOver || isWaitingForCountdown) {
      return;
    }
    
    setIsCountdownActive(false);
    
    const responseTime = 20 - timeLeft;
    
    const previousDate = new Date(previousEvent.date);
    const newDate = new Date(newEvent.date);
    const isNewDateValid = !isNaN(newDate.getTime());
    const isPreviousDateValid = !isNaN(previousDate.getTime());
    
    if (!isNewDateValid || !isPreviousDateValid) {
      setError("Erreur interne: date d'événement invalide.");
      FirebaseAnalytics.error('invalid_event_date', `Invalid date(s): p=${previousEvent.date}, n=${newEvent.date}`, 'handleChoice');
      setIsWaitingForCountdown(false);
      return;
    }
    
    const isActuallyBefore = newDate < previousDate;
    const isAnswerCorrect = (choice === 'avant' && isActuallyBefore) || (choice === 'après' && !isActuallyBefore);
    
    // Tracking de la question
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
    
    // Création du résumé de l'événement pour l'historique
    const eventSummaryItem: LevelEventSummary = {
      id: newEvent.id,
      titre: newEvent.titre,
      date: newEvent.date,
      date_formatee: newEvent.date_formatee || new Date(newEvent.date).toLocaleDateString('fr-FR'),
      illustration_url: newEvent.illustration_url,
      wasCorrect: isAnswerCorrect,
      responseTime: responseTime,
      description_detaillee: newEvent.description_detaillee,
    };
    
    // Mise à jour de l'historique
    updatePerformanceStats(newEvent.types_evenement?.[0] || 'default', getPeriod(newEvent.date), isAnswerCorrect);
    
    // Mise à jour de previousEvent immédiatement
    const eventJustPlayed = newEvent;
    setPreviousEvent(eventJustPlayed);
    
    // Attente avant de passer à la suite
    setIsWaitingForCountdown(true);
    
    if (isAnswerCorrect) {
      // === BONNE RÉPONSE ===
      console.log('[Audio] GameLogicA.refactored: correct answer – triggering SFX', { eventId: newEvent.id, streak });
      playCorrectSound();
      const newStreak = streak + 1;
      setStreak(newStreak);
      
      trackStreak(newStreak, user.level);
      Animated.timing(progressAnim, { toValue: newStreak, duration: 300, useNativeDriver: false }).start();
      
      const pointsEarned = calculatePoints(timeLeft, newEvent.niveau_difficulte || 1, newStreak, user.level);
      trackReward('POINTS', pointsEarned, 'correct_answer', newEvent.niveau_difficulte || 1, user.level, user.points + pointsEarned);
      checkRewards({ type: 'streak', value: newStreak }, user);
      
      addEventToLevel(eventSummaryItem);

      setUser((prev) => {
        const updatedPoints = prev.points + pointsEarned;
        const eventsCompleted = prev.eventsCompletedInLevel + 1;
        let updatedUser = {
          ...prev,
          points: updatedPoints,
          streak: newStreak,
          maxStreak: Math.max(prev.maxStreak, newStreak),
          eventsCompletedInLevel: eventsCompleted,
          totalEventsCompleted: prev.totalEventsCompleted + 1,
        };
        
        const currentLevelConfig = LEVEL_CONFIGS[prev.level];
        if (currentLevelConfig && eventsCompleted >= currentLevelConfig.eventsNeeded) {
          const nextLevel = prev.level + 1;
          const nextLevelConfig = LEVEL_CONFIGS[nextLevel];
          
          updatedUser = {
            ...updatedUser,
            level: nextLevel,
            eventsCompletedInLevel: 0,
          };
          
          trackLevelCompleted(prev.level, currentLevelConfig.name || `Niveau ${prev.level}`, eventsCompleted, updatedPoints);
          finalizeCurrentLevelHistory(levelCompletedEvents);
          
          if (nextLevelConfig) {
            setCurrentLevelConfig({ ...nextLevelConfig, eventsSummary: [] });
          }
          
          resetCurrentLevelEvents();
          setShowLevelModal(true);
          setIsLevelPaused(true);
          console.log('[Audio] GameLogicA.refactored: level up – triggering SFX', { level: updatedUser.level });
          playLevelUpSound();
          
          if (prev.level === 1 || prev.level === 6 || prev.level % 5 === 0) {
            setPendingAdDisplay("levelUp");
            FirebaseAnalytics.ad('interstitial', 'triggered', 'level_up', prev.level);
          }
          
          checkRewards({ type: 'level', value: nextLevel }, updatedUser);
        } else {
          // Niveau non terminé
          setTimeout(() => {
            setIsWaitingForCountdown(false);
            if (!isGameOver && !showLevelModal) {
              selectNewEvent(allEvents, eventJustPlayed);
            }
          }, 750);
        }
        
        return updatedUser;
      });
      
    } else {
      // === MAUVAISE RÉPONSE ===
      console.log('[Audio] GameLogicA.refactored: incorrect answer – triggering SFX', { eventId: newEvent.id, livesBefore: user.lives });
      playIncorrectSound();
      setStreak(0);
      
      Animated.timing(progressAnim, { toValue: 0, duration: 300, useNativeDriver: false }).start();
      
      addEventToLevel(eventSummaryItem);

      setUser((prev) => {
        const newLives = prev.lives - 1;
        FirebaseAnalytics.logEvent('life_lost', { 
          reason: 'incorrect_answer', 
          remaining_lives: newLives, 
          level_id: prev.level, 
          event_id: newEvent.id 
        });
        
        if (newLives <= 0) {
          return { ...prev, lives: 0, streak: 0 };
        }
        return { ...prev, lives: newLives, streak: 0 };
      });
      
      if (user.lives <= 1) {
        setTimeout(() => {
          if (!isGameOver) {
            endGame();
          }
        }, 500);
      } else {
        setTimeout(() => {
          setIsWaitingForCountdown(false);
          if (!isGameOver && !showLevelModal) {
            selectNewEvent(allEvents, eventJustPlayed);
          }
        }, 1500);
      }
    }
  }, [
    previousEvent, newEvent, isLevelPaused, isGameOver, isWaitingForCountdown,
    timeLeft, streak, user, allEvents, progressAnim, levelCompletedEvents,
    getPeriod, calculatePoints, checkRewards, selectNewEvent, finalizeCurrentLevelHistory,
    playCorrectSound, playIncorrectSound, playLevelUpSound, updatePerformanceStats, endGame,
    trackQuestion, trackStreak, trackReward, trackLevelCompleted, addEventToLevel, resetCurrentLevelEvents
  ]);
  
  /**
   * Gestion du passage au niveau suivant
   */
  const handleLevelUp = useCallback(() => {
    const currentLevelState = user.level;
    const currentPointsState = user.points;
    const referenceEvent = previousEvent;
    
    if (!referenceEvent) {
      setError("Erreur interne critique: impossible de démarrer le niveau suivant (référence manquante).");
      FirebaseAnalytics.error('levelup_null_prev_event', 'previousEvent was null when handleLevelUp called', 'handleLevelUp');
      setIsGameOver(true);
      return;
    }
    
    const nextLevel = currentLevelState;
    const nextLevelConfig = LEVEL_CONFIGS[nextLevel];
    
    if (!nextLevelConfig) {
      setError(`Félicitations ! Vous avez terminé tous les niveaux disponibles !`);
      FirebaseAnalytics.error('config_missing_on_levelup', `Level ${nextLevel} config missing`, 'handleLevelUp');
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
    
    trackLevelStarted(
      nextLevel,
      nextLevelConfig.name || `Niveau ${nextLevel}`,
      nextLevelConfig.eventsNeeded,
      currentPointsState
    );
    
    if (pendingAdDisplay === "levelUp" && canShowAd()) {
      showLevelUpInterstitial();
    }
    
    setPendingAdDisplay(null);
    
    selectNewEvent(allEvents, referenceEvent)
      .then(selectedEvent => {
        if (!selectedEvent) {
          if (!isGameOver && !error) {
            setError("Impossible de trouver un événement valide pour continuer le jeu.");
            setIsGameOver(true);
            FirebaseAnalytics.error('select_event_null_levelup', 'selectNewEvent returned null unexpectedly after level up', 'handleLevelUp');
          }
        }
      })
      .catch(err => {
        setError(`Erreur critique lors du chargement du niveau suivant: ${err.message}`);
        FirebaseAnalytics.error('select_event_error_levelup', err instanceof Error ? err.message : 'Unknown', 'handleLevelUp');
        setIsGameOver(true);
      });
  }, [
    user.level, user.points, previousEvent, pendingAdDisplay,
    canShowAd, showLevelUpInterstitial, allEvents, endGame, selectNewEvent,
    resetTimer, resetLevelCompletedEvents, trackLevelStarted
  ]);
  
  /**
   * Aide à la mise en forme des scores pour l'affichage
   */
  const setScoresAndShow = useCallback((
    dailyScores: any[],
    monthlyScores: any[],
    allTimeScores: any[]
  ) => {
    const formatScores = (scores: any[], scoreField: string = 'score') =>
      scores.map((s, index) => ({
        name: s.display_name?.trim() || 'Joueur',
        score: s[scoreField] || 0,
        rank: index + 1
      }));
    
    const formatted = {
      daily: formatScores(dailyScores, 'score'),
      monthly: formatScores(monthlyScores, 'score'),
      allTime: formatScores(allTimeScores, 'high_score')
    };
    
    setLeaderboards(formatted);
    setLeaderboardsReady(true);
    
    FirebaseAnalytics.leaderboard('summary');
  }, []);
  
  /**
   * Gestion de la fin de partie
   */
  const endGame = useCallback(async () => {
    if (isGameOver) {
      return;
    }
    
    setIsGameOver(true);
    setIsCountdownActive(false);
    setIsLevelPaused(true);
    console.log('[Audio] GameLogicA.refactored: game over – triggering SFX', { points: user.points, level: user.level });
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
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser?.id) {
        const guestScores = {
          daily: [{ name: user.name || 'Voyageur', score: user.points, rank: 1 }],
          monthly: [{ name: "👑 Meilleur score", score: highScore || user.points, rank: 1 }],
          allTime: [{ name: "🏆 Record", score: highScore || user.points, rank: 1 }]
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
        supabase.from('game_scores').select('display_name, score').gte('created_at', `${today}T00:00:00.000Z`).order('score', { ascending: false }).limit(5),
        supabase.from('game_scores').select('display_name, score').gte('created_at', `${firstDayOfMonth}T00:00:00.000Z`).order('score', { ascending: false }).limit(5),
        supabase.from('profiles').select('display_name, high_score').not('high_score', 'is', null).order('high_score', { ascending: false }).limit(5)
      ]);
      
      if(dailyRes.error) { 
        FirebaseAnalytics.error('leaderboard_fetch_error', `Daily: ${dailyRes.error.message}`, 'endGame');
      }
      if(monthlyRes.error) { 
        FirebaseAnalytics.error('leaderboard_fetch_error', `Monthly: ${monthlyRes.error.message}`, 'endGame');
      }
      if(allTimeRes.error) { 
        FirebaseAnalytics.error('leaderboard_fetch_error', `AllTime: ${allTimeRes.error.message}`, 'endGame');
      }
      
      setScoresAndShow(dailyRes.data || [], monthlyRes.data || [], allTimeRes.data || []);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown endGame processing error';
      FirebaseAnalytics.error('endgame_processing_error', errorMessage, 'endGame');
      
      const fallbackScores = {
        daily: [{ name: user.name || 'Voyageur', score: user.points, rank: 1 }],
        monthly: [{ name: "👑 Meilleur score", score: highScore || user.points, rank: 1 }],
        allTime: [{ name: "🏆 Record", score: highScore || user.points, rank: 1 }]
      };
      setLeaderboards(fallbackScores);
      setLeaderboardsReady(true);
    }
  }, [
    isGameOver, user.points, user.level, user.totalEventsCompleted, user.maxStreak, user.name,
    highScore, playGameOverSound, finalizeCurrentLevelHistory, currentLevelEvents,
    canShowAd, showGameOverInterstitial, trackGameOver, setScoresAndShow
  ]);
  
  // Retourne tous les états et fonctions nécessaires aux composants UI
  return {
    // États utilisateur et jeu
    user,
    previousEvent,
    newEvent,
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
    
    // Fonctions de jeu principales
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
    }
  };
}

export default useGameLogicA;
