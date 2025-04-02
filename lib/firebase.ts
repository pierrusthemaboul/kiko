// /home/pierre/sword/kiko/lib/firebase.ts

/**
 * Utilitaires Firebase Analytics pour l'application ChronoLeap (kiko)
 *
 * Ce fichier centralise les fonctions d'analytics pour faciliter
 * leur utilisation cohérente à travers l'application.
 */

import analytics from '@react-native-firebase/analytics';
import { Platform } from 'react-native'; // N'oublie pas d'importer Platform

// ---- Fonctions de Tracking Spécifiques ----

/**
 * Configuration initiale et suivi des propriétés utilisateur
 * @param userId - ID optionnel de l'utilisateur Supabase
 * @param isGuest - Si l'utilisateur joue en mode invité
 */
export const initializeAnalytics = async (userId?: string, isGuest: boolean = false) => {
  try {
    // ID utilisateur si connecté
    if (userId) {
      await analytics().setUserId(userId);
      console.log(`Analytics: User ID set to '${userId}'`);
    } else {
      await analytics().setUserId(null); // Important de le mettre à null pour les invités
      console.log('Analytics: User ID cleared (guest)');
    }

    // Propriétés utilisateur communes
    await analytics().setUserProperties({
      is_guest: isGuest ? 'true' : 'false',
      // TODO: Remplacer par la vraie version de l'application (depuis package.json ou expo-constants)
      app_version: '1.0.0',
      platform: Platform.OS,
    });
    console.log(`Analytics: User properties set (is_guest: ${isGuest}, platform: ${Platform.OS})`);

    console.log('Firebase Analytics initialized/updated successfully');
  } catch (error) {
    console.error('Error initializing/updating Firebase Analytics:', error);
  }
};

/**
 * Utilisation et navigation
 */
export const trackNavigation = async (screenName: string, screenClass?: string) => {
  try {
    const name = screenName || 'UnknownScreen';
    const className = screenClass || name;
    await analytics().logScreenView({
      screen_name: name,
      screen_class: className,
    });
    console.log(`Analytics: Screen view logged: ${name} (${className})`);
  } catch (error) {
    console.error('Error tracking screen view:', error);
  }
};

export const trackAppOpen = async () => {
  try {
    await analytics().logAppOpen();
    console.log('Analytics: App open event logged');
  } catch (error) {
    console.error('Error tracking app open:', error);
  }
};

/**
 * Gameplay et progression
 */
export const trackGameStarted = async (playerName: string | null, isGuest: boolean, initialLevel: number) => {
  try {
    await analytics().logEvent('game_started', {
      player_name: playerName || 'Anonymous',
      is_guest: isGuest,
      initial_level: initialLevel
    });
    console.log(`Analytics: game_started event logged (player: ${playerName || 'Anonymous'}, guest: ${isGuest}, level: ${initialLevel})`);
  } catch (error) {
    console.error('Error tracking game_started:', error);
  }
};

export const trackLevelStarted = async (levelId: number, levelName: string, eventsNeeded: number, currentScore: number) => {
  try {
    await analytics().logEvent('level_started', {
      level_id: levelId,
      level_name: levelName || `Niveau ${levelId}`,
      events_needed: eventsNeeded,
      current_score: currentScore
    });
    console.log(`Analytics: level_started event logged (level: ${levelId}, score: ${currentScore})`);
  } catch (error) {
    console.error('Error tracking level_started:', error);
  }
};

export const trackLevelCompleted = async (
  levelId: number,
  levelName: string,
  eventsCompleted: number,
  correctAnswers: number,
  score: number,
  maxStreak: number
) => {
  try {
    await analytics().logEvent('level_completed', {
      level_id: levelId,
      level_name: levelName || `Niveau ${levelId}`,
      events_completed: eventsCompleted,
      correct_answers: correctAnswers,
      score: score,
      max_streak: maxStreak
    });
    console.log(`Analytics: level_completed event logged (level: ${levelId}, score: ${score}, streak: ${maxStreak})`);
  } catch (error) {
    console.error('Error tracking level_completed:', error);
  }
};

export const trackQuestionAnswered = async (
  eventId: string,
  eventTitle: string,
  eventPeriod: string,
  eventDifficulty: number | undefined, // Peut être undefined
  choice: string,
  isCorrect: boolean,
  responseTime: number,
  levelId: number,
  currentStreak: number
) => {
  try {
    await analytics().logEvent('question_answered', {
      event_id: eventId,
      event_title: eventTitle?.substring(0, 100), // Limiter la longueur
      event_period: eventPeriod,
      event_difficulty: eventDifficulty ?? 0, // Mettre 0 si undefined
      choice: choice,
      is_correct: isCorrect,
      response_time: Math.round(responseTime), // Arrondir le temps
      level_id: levelId,
      current_streak: currentStreak
    });
    console.log(`Analytics: question_answered event logged (correct: ${isCorrect}, streak: ${currentStreak})`);
  } catch (error) {
    console.error('Error tracking question_answered:', error);
  }
};

export const trackStreakAchieved = async (streakCount: number, levelId: number) => {
  // On traque seulement les paliers (ex: tous les 5) pour éviter le bruit
  if (streakCount === 0 || streakCount % 5 !== 0) return;

  try {
    await analytics().logEvent('streak_achieved', {
      streak_count: streakCount,
      level_id: levelId
    });
    console.log(`Analytics: streak_achieved event logged (streak: ${streakCount}, level: ${levelId})`);
  } catch (error) {
    console.error('Error tracking streak_achieved:', error);
  }
};

export const trackGameOver = async (
  finalScore: number,
  maxLevel: number,
  totalEventsCompleted: number,
  maxStreak: number,
  isHighScore: boolean
) => {
  try {
    await analytics().logEvent('game_over', {
      final_score: finalScore,
      max_level: maxLevel,
      total_events_completed: totalEventsCompleted,
      max_streak: maxStreak,
      is_high_score: isHighScore
    });
    console.log(`Analytics: game_over event logged (score: ${finalScore}, level: ${maxLevel}, high_score: ${isHighScore})`);
  } catch (error) {
    console.error('Error tracking game_over:', error);
  }
};

/**
 * Récompenses et publicités
 */
export const trackRewardEarned = async (
  rewardType: string,
  rewardAmount: number,
  trigger: string, // Ex: 'correct_answer', 'level_up', 'streak_5', 'ad_reward'
  triggerValue: number | string, // Ex: niveau de difficulté, niveau atteint, streak, 'ad_completed'
  levelId: number,
  currentScore: number
) => {
  try {
    await analytics().logEvent('reward_earned', {
      reward_type: rewardType, // 'POINTS', 'EXTRA_LIFE', etc.
      reward_amount: rewardAmount,
      trigger_event: trigger,
      trigger_value: triggerValue,
      level_id: levelId,
      current_score: currentScore
    });
    console.log(`Analytics: reward_earned event logged (type: ${rewardType}, amount: ${rewardAmount}, trigger: ${trigger})`);
  } catch (error) {
    console.error('Error tracking reward_earned:', error);
  }
};

export const trackAdEvent = async (
  adType: string, // 'interstitial', 'rewarded', 'banner'
  adAction: string, // 'triggered', 'loaded', 'failed', 'viewed', 'closed', 'earned_reward', 'not_available'
  adPlacement: string, // 'game_over', 'level_up', 'user_requested', 'home_banner', 'generic', etc.
  levelId: number // Mettre 0 si hors jeu (ex: accueil)
) => {
  try {
    await analytics().logEvent('ad_event', {
      ad_type: adType,
      ad_action: adAction,
      ad_placement: adPlacement,
      level_id: levelId
    });
    console.log(`Analytics: ad_event logged (type: ${adType}, action: ${adAction}, placement: ${adPlacement})`);
  } catch (error) {
    console.error('Error tracking ad_event:', error);
  }
};

/**
 * Erreurs et problèmes
 */
export const trackError = async (errorType: string, errorMessage: string, screen: string) => {
  try {
    // Limiter la longueur du message d'erreur
    const limitedMessage = errorMessage?.substring(0, 100) || 'Unknown error message';
    await analytics().logEvent('error_occurred', {
      error_type: errorType,
      error_message: limitedMessage,
      screen_context: screen // Utiliser un nom de paramètre différent de 'screen_name'
    });
    console.warn(`Analytics: error_occurred event logged (type: ${errorType}, screen: ${screen})`);
  } catch (error) {
    console.error('Error tracking error_occurred event itself:', error);
  }
};

/**
 * Engagement utilisateur et autres événements personnalisés
 */
export const trackLeaderboardViewed = async (leaderboardType: string) => { // 'daily', 'monthly', 'allTime', 'summary'
  try {
    await analytics().logEvent('leaderboard_viewed', {
      leaderboard_type: leaderboardType
    });
    console.log(`Analytics: leaderboard_viewed event logged (type: ${leaderboardType})`);
  } catch (error) {
    console.error('Error tracking leaderboard_viewed:', error);
  }
};

export const trackDisclaimerViewed = async () => {
  try {
    await analytics().logEvent('disclaimer_viewed');
    console.log('Analytics: disclaimer_viewed event logged');
  } catch (error) {
    console.error('Error tracking disclaimer_viewed:', error);
  }
};

export const trackNewHighScore = async (oldScore: number, newScore: number) => {
  try {
    await analytics().logEvent('new_high_score', {
      // Ne pas envoyer old_score si c'était le premier score (0)
      // previous_score: oldScore > 0 ? oldScore : undefined,
      score: newScore, // Paramètre standard pour la valeur associée à l'événement
      // improvement: newScore - oldScore // Peut être calculé dans Firebase/BigQuery
    });
    console.log(`Analytics: new_high_score event logged (score: ${newScore})`);
  } catch (error) {
    console.error('Error tracking new_high_score:', error);
  }
};

export const trackAppState = async (state: 'background' | 'active', timeLeft?: number, currentLevel?: number, currentScore?: number) => {
  try {
    const eventName = state === 'background' ? 'app_backgrounded' : 'app_foregrounded';
    const params: Record<string, any> = {};

    // N'ajouter les paramètres que s'ils sont définis et pertinents
    if (state === 'background') {
        if (timeLeft !== undefined) params.time_left = Math.round(timeLeft);
        if (currentLevel !== undefined) params.current_level = currentLevel;
        if (currentScore !== undefined) params.current_score = currentScore;
    }

    await analytics().logEvent(eventName, params);
    console.log(`Analytics: ${eventName} event logged`, params);
  } catch (error) {
    console.error(`Error tracking app state (${state}):`, error);
  }
};

// ---- Fonctions de Tracking Génériques ----

/**
 * Enregistre un événement personnalisé non couvert par les fonctions spécifiques.
 * @param name - Nom de l'événement (snake_case recommandé)
 * @param params - Paramètres associés (valeurs primitives recommandées)
 */
export const logCustomEvent = async (name: string, params: Record<string, any> = {}) => {
  try {
    // Nettoyer les paramètres : s'assurer que les valeurs sont des types supportés
    const sanitizedParams: Record<string, string | number | boolean | null> = {};
    for (const key in params) {
      if (Object.prototype.hasOwnProperty.call(params, key)) {
        const value = params[key];
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
           // Limiter la longueur des strings pour éviter les erreurs Firebase
           sanitizedParams[key] = typeof value === 'string' ? value.substring(0, 100) : value;
        } else if (typeof value === 'undefined') {
           // Ignorer les undefined
        }
         else {
           // Convertir d'autres types en string (ex: objets, arrays - attention, perte d'info)
           sanitizedParams[key] = String(value).substring(0, 100);
        }
      }
    }

    await analytics().logEvent(name, sanitizedParams);
    console.log(`Analytics: Custom event '${name}' logged`, sanitizedParams);
  } catch (error) {
    console.error(`Analytics error tracking custom event '${name}':`, error);
  }
};

/**
 * Définit une propriété utilisateur personnalisée.
 * @param key - Nom de la propriété (snake_case recommandé)
 * @param value - Valeur de la propriété (sera convertie en string ou null)
 */
export const setUserProp = async (key: string, value: any) => {
  try {
    // Firebase attend une string ou null pour les user properties.
    // Convertir explicitement et gérer le null.
    const stringValue = value === null || typeof value === 'undefined' ? null : String(value);
    await analytics().setUserProperty(key, stringValue);
    console.log(`Analytics: User property '${key}' set to '${stringValue}'`);
  } catch (error) {
    console.error(`Analytics error setting user property '${key}':`, error);
  }
};


// ---- Objet Exporté ----

/**
 * Export centralisé de toutes les fonctions d'analytics.
 * Utilisation : import { FirebaseAnalytics } from '../lib/firebase';
 *              FirebaseAnalytics.screen('Home');
 *              FirebaseAnalytics.logEvent('custom_button_click', { button_id: 'abc' });
 */
export const FirebaseAnalytics = {
  // Initialisation & Base
  initialize: initializeAnalytics,
  setUserProperty: setUserProp, // Fonction générique pour les propriétés
  appOpen: trackAppOpen,
  screen: trackNavigation,
  appState: trackAppState,

  // Gameplay
  gameStarted: trackGameStarted,
  levelStarted: trackLevelStarted,
  question: trackQuestionAnswered,
  streak: trackStreakAchieved,
  levelCompleted: trackLevelCompleted,
  gameOver: trackGameOver,
  newHighScore: trackNewHighScore, // Déplacé ici car lié à la fin de partie

  // Récompenses & Monétisation
  reward: trackRewardEarned,
  ad: trackAdEvent,

  // Engagement & Autres
  leaderboard: trackLeaderboardViewed,
  disclaimer: trackDisclaimerViewed,

  // Erreurs
  error: trackError,

  // Fonction générique pour les événements non couverts
  logEvent: logCustomEvent,
};