// types.ts
// Types partagés pour les hooks du jeu

// Nombre maximum de vies du joueur
export const MAX_LIVES = 3;

// Types de récompenses
export enum RewardType {
  POINTS = 'POINTS',
  EXTRA_LIFE = 'EXTRA_LIFE',
  STREAK_BONUS = 'STREAK_BONUS',
  LEVEL_UP = 'LEVEL_UP'
}

// Périodes historiques
export enum HistoricalPeriod {
  ANTIQUITY = 'ANTIQUITY',        // < 500
  MIDDLE_AGES = 'MIDDLE_AGES',    // 500-1500
  RENAISSANCE = 'RENAISSANCE',    // 1500-1800
  NINETEENTH = 'NINETEENTH',      // 1800-1900
  TWENTIETH = 'TWENTIETH',        // 1900-2000
  TWENTYFIRST = 'TWENTYFIRST'     // > 2000
}

// Interface pour un événement historique
export interface Event {
  id: string;
  titre: string;
  date: string;
  date_formatee?: string;
  illustration_url: string;
  niveau_difficulte: number;
  types_evenement: string[];
  notoriete?: number | null;
  description?: string;
  description_detaillee?: string;
  frequency_score?: number;
  last_used?: string;
}

// Interface pour le profil utilisateur
export interface User {
  name: string;
  points: number;
  lives: number;
  level: number;
  eventsCompletedInLevel: number;
  totalEventsCompleted: number;
  streak: number;
  maxStreak: number;
  performanceStats: {
    typeSuccess: Record<string, any>;
    periodSuccess: Record<string, any>;
    overallAccuracy: number;
    averageResponseTime: number;
  };
}

// Interface pour le résumé d'un événement dans un niveau
export interface LevelEventSummary {
  id: string;
  titre: string;
  date: string;
  date_formatee: string;
  illustration_url: string;
  wasCorrect: boolean;
  responseTime: number;
  description_detaillee?: string;
}

// Interface pour l'historique d'un niveau
export interface LevelHistory {
  level: number;
  events: LevelEventSummary[];
}

// Interface pour les statistiques par période historique
export interface HistoricalPeriodStats {
  successes: number;
  attempts: number;
  accuracy: number;
}

// Interface pour la maîtrise d'une catégorie
export interface CategoryMastery {
  level: number;
  progress: number;
  successes: number;
  attempts: number;
}

// Interface pour un bonus actif
export interface ActiveBonus {
  type: string;
  multiplier: number;
  expiresAt: number;
}

// Interface pour la configuration d'un niveau avec des extensions
export interface ExtendedLevelConfig {
  name?: string;
  eventsNeeded: number;
  timeGap: {
    minimum: number;
    base: number;
    maximum: number;
  };
  scoring: {
    basePoints: number;
    timeMultiplier: number;
    streakMultiplier: number;
    comboThreshold: number;
  };
  eventsSummary: LevelEventSummary[];
  pointsReward?: number;
}
