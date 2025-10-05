import { Database } from '../supabase/database.types';

// Types pour les quêtes et achievements
export type QuestType = 'volume' | 'streak' | 'precision' | 'skill' | 'score';
export type AchievementType = 'rank' | 'streak' | 'games' | 'score' | 'skill';

export type AchievementRecord = Database['public']['Tables']['achievements']['Row'];
export type DailyQuest = Database['public']['Tables']['daily_quests']['Row'];
export type QuestProgress = Database['public']['Tables']['quest_progress']['Row'];
export type UserAchievement = Database['public']['Tables']['user_achievements']['Row'];

// Interface pour les quêtes avec progression
export interface QuestWithProgress extends DailyQuest {
  progress: QuestProgress | null;
}

// Interface pour les templates d'achievements (constants dans le code)
export interface AchievementTemplate {
  achievement_key: string;
  achievement_type: AchievementType;
  title: string;
  description: string;
  xp_bonus: number;
  icon: string;
}

// Configuration des achievements disponibles (synchronisé avec la base de données)
export const ACHIEVEMENTS: Record<string, AchievementTemplate> = {
  // Achievements de rang (réduits car automatiques)
  reach_baron: {
    achievement_key: 'reach_baron',
    achievement_type: 'rank',
    title: 'Baron Accompli',
    description: 'Atteindre le rang de Baron',
    xp_bonus: 300,
    icon: '👑',
  },
  reach_vicomte: {
    achievement_key: 'reach_vicomte',
    achievement_type: 'rank',
    title: 'Vicomte Émérite',
    description: 'Atteindre le rang de Vicomte',
    xp_bonus: 500,
    icon: '👑',
  },
  reach_comte: {
    achievement_key: 'reach_comte',
    achievement_type: 'rank',
    title: 'Comte Prestigieux',
    description: 'Atteindre le rang de Comte',
    xp_bonus: 1000,
    icon: '👑',
  },
  reach_marquis: {
    achievement_key: 'reach_marquis',
    achievement_type: 'rank',
    title: 'Marquis Illustre',
    description: 'Atteindre le rang de Marquis',
    xp_bonus: 2000,
    icon: '👑',
  },
  reach_duc: {
    achievement_key: 'reach_duc',
    achievement_type: 'rank',
    title: 'Duc Magnifique',
    description: 'Atteindre le rang de Duc',
    xp_bonus: 3000,
    icon: '👑',
  },

  // Achievements de streak (augmentés car difficiles)
  streak_7: {
    achievement_key: 'streak_7',
    achievement_type: 'streak',
    title: 'Semaine Parfaite',
    description: 'Jouer 7 jours d\'affilée',
    xp_bonus: 2000,
    icon: '🔥',
  },
  streak_30: {
    achievement_key: 'streak_30',
    achievement_type: 'streak',
    title: 'Mois Légendaire',
    description: 'Jouer 30 jours d\'affilée',
    xp_bonus: 8000,
    icon: '🔥',
  },

  // Achievements de parties (rééquilibrés)
  games_50: {
    achievement_key: 'games_50',
    achievement_type: 'games',
    title: 'Joueur Assidu',
    description: 'Jouer 50 parties',
    xp_bonus: 1000,
    icon: '🎮',
  },
  games_100: {
    achievement_key: 'games_100',
    achievement_type: 'games',
    title: 'Centurion',
    description: 'Jouer 100 parties',
    xp_bonus: 2000,
    icon: '🎮',
  },
  games_500: {
    achievement_key: 'games_500',
    achievement_type: 'games',
    title: 'Vétéran',
    description: 'Jouer 500 parties',
    xp_bonus: 5000,
    icon: '🎮',
  },

  // Achievements de score (ajustés pour le nouveau système)
  high_score_5000: {
    achievement_key: 'high_score_5000',
    achievement_type: 'score',
    title: 'Première Étape',
    description: 'Atteindre 5000 points en une partie',
    xp_bonus: 300,
    icon: '⭐',
  },
  high_score_10000: {
    achievement_key: 'high_score_10000',
    achievement_type: 'score',
    title: 'Expert',
    description: 'Atteindre 10000 points en une partie',
    xp_bonus: 800,
    icon: '⭐',
  },
  high_score_20000: {
    achievement_key: 'high_score_20000',
    achievement_type: 'score',
    title: 'Virtuose',
    description: 'Atteindre 20000 points en une partie',
    xp_bonus: 2000,
    icon: '⭐',
  },
  high_score_50000: {
    achievement_key: 'high_score_50000',
    achievement_type: 'score',
    title: 'Maître Absolu',
    description: 'Atteindre 50000 points en une partie',
    xp_bonus: 5000,
    icon: '⭐',
  },

  // Achievements de skill
  speed_demon: {
    achievement_key: 'speed_demon',
    achievement_type: 'skill',
    title: 'Éclair',
    description: 'Répondre à 20 questions en moins de 3s chacune',
    xp_bonus: 1000,
    icon: '⚡',
  },
  ancient_master: {
    achievement_key: 'ancient_master',
    achievement_type: 'skill',
    title: 'Maître Antique',
    description: 'Répondre correctement à 50 événements avant l\'an 0',
    xp_bonus: 1200,
    icon: '🏛️',
  },
  precision_master: {
    achievement_key: 'precision_master',
    achievement_type: 'skill',
    title: 'Précision Absolue',
    description: 'Deviner 10 dates à ±5 ans (mode Précision)',
    xp_bonus: 2000,
    icon: '🎯',
  },
};

/**
 * Vérifie si une quête est complétée
 */
export function checkQuestCompletion(
  currentValue: number,
  targetValue: number
): boolean {
  return currentValue >= targetValue;
}

/**
 * Calcule le pourcentage de progression d'une quête
 */
export function getQuestProgressPercentage(
  currentValue: number,
  targetValue: number
): number {
  return Math.min(100, Math.round((currentValue / targetValue) * 100));
}

/**
 * Détermine si un achievement doit être débloqué basé sur les critères
 */
export function shouldUnlockAchievement(
  achievementKey: string,
  userData: {
    title_key?: string;
    current_streak?: number;
    games_played?: number;
    high_score?: number;
  }
): boolean {
  // Achievements de rang
  if (achievementKey === 'reach_baron' && userData.title_key === 'baron') return true;
  if (achievementKey === 'reach_vicomte' && userData.title_key === 'vicomte') return true;
  if (achievementKey === 'reach_comte' && userData.title_key === 'comte') return true;
  if (achievementKey === 'reach_marquis' && userData.title_key === 'marquis') return true;
  if (achievementKey === 'reach_duc' && userData.title_key === 'duc') return true;

  // Achievements de streak
  if (achievementKey === 'streak_7' && (userData.current_streak || 0) >= 7) return true;
  if (achievementKey === 'streak_30' && (userData.current_streak || 0) >= 30) return true;

  // Achievements de parties
  if (achievementKey === 'games_50' && (userData.games_played || 0) >= 50) return true;
  if (achievementKey === 'games_100' && (userData.games_played || 0) >= 100) return true;
  if (achievementKey === 'games_500' && (userData.games_played || 0) >= 500) return true;

  // Achievements de score
  if (achievementKey === 'high_score_5000' && (userData.high_score || 0) >= 5000) return true;
  if (achievementKey === 'high_score_10000' && (userData.high_score || 0) >= 10000) return true;
  if (achievementKey === 'high_score_20000' && (userData.high_score || 0) >= 20000) return true;
  if (achievementKey === 'high_score_50000' && (userData.high_score || 0) >= 50000) return true;

  return false;
}
