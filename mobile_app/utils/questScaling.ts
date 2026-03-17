import type { DailyQuest, QuestWithProgress } from '@/lib/economy/quests';
import type { Rank } from '@/lib/economy/ranks';

/**
 * SYSTÈME DE SCALING DES QUÊTES PAR GRADE
 *
 * Ce module adapte automatiquement la difficulté des quêtes en fonction du grade du joueur.
 * Les quêtes deviennent progressivement plus difficiles à mesure que le joueur progresse.
 */

export type QuestTier = 'debutant' | 'intermediaire' | 'avance' | 'expert';

/**
 * Détermine le tier d'un joueur en fonction de son index de grade
 */
export function getPlayerTier(rankIndex: number): QuestTier {
  if (rankIndex <= 3) return 'debutant'; // Page -> Chevalier Banneret (0-3)
  if (rankIndex <= 7) return 'intermediaire'; // Baronnet -> Seigneur (4-7)
  if (rankIndex <= 11) return 'avance'; // Comte -> Margrave (8-11)
  return 'expert'; // Duc et au-delà (12+)
}

/**
 * Configuration des multiplicateurs de difficulté par tier
 */
const TIER_MULTIPLIERS: Record<QuestTier, { score: number; volume: number; xp: number }> = {
  debutant: { score: 1.0, volume: 1.0, xp: 1.0 },
  intermediaire: { score: 2.5, volume: 1.5, xp: 1.5 },
  avance: { score: 5.0, volume: 2.0, xp: 2.5 },
  expert: { score: 10.0, volume: 2.5, xp: 3.5 },
};

/**
 * Règles de scaling spécifiques pour certaines quêtes
 */
interface QuestScalingRule {
  questKeyPattern: RegExp;
  baseValues: {
    debutant: { target: number; xp: number; description: string };
    intermediaire: { target: number; xp: number; description: string };
    avance: { target: number; xp: number; description: string };
    expert: { target: number; xp: number; description: string };
  };
}

const QUEST_SCALING_RULES: QuestScalingRule[] = [
  // Quêtes de score quotidiennes (valeurs x7 pour plus de challenge)
  {
    questKeyPattern: /daily_score_(500|1000|3000|5000)/,
    baseValues: {
      debutant: { target: 7000, xp: 100, description: 'Atteindre 7 000 points en une partie' },
      intermediaire: { target: 35000, xp: 300, description: 'Atteindre 35 000 points en une partie' },
      avance: { target: 70000, xp: 600, description: 'Atteindre 70 000 points en une partie' },
      expert: { target: 105000, xp: 900, description: 'Atteindre 105 000 points en une partie' },
    },
  },
  // Quête de gros score quotidien (valeurs x7)
  {
    questKeyPattern: /daily_score_10000/,
    baseValues: {
      debutant: { target: 35000, xp: 300, description: 'Atteindre 35 000 points en une partie' },
      intermediaire: { target: 70000, xp: 600, description: 'Atteindre 70 000 points en une partie' },
      avance: { target: 105000, xp: 900, description: 'Atteindre 105 000 points en une partie' },
      expert: { target: 140000, xp: 1200, description: 'Atteindre 140 000 points en une partie' },
    },
  },
  // Quêtes de score hebdomadaires (valeurs x7)
  {
    questKeyPattern: /weekly_score_(5000|50000|champion_50000)/,
    baseValues: {
      debutant: { target: 70000, xp: 1000, description: 'Atteindre 70 000 points en une partie' },
      intermediaire: { target: 140000, xp: 1500, description: 'Atteindre 140 000 points en une partie' },
      avance: { target: 245000, xp: 2500, description: 'Atteindre 245 000 points en une partie' },
      expert: { target: 350000, xp: 3500, description: 'Atteindre 350 000 points en une partie' },
    },
  },
  // Quêtes de score mensuelles (score unique) (valeurs x7)
  {
    questKeyPattern: /monthly_(score_20000|high_score)/,
    baseValues: {
      debutant: { target: 105000, xp: 1500, description: 'Atteindre 105 000 points en une partie' },
      intermediaire: { target: 175000, xp: 2500, description: 'Atteindre 175 000 points en une partie' },
      avance: { target: 280000, xp: 4000, description: 'Atteindre 280 000 points en une partie' },
      expert: { target: 420000, xp: 6000, description: 'Atteindre 420 000 points en une partie' },
    },
  },
  // Quêtes de score cumulé mensuelles (valeurs x7)
  {
    questKeyPattern: /monthly_score_(100000|200000)/,
    baseValues: {
      debutant: { target: 350000, xp: 2000, description: 'Cumuler 350 000 points dans le mois' },
      intermediaire: { target: 1050000, xp: 5000, description: 'Cumuler 1 050 000 points dans le mois' },
      avance: { target: 2100000, xp: 10000, description: 'Cumuler 2 100 000 points dans le mois' },
      expert: { target: 3500000, xp: 15000, description: 'Cumuler 3 500 000 points dans le mois' },
    },
  },
  // Quêtes de volume (nombre de parties) - Valeurs raisonnables pour parties
  {
    questKeyPattern: /weekly_play_15/,
    baseValues: {
      debutant: { target: 20, xp: 500, description: 'Jouer 20 parties dans la semaine' },
      intermediaire: { target: 40, xp: 800, description: 'Jouer 40 parties dans la semaine' },
      avance: { target: 60, xp: 1200, description: 'Jouer 60 parties dans la semaine' },
      expert: { target: 100, xp: 2000, description: 'Jouer 100 parties dans la semaine' },
    },
  },
  {
    questKeyPattern: /monthly_play_50/,
    baseValues: {
      debutant: { target: 100, xp: 2000, description: 'Jouer 100 parties dans le mois' },
      intermediaire: { target: 200, xp: 3500, description: 'Jouer 200 parties dans le mois' },
      avance: { target: 350, xp: 5000, description: 'Jouer 350 parties dans le mois' },
      expert: { target: 500, xp: 7000, description: 'Jouer 500 parties dans le mois' },
    },
  },
  // Quêtes de streak (valeurs x7 pour être vraiment challengeant)
  {
    questKeyPattern: /daily_(high_)?streak/,
    baseValues: {
      debutant: { target: 70, xp: 400, description: 'Faire une série de 70 bonnes réponses d\'affilée' },
      intermediaire: { target: 105, xp: 600, description: 'Faire une série de 105 bonnes réponses d\'affilée' },
      avance: { target: 140, xp: 900, description: 'Faire une série de 140 bonnes réponses d\'affilée' },
      expert: { target: 175, xp: 1200, description: 'Faire une série de 175 bonnes réponses d\'affilée' },
    },
  },
  {
    questKeyPattern: /weekly_(streak_15|long_streak)/,
    baseValues: {
      debutant: { target: 105, xp: 800, description: 'Faire une série de 105 bonnes réponses d\'affilée' },
      intermediaire: { target: 175, xp: 1200, description: 'Faire une série de 175 bonnes réponses d\'affilée' },
      avance: { target: 245, xp: 2000, description: 'Faire une série de 245 bonnes réponses d\'affilée' },
      expert: { target: 350, xp: 3000, description: 'Faire une série de 350 bonnes réponses d\'affilée' },
    },
  },
];

/**
 * Adapte une quête en fonction du tier du joueur
 *
 * IMPORTANT: Le scaling est désactivé car les valeurs de base dans Supabase
 * sont déjà correctement configurées (x7). Les quêtes sont retournées telles quelles.
 */
export function scaleQuest(quest: DailyQuest, playerTier: QuestTier): DailyQuest {
  // SCALING DÉSACTIVÉ - Les valeurs dans Supabase sont déjà optimales
  // Les quêtes sont retournées sans modification
  return quest;

  /* ANCIEN CODE DE SCALING - CONSERVÉ POUR RÉFÉRENCE
  // Chercher une règle de scaling correspondante
  for (const rule of QUEST_SCALING_RULES) {
    if (rule.questKeyPattern.test(quest.quest_key)) {
      const scaledValues = rule.baseValues[playerTier];
      return {
        ...quest,
        target_value: scaledValues.target,
        xp_reward: scaledValues.xp,
        description: scaledValues.description,
      };
    }
  }

  // Si aucune règle spécifique, retourner la quête inchangée
  return quest;
  */
}

/**
 * Adapte une liste de quêtes en fonction du tier du joueur
 */
export function scaleQuests(quests: DailyQuest[], playerTier: QuestTier): DailyQuest[] {
  return quests.map(quest => scaleQuest(quest, playerTier));
}

/**
 * Adapte les quêtes avec progression en fonction du tier du joueur
 */
export function scaleQuestsWithProgress(
  quests: QuestWithProgress[],
  playerTier: QuestTier
): QuestWithProgress[] {
  return quests.map(quest => ({
    ...scaleQuest(quest, playerTier),
    progress: quest.progress,
  }));
}

/**
 * Obtient une description du tier pour l'affichage
 */
export function getTierDescription(tier: QuestTier): string {
  const descriptions: Record<QuestTier, string> = {
    debutant: 'Débutant (Page → Chevalier Banneret)',
    intermediaire: 'Intermédiaire (Baronnet → Seigneur)',
    avance: 'Avancé (Comte → Margrave)',
    expert: 'Expert (Duc et au-delà)',
  };
  return descriptions[tier];
}

/**
 * Obtient le tier suivant
 */
export function getNextTier(tier: QuestTier): QuestTier | null {
  const tiers: QuestTier[] = ['debutant', 'intermediaire', 'avance', 'expert'];
  const currentIndex = tiers.indexOf(tier);
  return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
}
