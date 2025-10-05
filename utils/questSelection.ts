import { supabase } from '@/lib/supabase/supabaseClients';
import type { DailyQuest } from '@/lib/economy/quests';

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
 * Initialise la progression pour toutes les quêtes
 */
async function initializeQuestProgress(userId: string, quests: DailyQuest[]): Promise<void> {
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = tomorrow.toISOString();

  const progressEntries = quests.map(quest => ({
    user_id: userId,
    quest_key: quest.quest_key,
    current_value: 0,
    completed: false,
    reset_at: tomorrowISO,
  }));

  const { error } = await supabase
    .from('quest_progress')
    .insert(progressEntries);

  if (error) {
    console.error('[QUESTS INIT] ❌ Erreur insert:', error);
    throw error;
  }
}

/**
 * Récupère toutes les quêtes (daily, weekly, monthly) avec leur progression
 */
export async function getAllQuestsWithProgress(userId: string) {
  try {
    // Récupérer les quêtes sélectionnées
    const [dailyQuests, weeklyQuests, monthlyQuests] = await Promise.all([
      selectDailyQuests(),
      getWeeklyQuests(),
      getMonthlyQuests(),
    ]);

    // Récupérer la progression de l'utilisateur
    const { data: progressData, error: progressError } = await supabase
      .from('quest_progress')
      .select('*')
      .eq('user_id', userId);

    if (progressError) throw progressError;

    // Si aucune progression n'existe, initialiser les quêtes
    if (!progressData || progressData.length === 0) {
      console.log('[QUESTS INIT] 🚀 Initialisation pour user:', userId);
      await initializeQuestProgress(userId, [...dailyQuests, ...weeklyQuests, ...monthlyQuests]);

      // Récupérer à nouveau après initialisation
      const { data: newProgressData } = await supabase
        .from('quest_progress')
        .select('*')
        .eq('user_id', userId);

      console.log('[QUESTS INIT] ✅ Créé:', newProgressData?.length || 0, 'entrées');

      const mapQuestsWithProgress = (quests: DailyQuest[]) =>
        quests.map((quest) => ({
          ...quest,
          progress: newProgressData?.find((p) => p.quest_key === quest.quest_key) || null,
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
