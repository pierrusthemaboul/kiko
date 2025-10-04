import { Database } from '../supabase/database.types';

// Types pour les quêtes et achievements
export type QuestType = 'daily_play' | 'daily_streak' | 'daily_precision' | 'daily_speed' | 'daily_score';
export type AchievementType = 'rank' | 'streak' | 'games' | 'score';

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

// Configuration des achievements disponibles
export const ACHIEVEMENTS: Record<string, AchievementTemplate> = {
  // Achievements de rang
  reach_baron: {
    achievement_key: 'reach_baron',
    achievement_type: 'rank',
    title: 'Baron',
    description: 'Atteindre le rang de Baron',
    xp_bonus: 500,
    icon: '👑',
  },
  reach_vicomte: {
    achievement_key: 'reach_vicomte',
    achievement_type: 'rank',
    title: 'Vicomte',
    description: 'Atteindre le rang de Vicomte',
    xp_bonus: 1000,
    icon: '👑',
  },
  reach_comte: {
    achievement_key: 'reach_comte',
    achievement_type: 'rank',
    title: 'Comte',
    description: 'Atteindre le rang de Comte',
    xp_bonus: 2000,
    icon: '👑',
  },
  reach_marquis: {
    achievement_key: 'reach_marquis',
    achievement_type: 'rank',
    title: 'Marquis',
    description: 'Atteindre le rang de Marquis',
    xp_bonus: 3000,
    icon: '👑',
  },
  reach_duc: {
    achievement_key: 'reach_duc',
    achievement_type: 'rank',
    title: 'Duc',
    description: 'Atteindre le rang de Duc',
    xp_bonus: 5000,
    icon: '👑',
  },

  // Achievements de streak
  streak_7: {
    achievement_key: 'streak_7',
    achievement_type: 'streak',
    title: 'Semaine parfaite',
    description: 'Jouer 7 jours d\'affilée',
    xp_bonus: 1500,
    icon: '🔥',
  },
  streak_30: {
    achievement_key: 'streak_30',
    achievement_type: 'streak',
    title: 'Mois légendaire',
    description: 'Jouer 30 jours d\'affilée',
    xp_bonus: 5000,
    icon: '🔥',
  },

  // Achievements de parties
  games_50: {
    achievement_key: 'games_50',
    achievement_type: 'games',
    title: 'Joueur assidu',
    description: 'Jouer 50 parties',
    xp_bonus: 1000,
    icon: '🎮',
  },
  games_100: {
    achievement_key: 'games_100',
    achievement_type: 'games',
    title: 'Centurion',
    description: 'Jouer 100 parties',
    xp_bonus: 2500,
    icon: '🎮',
  },
  games_500: {
    achievement_key: 'games_500',
    achievement_type: 'games',
    title: 'Vétéran',
    description: 'Jouer 500 parties',
    xp_bonus: 10000,
    icon: '🎮',
  },

  // Achievements de score
  high_score_1000: {
    achievement_key: 'high_score_1000',
    achievement_type: 'score',
    title: 'Millier',
    description: 'Atteindre 1000 points en une partie',
    xp_bonus: 500,
    icon: '⭐',
  },
  high_score_2000: {
    achievement_key: 'high_score_2000',
    achievement_type: 'score',
    title: 'Double millier',
    description: 'Atteindre 2000 points en une partie',
    xp_bonus: 1500,
    icon: '⭐',
  },
  high_score_5000: {
    achievement_key: 'high_score_5000',
    achievement_type: 'score',
    title: 'Maître absolu',
    description: 'Atteindre 5000 points en une partie',
    xp_bonus: 5000,
    icon: '⭐',
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
  if (achievementKey === 'high_score_1000' && (userData.high_score || 0) >= 1000) return true;
  if (achievementKey === 'high_score_2000' && (userData.high_score || 0) >= 2000) return true;
  if (achievementKey === 'high_score_5000' && (userData.high_score || 0) >= 5000) return true;

  return false;
}
