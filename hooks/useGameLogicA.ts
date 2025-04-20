// hooks/useGameLogicA.ts
// Version finale avec correction des problèmes de pause, boutons et référence des événements

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
  HistoricalPeriod,
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

/**
 * Hook de logique de jeu principal intégrant tous les sous-hooks.
 * Gère la logique de sélection d'événements, scoring, gestion du niveau,
 * audio, récompenses, fin de partie et système publicitaire.
 *
 * @param {string} initialEvent - Identifiant éventuel d'un événement initial.
 * @returns {object} - Ensemble d'états et de fonctions utiles au jeu.
 */
export function useGameLogicA(initialEvent?: string) {
  console.log('[useGameLogicA] Hook initialisation');
  
  // ===== États internes =====

  // UI et contrôle
  const [streak, setStreak] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showDates, setShowDates] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | undefined>(undefined);
  const [isWaitingForCountdown, setIsWaitingForCountdown] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  
  // Initialiser à false pour permettre le démarrage du jeu
  const [isLevelPaused, setIsLevelPaused] = useState(false);
  
  const [leaderboardsReady, setLeaderboardsReady] = useState(false);
  const [leaderboards, setLeaderboards] = useState({ daily: [], monthly: [], allTime: [] });
  const [currentLevelConfig, setCurrentLevelConfig] = useState<ExtendedLevelConfig>({
    ...LEVEL_CONFIGS[1],
    eventsSummary: [],
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
    displayedEvent, // État pour suivre l'événement actuellement affiché
    setUser,
    setPreviousEvent,
    setNewEvent,
    setUsedEvents,
    setLevelsHistory,
    setDisplayedEvent, // Setter pour l'événement affiché
    setError,
    setLoading,
    initGame,
    fetchUserData,
    setHighScore, // Important pour mettre à jour le high score après une partie
  } = useInitGame();

  console.log('[useGameLogicA] useInitGame initialisé');

  // Appel initGame() au montage pour lancer le chargement des données
  useEffect(() => {
    console.log('[useGameLogicA] Effet de montage - initGame appelé');
    initGame();
  }, [initGame]);

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
    setLevelCompletedEvents,
  } = usePerformance();

  console.log('[useGameLogicA] usePerformance initialisé');

  // Audio
  const {
    playCorrectSound,
    playIncorrectSound,
    playLevelUpSound,
    playCountdownSound,
    playGameOverSound,
  } = useAudio();

  console.log('[useGameLogicA] useAudio initialisé');

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

  console.log('[useGameLogicA] useAnalytics initialisé');

  // Gestion du timeout
  const handleTimeout = useCallback(() => {
    console.log('[useGameLogicA] handleTimeout appelé', { isLevelPaused, isGameOver });
    
    if (isLevelPaused || isGameOver) {
      console.log('[useGameLogicA] handleTimeout ignoré - jeu en pause ou terminé');
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
      console.log('[useGameLogicA] Perte de vie par timeout, vies restantes:', newLives);
      
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
      console.log('[useGameLogicA] Plus de vies, fin de partie');
      endGame();
    } else if (newEvent) {
      console.log('[useGameLogicA] Affichage des dates après timeout');
      setIsCorrect(false);
      setShowDates(true);
      
      setTimeout(() => {
        if (!isGameOver) {
          console.log('[useGameLogicA] Passage à l\'événement suivant après timeout');
          
          // L'événement actuel devient l'événement précédent
          setPreviousEvent(newEvent);
          setDisplayedEvent(null); // Réinitialiser pour éviter les confusions
          
          selectNewEvent(allEvents, newEvent);
        }
      }, 1500);
    } else {
      console.log('[useGameLogicA] Erreur: newEvent est null dans handleTimeout');
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

  console.log('[useGameLogicA] useTimer initialisé');

  /**
   * Mise à jour de l'état du jeu avec un nouvel événement
   */
  const updateGameState = useCallback(
    async (selectedEvent: Event) => {
      console.log('[useGameLogicA] updateGameState avec événement:', selectedEvent.id);
      
      try {
        setUsedEvents((prev) => new Set([...prev, selectedEvent.id]));
        
        // Mise à jour cohérente des références
        setNewEvent(selectedEvent);
        setDisplayedEvent(selectedEvent); // Important pour stabiliser l'affichage
        
        setIsImageLoaded(false);
        setShowDates(false);
        setIsCorrect(undefined);
        setIsCountdownActive(false);
        
        // Réinitialiser le temps à chaque nouvel événement
        setTimeLeft(20);
        
        // Mise à jour des stats de fréquence dans Supabase
        const newFrequencyScore = ((selectedEvent as any).frequency_score || 0) + 1;
        await supabase
          .from('evenements')
          .update({ frequency_score: newFrequencyScore, last_used: new Date().toISOString() })
          .eq('id', selectedEvent.id);
        
        console.log('[useGameLogicA] Événement mis à jour dans la base:', { id: selectedEvent.id, newFrequencyScore });
        
        // Mettre à jour le compteur d'événements antiques si nécessaire
        if (selectedEvent && isAntiqueEvent(selectedEvent)) {
          updateAntiqueCount(selectedEvent);
        }
      } catch (err) {
        console.error('[useGameLogicA] Erreur dans updateGameState:', err);
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

  console.log('[useGameLogicA] useEventSelector initialisé');

  // Wrapper pour selectNewEvent qui intègre les états locaux
  const selectNewEvent = useCallback(
    async (events: Event[], referenceEvent: Event | null): Promise<Event | null> => {
      console.log('[useGameLogicA] selectNewEvent appelé avec référence:', referenceEvent?.id);
      
      const result = await baseSelectNewEvent(
        events, 
        referenceEvent, 
        user.level, 
        usedEvents
      );
      
      console.log('[useGameLogicA] selectNewEvent résultat:', result?.id);
      return result;
    },
    [baseSelectNewEvent, user.level, usedEvents]
  );

  /**
   * Applique une récompense au joueur
   */
  const applyReward = useCallback(
    (reward: { type: RewardType; amount: number }) => {
      console.log('[useGameLogicA] applyReward:', { type: reward.type, amount: reward.amount });
      
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
        console.error('[useGameLogicA] Erreur dans applyReward:', err);
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

  console.log('[useGameLogicA] useRewards initialisé');

  // Publicités
  const {
    adState,
    pendingAdDisplay,
    setPendingAdDisplay,
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
  });

  console.log('[useGameLogicA] useAds initialisé');

  // Effet pour démarrer le compte à rebours automatiquement quand
  // l'image est chargée et que le jeu n'est pas en pause
  useEffect(() => {
    if (isImageLoaded && !isLevelPaused && !isGameOver && !isCountdownActive) {
      console.log('[useGameLogicA] Démarrage automatique du compte à rebours');
      setIsCountdownActive(true);
    }
  }, [isImageLoaded, isLevelPaused, isGameOver, isCountdownActive]);

  /**
   * Finalise l'historique du niveau courant
   */
  const finalizeCurrentLevelHistory = useCallback(
    (eventsToFinalize: LevelEventSummary[]) => {
      console.log('[useGameLogicA] finalizeCurrentLevelHistory avec', eventsToFinalize.length, 'événements');
      
      if (!eventsToFinalize.length) {
        console.log('[useGameLogicA] Aucun événement à finaliser');
        return;
      }
      
      const currentLvl = user.level;
      
      setLevelsHistory((prevHistory) => {
        const existingIndex = prevHistory.findIndex((lh) => lh.level === currentLvl);
        
        if (existingIndex > -1) {
          console.log('[useGameLogicA] Mise à jour du niveau existant dans l\'historique');
          const updated = [...prevHistory];
          updated[existingIndex] = {
            level: currentLvl,
            events: [...updated[existingIndex].events, ...eventsToFinalize],
          };
          return updated;
        } else {
          console.log('[useGameLogicA] Ajout d\'un nouveau niveau dans l\'historique');
          return [...prevHistory, { level: currentLvl, events: eventsToFinalize }];
        }
      });
    },
    [user.level, setLevelsHistory]
  );

  /**
   * Gestion du choix du joueur (avant/après)
   */
  const handleChoice = useCallback(
    (choice: 'avant' | 'après') => {
      console.log('[useGameLogicA] handleChoice:', choice);
      
      // Vérifier que tous les états nécessaires sont disponibles
      if (!previousEvent || !newEvent || isLevelPaused || isGameOver || isWaitingForCountdown) {
        console.log('[useGameLogicA] handleChoice ignoré - conditions préalables non remplies', {
          hasPrevEvent: !!previousEvent,
          hasNewEvent: !!newEvent,
          isLevelPaused,
          isGameOver,
          isWaitingForCountdown
        });
        return;
      }
      
      const responseTime = 20 - timeLeft;
      setIsCountdownActive(false);
      
      const prevDate = new Date(previousEvent.date);
      const newDate = new Date(newEvent.date);
      
      console.log('[useGameLogicA] Comparaison des dates:', {
        prevEvent: previousEvent.titre,
        prevDate: prevDate.toISOString(),
        newEvent: newEvent.titre,
        newDate: newDate.toISOString()
      });
      
      if (isNaN(prevDate.getTime()) || isNaN(newDate.getTime())) {
        console.error('[useGameLogicA] Dates invalides dans handleChoice');
        setError("Erreur interne: date d'événement invalide.");
        FirebaseAnalytics.error(
          'invalid_event_date',
          `p=${previousEvent.date}, n=${newEvent.date}`,
          'handleChoice'
        );
        setIsWaitingForCountdown(false);
        return;
      }
      
      // Logique de comparaison pour savoir si la réponse est correcte
      // Si newEvent est avant previousEvent, alors newDate < prevDate
      // Dans ce cas, la réponse "avant" est correcte
      const isNewBefore = newDate < prevDate;
      const isAnswerCorrect = (choice === 'avant' && isNewBefore) || (choice === 'après' && !isNewBefore);
      
      console.log('[useGameLogicA] Évaluation de la réponse:', {
        isNewBefore,
        choice,
        isAnswerCorrect,
        prevYear: prevDate.getFullYear(),
        newYear: newDate.getFullYear()
      });
      
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
      
      // L'événement actuel devient la référence pour le prochain
      setPreviousEvent(newEvent);
      setIsWaitingForCountdown(true);

      if (isAnswerCorrect) {
        console.log('[useGameLogicA] Bonne réponse!');
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
        
        console.log('[useGameLogicA] Points gagnés:', pointsEarned);
        
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
          
          console.log('[useGameLogicA] Mise à jour des stats utilisateur:', {
            newPoints: updatedPoints,
            eventsDone,
            totalEvents: prev.totalEventsCompleted + 1
          });
          
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
            console.log('[useGameLogicA] Niveau terminé! Passage au niveau suivant.');
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
              console.log('[useGameLogicA] Pub interstitielle de level-up prévue');
              setPendingAdDisplay('levelUp');
              FirebaseAnalytics.ad('interstitial', 'triggered', 'level_up', prev.level);
            }
            
            checkRewards({ type: 'level', value: updated.level }, updated);
          } else {
            setTimeout(() => {
              setIsWaitingForCountdown(false);
              if (!isGameOver && !showLevelModal) {
                console.log('[useGameLogicA] Sélection du prochain événement après bonne réponse');
                // Utiliser l'événement actuel comme référence
                selectNewEvent(allEvents, newEvent);
              }
            }, 750);
          }

          return updated;
        });
      } else {
        console.log('[useGameLogicA] Mauvaise réponse!');
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
          console.log('[useGameLogicA] Perte de vie, vies restantes:', newLives);
          
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
          console.log('[useGameLogicA] Plus de vies, fin de partie');
          setTimeout(() => {
            if (!isGameOver) endGame();
          }, 500);
        } else {
          setTimeout(() => {
            setIsWaitingForCountdown(false);
            if (!isGameOver && !showLevelModal) {
              console.log('[useGameLogicA] Sélection du prochain événement après mauvaise réponse');
              // Utiliser l'événement actuel comme référence
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

  /**
   * Aide à la mise en forme des scores pour l'affichage
   */
  const setScoresAndShow = useCallback(
    (dailyScores: any[], monthlyScores: any[], allTimeScores: any[]) => {
      console.log('[useGameLogicA] setScoresAndShow avec:', { 
        daily: dailyScores.length, 
        monthly: monthlyScores.length, 
        allTime: allTimeScores.length 
      });
      
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

  /**
   * Gestion de la fin de partie
   */
  const endGame = useCallback(async () => {
    console.log('[useGameLogicA] endGame appelé');
    
    if (isGameOver) {
      console.log('[useGameLogicA] Jeu déjà terminé, endGame ignoré');
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
        console.log('[useGameLogicA] Affichage de la pub de fin de partie');
        showGameOverInterstitial();
      }
    }, 1500);

    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser?.id) {
        console.log('[useGameLogicA] Utilisateur non authentifié, affichage des scores invités');
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

      console.log('[useGameLogicA] Score enregistré:', user.points);

      // Récupérer le profil pour mettre à jour le high score si nécessaire
      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('high_score')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('[useGameLogicA] Erreur de récupération du profil:', profileError);
        FirebaseAnalytics.error('profile_fetch_error', profileError.message, 'endGame');
      } else if (currentProfile && user.points > (currentProfile.high_score || 0)) {
        console.log('[useGameLogicA] Nouveau record battu!');
        const { error: updateError } = await supabase
        .from('profiles')
        .update({ high_score: user.points })
        .eq('id', userId);

      if (updateError) {
        console.error('[useGameLogicA] Erreur de mise à jour du high score:', updateError);
        FirebaseAnalytics.error('profile_update_error', updateError.message, 'endGame');
      } else {
        FirebaseAnalytics.logEvent('new_high_score', {
          score: user.points,
          previous_high_score: currentProfile.high_score || 0,
        });
        setHighScore(user.points);
      }
    }

    console.log('[useGameLogicA] Récupération des classements');

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
      console.error('[useGameLogicA] Erreur de récupération des scores journaliers:', dailyRes.error);
      FirebaseAnalytics.error('leaderboard_fetch_error', `Daily: ${dailyRes.error.message}`, 'endGame');
    }
    if (monthlyRes.error) {
      console.error('[useGameLogicA] Erreur de récupération des scores mensuels:', monthlyRes.error);
      FirebaseAnalytics.error('leaderboard_fetch_error', `Monthly: ${monthlyRes.error.message}`, 'endGame');
    }
    if (allTimeRes.error) {
      console.error('[useGameLogicA] Erreur de récupération des scores all-time:', allTimeRes.error);
      FirebaseAnalytics.error('leaderboard_fetch_error', `AllTime: ${allTimeRes.error.message}`, 'endGame');
    }

    setScoresAndShow(dailyRes.data || [], monthlyRes.data || [], allTimeRes.data || []);

  } catch (err) {
    console.error('[useGameLogicA] Erreur inattendue dans endGame:', err);
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
  setHighScore,
]);

/**
 * Gestion du passage au niveau suivant
 */
const handleLevelUp = useCallback(() => {
  console.log('[useGameLogicA] handleLevelUp appelé');
  
  const currentLevelState = user.level;
  const currentPointsState = user.points;
  const referenceEvent = previousEvent;
  
  if (!referenceEvent) {
    console.error('[useGameLogicA] Erreur critique: previousEvent est null dans handleLevelUp');
    setError('Erreur interne critique: impossible de démarrer le niveau suivant (référence manquante).');
    FirebaseAnalytics.error('levelup_null_prev_event', 'previousEvent was null when handleLevelUp called', 'handleLevelUp');
    setIsGameOver(true);
    return;
  }
  
  const nextConfig = LEVEL_CONFIGS[currentLevelState];
  if (!nextConfig) {
    console.log('[useGameLogicA] Tous les niveaux terminés!');
    setError('Félicitations ! Vous avez terminé tous les niveaux disponibles !');
    FirebaseAnalytics.error('config_missing_on_levelup', `Level ${currentLevelState} config missing`, 'handleLevelUp');
    endGame();
    return;
  }
  
  console.log('[useGameLogicA] Démarrage du niveau', currentLevelState);
  
  setShowLevelModal(false);
  setIsLevelPaused(false);
  setIsCountdownActive(false);
  
  // IMPORTANT: Toujours réinitialiser le timer lors du changement de niveau
  resetTimer(20);
  
  resetLevelCompletedEvents();
  setIsWaitingForCountdown(false);
  setShowDates(false);
  setIsCorrect(undefined);
  setIsImageLoaded(false);
  
  // Réinitialiser l'événement affiché pour assurer une transition propre
  setDisplayedEvent(null);
  
  trackLevelStarted(
    currentLevelState,
    nextConfig.name || `Niveau ${currentLevelState}`,
    nextConfig.eventsNeeded,
    currentPointsState
  );
  
  if (pendingAdDisplay === 'levelUp' && canShowAd()) {
    console.log('[useGameLogicA] Affichage de la pub de level up');
    showLevelUpInterstitial();
  }
  setPendingAdDisplay(null);
  
  console.log('[useGameLogicA] Sélection du premier événement du nouveau niveau');
  selectNewEvent(allEvents, referenceEvent)
    .then((sel) => {
      if (!sel && !isGameOver) {
        console.error('[useGameLogicA] Erreur: Aucun événement sélectionné pour le nouveau niveau');
        setError('Impossible de trouver un événement valide pour continuer le jeu.');
        setIsGameOver(true);
        FirebaseAnalytics.error('select_event_null_levelup', 'selectNewEvent returned null unexpectedly after level up', 'handleLevelUp');
      }
    })
    .catch((err) => {
      console.error('[useGameLogicA] Erreur lors de la sélection d\'événement:', err);
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

// Retourne tous les états et fonctions nécessaires aux composants UI
return {
  // États utilisateur et jeu
  user,
  previousEvent,
  newEvent,
  displayedEvent, // Expose l'état de l'événement affiché aux composants
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

  // État publicitaire simplifié pour l'UI avec la nouvelle propriété
  adState: {
    hasRewardedAd: adState.rewardedLoaded,
    hasWatchedRewardedAd: adState.hasWatchedRewardedAd,
  }
};
}

export default useGameLogicA;