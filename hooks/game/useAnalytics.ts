/**
 * Hook pour gérer les analytics du jeu
 * Ce hook est principalement un wrapper autour de FirebaseAnalytics
 * pour centraliser les appels analytics
 */

import { useCallback } from 'react';
import { FirebaseAnalytics } from '../../lib/firebase';

export function useAnalytics() {
  /**
   * Enregistre le démarrage d'une partie
   */
  const trackGameStarted = useCallback((playerName: string, isGuest: boolean, level: number) => {
    FirebaseAnalytics.gameStarted(playerName, isGuest, level);
  }, []);

  /**
   * Enregistre le début d'un niveau
   */
  const trackLevelStarted = useCallback((
    level: number, 
    levelName: string, 
    eventsNeeded: number, 
    currentPoints: number
  ) => {
    FirebaseAnalytics.levelStarted(level, levelName, eventsNeeded, currentPoints);
  }, []);

  /**
   * Enregistre la fin d'un niveau
   */
  const trackLevelCompleted = useCallback((
    level: number,
    levelName: string,
    eventsCompleted: number,
    points: number
  ) => {
    FirebaseAnalytics.levelCompleted(level, levelName, eventsCompleted, points);
  }, []);

  /**
   * Enregistre une réponse à une question
   */
  const trackQuestion = useCallback((
    eventId: string,
    eventTitle: string,
    period: string,
    difficulty: number,
    choice: string,
    isCorrect: boolean,
    responseTime: number,
    level: number,
    streak: number
  ) => {
    FirebaseAnalytics.question(
      eventId,
      eventTitle,
      period,
      difficulty,
      choice,
      isCorrect,
      responseTime,
      level,
      streak
    );
  }, []);

  /**
   * Enregistre un changement dans la série de bonnes réponses
   */
  const trackStreak = useCallback((streak: number, level: number) => {
    FirebaseAnalytics.streak(streak, level);
  }, []);

  /**
   * Enregistre l'obtention d'une récompense
   */
  const trackReward = useCallback((
    type: string,
    amount: number,
    source: string,
    state: string,
    level: number,
    points: number
  ) => {
    FirebaseAnalytics.reward(type, amount, source, state, level, points);
  }, []);

  /**
   * Enregistre un événement publicitaire
   */
  const trackAd = useCallback((
    type: string,
    action: string,
    placement: string,
    level: number
  ) => {
    FirebaseAnalytics.trackAd(placement, action, { ad_type: type, level });
  }, []);

  /**
   * Enregistre la fin d'une partie
   */
  const trackGameOver = useCallback((
    points: number,
    level: number,
    eventsCompleted: number,
    maxStreak: number,
    isNewHighScore: boolean
  ) => {
    FirebaseAnalytics.gameOver(
      points,
      level,
      eventsCompleted,
      maxStreak,
      isNewHighScore
    );
  }, []);

  /**
   * Enregistre un changement d'état de l'application
   */
  const trackAppState = useCallback((
    state: string,
    timeLeft?: number,
    level?: number,
    points?: number
  ) => {
    FirebaseAnalytics.appState(state, timeLeft, level, points);
  }, []);

  /**
   * Enregistre un événement d'erreur
   */
  const trackError = useCallback((code: string, message: string, context: string) => {
    FirebaseAnalytics.trackError(code, { message, screen: context });
  }, []);

  /**
   * Enregistre un événement générique
   */
  const trackEvent = useCallback((eventName: string, params?: Record<string, any>) => {
    FirebaseAnalytics.trackEvent(eventName, params);
  }, []);

  /**
   * Définit une propriété utilisateur
   */
  const setUserProperty = useCallback((name: string, value: string) => {
    FirebaseAnalytics.setUserProps({ [name]: value });
  }, []);

  return {
    trackGameStarted,
    trackLevelStarted,
    trackLevelCompleted,
    trackQuestion,
    trackStreak,
    trackReward,
    trackAd,
    trackGameOver,
    trackAppState,
    trackError,
    trackEvent,
    setUserProperty,
  };
}
