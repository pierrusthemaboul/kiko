import { useState, useCallback } from 'react';
import { LEVEL_CONFIGS } from '../levelConfigs';
import { 
  HistoricalPeriod, 
  LevelEventSummary,
  CategoryMastery,
  HistoricalPeriodStats
} from '../types';

/**
 * Hook pour gérer le scoring et les performances du joueur
 */
export function usePerformance() {
  // États pour le tracking des performances
  const [periodStats, setPeriodStats] = useState<Record<HistoricalPeriod, HistoricalPeriodStats>>({});
  const [categoryMastery, setCategoryMastery] = useState<Record<string, CategoryMastery>>({});
  const [eventHistory, setEventHistory] = useState<{ type: string; period: string; success: boolean; }[]>([]);
  const [performanceStats, setPerformanceStats] = useState<{
    typeSuccess: Record<string, number>;
    periodSuccess: Record<string, number>;
    overallAccuracy: number;
  }>({
    typeSuccess: {},
    periodSuccess: {},
    overallAccuracy: 0
  });

  // Suivi des événements de niveau
  const [currentLevelEvents, setCurrentLevelEvents] = useState<LevelEventSummary[]>([]);
  const [levelCompletedEvents, setLevelCompletedEvents] = useState<LevelEventSummary[]>([]);

  /**
   * Met à jour les statistiques de performance après une réponse
   */
  const updatePerformanceStats = useCallback((type: string, period: string, success: boolean) => {
    setPerformanceStats((prev) => {
      // Logique de calcul interne
      const typeAttempts = (prev.typeSuccess[type] ? prev.typeSuccess[type][1] : 0) + 1;
      const typeSuccesses = (prev.typeSuccess[type] ? prev.typeSuccess[type][0] : 0) + (success ? 1 : 0);
      const periodAttempts = (prev.periodSuccess[period] ? prev.periodSuccess[period][1] : 0) + 1;
      const periodSuccesses = (prev.periodSuccess[period] ? prev.periodSuccess[period][0] : 0) + (success ? 1 : 0);
      const totalAttempts = eventHistory.length;
      const totalSuccesses = eventHistory.filter(e => e.success).length + (success ? 1 : 0);
      
      const newAccuracy = totalAttempts > 0 ? totalSuccesses / totalAttempts : 0;

      return {
        typeSuccess: {
          ...prev.typeSuccess,
          [type]: [typeSuccesses, typeAttempts], // Stocke [successes, attempts]
        },
        periodSuccess: {
          ...prev.periodSuccess,
          [period]: [periodSuccesses, periodAttempts], // Stocke [successes, attempts]
        },
        overallAccuracy: newAccuracy,
      };
    });
    
    // Mise à jour de l'historique des événements
    setEventHistory(prev => {
      const lastEntryIndex = prev.length - 1;
      if (lastEntryIndex >= 0 && prev[lastEntryIndex].success === false) { 
        const updatedHistory = [...prev];
        updatedHistory[lastEntryIndex] = { ...prev[lastEntryIndex], success: success };
        return updatedHistory;
      }
      return [...prev, { type, period, success }];
    });
  }, [eventHistory]);

  /**
   * Calcule les points gagnés pour une réponse correcte - VERSION ÉQUILIBRÉE
   */
  const calculatePoints = useCallback(
    (timeLeft: number, difficulty: number, currentStreak: number, userLevel: number): number => {
      try {
        const config = LEVEL_CONFIGS[userLevel];
        if (!config) {
          return 0; // Sécurité
        }

        // Points de base RÉDUITS pour éviter l'inflation
        const basePoints = Math.max(30, (config.scoring.basePoints || 50) * 0.6); // Réduction de 40%

        // Multiplicateur temps (max 1.8 au lieu de 2.5)
        const timeMultiplier = Math.max(1, Math.min(1 + (timeLeft / 20) * (config.scoring.timeMultiplier || 1) * 0.8, 1.8));

        // Multiplicateur streak RÉDUIT (max 1.5 au lieu de 3.0)
        const streakBonus = Math.min(currentStreak * 0.05, 0.5); // Max +50% au lieu de +200%
        const streakMultiplier = 1 + streakBonus;

        const calculatedPoints = Math.floor(basePoints * timeMultiplier * streakMultiplier);
        
        return Math.max(10, calculatedPoints); // Minimum 10 points pour une bonne réponse
      } catch (error) {
        return 10; // Retourner un minimum en cas d'erreur
      }
    },
    [] // Pas de dépendances externes
  );

  /**
   * Enregistre un événement de niveau complété
   */
  const addEventToLevel = useCallback((eventSummary: LevelEventSummary) => {
    setCurrentLevelEvents(prev => [...prev, eventSummary]);
    setLevelCompletedEvents(prev => [...prev, eventSummary]);
  }, []);

  /**
   * Réinitialise les événements de niveau complétés
   */
  const resetLevelCompletedEvents = useCallback(() => {
    setLevelCompletedEvents([]);
  }, []);

  /**
   * Réinitialise les événements de niveau courant
   */
  const resetCurrentLevelEvents = useCallback(() => {
    setCurrentLevelEvents([]);
  }, []);

  return {
    // États
    periodStats,
    categoryMastery,
    eventHistory,
    performanceStats,
    currentLevelEvents,
    levelCompletedEvents,

    // Fonctions
    updatePerformanceStats,
    calculatePoints,
    addEventToLevel,
    resetLevelCompletedEvents,
    resetCurrentLevelEvents,
    
    // Setters
    setPeriodStats,
    setCategoryMastery,
    setEventHistory,
    setPerformanceStats,
    setCurrentLevelEvents,
    setLevelCompletedEvents
  };
}