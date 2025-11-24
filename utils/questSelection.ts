import { supabase } from '@/lib/supabase/supabaseClients';
import type { DailyQuest } from '@/lib/economy/quests';
import Constants from 'expo-constants';

const QUEST_LOG_ENABLED = (() => {
  try {
    const flag = Constants.expoConfig?.extra?.EXPO_PUBLIC_QUEST_LOGS;
    return flag === 'verbose';
  } catch { }
  return false;
})();

const questLog = (..._args: unknown[]) => {
  if (!QUEST_LOG_ENABLED) return;
  // Quest logs intentionally disabled to avoid noisy output.
};

/**
 * Génère une seed basée sur la date du jour
 * Permet d'avoir les mêmes quêtes pour tous les utilisateurs un jour donné
 */
function getDailySeed(): number {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  // Seed unique par jour
  return year * 10000 + month * 100 + day;
}

/**
 * Générateur de nombres aléatoires avec seed (Linear Congruential Generator)
 */
function seededRandom(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648;
    return value / 2147483648;
  };
}

/**
 * Mélange un tableau avec une seed (Fisher-Yates shuffle)
 */
function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  const random = seededRandom(seed);

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Sélectionne 3 quêtes quotidiennes aléatoires pour aujourd'hui
 * Utilise une seed basée sur la date pour que tous les utilisateurs aient les mêmes quêtes
 */
export async function selectDailyQuests(): Promise<DailyQuest[]> {
  try {
    // Récupérer toutes les quêtes quotidiennes (pool)
    const { data: allDailyQuests, error } = await supabase
      .from('daily_quests')
      .select('*')
      .eq('quest_type', 'daily')
      .eq('is_active', true);

    if (error) throw error;
    if (!allDailyQuests || allDailyQuests.length === 0) {
      throw new Error('Aucune quête quotidienne disponible');
    }

    // Mélanger avec la seed du jour
    const seed = getDailySeed();
    const shuffled = shuffleWithSeed(allDailyQuests, seed);

    // Prendre les 3 premières
    return shuffled.slice(0, 3) as DailyQuest[];
  } catch (err) {
    console.error('Erreur lors de la sélection des quêtes quotidiennes:', err);
    return [];
  }
}

/**
 * Récupère les 3 quêtes hebdomadaires actives
 */
export async function getWeeklyQuests(): Promise<DailyQuest[]> {
  try {
    const { data, error } = await supabase
      .from('daily_quests')
      .select('*')
      .eq('quest_type', 'weekly')
      .eq('is_active', true)
      .limit(3);

    if (error) throw error;
    return (data || []) as DailyQuest[];
  } catch (err) {
    console.error('Erreur lors de la récupération des quêtes hebdomadaires:', err);
    return [];
  }
}

/**
 * Récupère les 3 quêtes mensuelles actives
 */
export async function getMonthlyQuests(): Promise<DailyQuest[]> {
  try {
    const { data, error } = await supabase
      .from('daily_quests')
      .select('*')
      .eq('quest_type', 'monthly')
      .eq('is_active', true)
      .limit(3);

    if (error) throw error;
    return (data || []) as DailyQuest[];
  } catch (err) {
    console.error('Erreur lors de la récupération des quêtes mensuelles:', err);
    return [];
  }
}

/**
 * Calcule la date de reset en fonction du type de quête
 */
function getResetDate(questType: 'daily' | 'weekly' | 'monthly'): string {
  const now = new Date();

  if (questType === 'daily') {
    // Reset demain à minuit
    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0);
    return tomorrow.toISOString();
  } else if (questType === 'weekly') {
    // Reset lundi prochain à minuit
    const nextMonday = new Date(now);
    const dayOfWeek = nextMonday.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // Si dimanche, +1, sinon jours jusqu'au prochain lundi
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);
    return nextMonday.toISOString();
  } else {
    // Reset le 1er du mois prochain à minuit
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);
    return nextMonth.toISOString();
  }
}

/**
 * Initialise la progression pour toutes les quêtes
 */
async function initializeQuestProgress(userId: string, quests: DailyQuest[]): Promise<void> {
  const progressEntries = quests.map(quest => {
    const resetAt = getResetDate(quest.quest_type as 'daily' | 'weekly' | 'monthly');

    return {
      user_id: userId,
      quest_key: quest.quest_key,
      current_value: 0,
      completed: false,
      reset_at: resetAt,
    };
  });

  const { error } = await supabase
    .from('quest_progress')
    .insert(progressEntries);

  if (error) {
    console.error('[QUESTS INIT] ❌ Erreur insert:', error);
    throw error;
  }
}

/**
 * Vérifie et nettoie les quêtes expirées (reset quotidien/hebdomadaire/mensuel)
 */
async function cleanExpiredQuests(userId: string): Promise<void> {
  try {
    const now = new Date();

    // Supprimer les progressions expirées (reset_at < maintenant)
    const { error: deleteError } = await supabase
      .from('quest_progress')
      .delete()
      .eq('user_id', userId)
      .lt('reset_at', now.toISOString());

    if (deleteError) {
      console.error('[QUESTS CLEAN] Erreur suppression quêtes expirées:', deleteError);
    } else {
      questLog('[QUESTS CLEAN] ✅ Nettoyage des quêtes expirées effectué');
    }
  } catch (error) {
    console.error('[QUESTS CLEAN] Erreur:', error);
  }
}

/**
 * Récupère toutes les quêtes (daily, weekly, monthly) avec leur progression
 * OPTIMISÉ: Lazy loading - crée les quêtes uniquement à la demande
 */
export async function getAllQuestsWithProgress(userId: string) {
  try {
    // Nettoyer les quêtes expirées avant de récupérer
    await cleanExpiredQuests(userId);

    // Récupérer les quêtes sélectionnées
    const [dailyQuests, weeklyQuests, monthlyQuests] = await Promise.all([
      selectDailyQuests(),
      getWeeklyQuests(),
      getMonthlyQuests(),
    ]);

    const allQuests = [...dailyQuests, ...weeklyQuests, ...monthlyQuests];

    // Récupérer la progression de l'utilisateur
    const { data: progressData, error: progressError } = await supabase
      .from('quest_progress')
      .select('*')
      .eq('user_id', userId);

    if (progressError) throw progressError;

    // LAZY LOADING: Créer les quêtes manquantes (nouvelles quêtes ajoutées ou premier accès)
    const existingQuestKeys = new Set(progressData?.map(p => p.quest_key) || []);
    const missingQuests = allQuests.filter(q => !existingQuestKeys.has(q.quest_key));

    if (missingQuests.length > 0) {
      questLog('[QUESTS LAZY] 🔄 Création de', missingQuests.length, 'quêtes manquantes pour user:', userId);
      await initializeQuestProgress(userId, missingQuests);

      // Récupérer à nouveau après ajout
      const { data: updatedProgressData } = await supabase
        .from('quest_progress')
        .select('*')
        .eq('user_id', userId);

      questLog('[QUESTS LAZY] ✅ Total:', updatedProgressData?.length || 0, 'quêtes');

      const mapQuestsWithProgress = (quests: DailyQuest[]) =>
        quests.map((quest) => ({
          ...quest,
          progress: updatedProgressData?.find((p) => p.quest_key === quest.quest_key) || null,
        }));

      return {
        daily: mapQuestsWithProgress(dailyQuests),
        weekly: mapQuestsWithProgress(weeklyQuests),
        monthly: mapQuestsWithProgress(monthlyQuests),
      };
    }

    // Combiner les quêtes avec leur progression
    const mapQuestsWithProgress = (quests: DailyQuest[]) =>
      quests.map((quest) => ({
        ...quest,
        progress: progressData?.find((p) => p.quest_key === quest.quest_key) || null,
      }));

    return {
      daily: mapQuestsWithProgress(dailyQuests),
      weekly: mapQuestsWithProgress(weeklyQuests),
      monthly: mapQuestsWithProgress(monthlyQuests),
    };
  } catch (err) {
    console.error('[QUESTS] ❌ Erreur getAllQuestsWithProgress:', err);
    return {
      daily: [],
      weekly: [],
      monthly: [],
    };
  }
}
