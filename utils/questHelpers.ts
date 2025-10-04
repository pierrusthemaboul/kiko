import { supabase } from '@/lib/supabase/supabaseClients';

/**
 * Retourne le timestamp de minuit aujourd'hui en ISO
 */
export function getTodayResetTime(): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
}

/**
 * Retourne le timestamp de minuit demain en ISO
 */
export function getTomorrowResetTime(): string {
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString();
}

/**
 * Vérifie si les quêtes doivent être réinitialisées
 * @param lastResetAt - Date ISO du dernier reset
 */
export function shouldResetQuests(lastResetAt: string | null): boolean {
  if (!lastResetAt) return true;

  const lastReset = new Date(lastResetAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return lastReset < today;
}

/**
 * Initialise les quêtes quotidiennes pour un utilisateur
 * Crée les entrées dans quest_progress pour toutes les quêtes actives
 */
export async function initializeDailyQuests(userId: string): Promise<void> {
  try {
    // Récupérer toutes les quêtes quotidiennes disponibles
    const { data: dailyQuests, error: questsError } = await supabase
      .from('daily_quests')
      .select('quest_key');

    if (questsError) throw questsError;
    if (!dailyQuests || dailyQuests.length === 0) {
      console.warn('Aucune quête quotidienne trouvée');
      return;
    }

    const tomorrowReset = getTomorrowResetTime();

    // Créer les entrées de progression pour chaque quête
    const progressEntries = dailyQuests.map(quest => ({
      user_id: userId,
      quest_key: quest.quest_key,
      current_value: 0,
      completed: false,
      reset_at: tomorrowReset,
    }));

    const { error: insertError } = await supabase
      .from('quest_progress')
      .insert(progressEntries);

    if (insertError) throw insertError;

    console.log(`✅ Quêtes quotidiennes initialisées pour l'utilisateur ${userId}`);
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des quêtes:', error);
    throw error;
  }
}

/**
 * Réinitialise les quêtes quotidiennes pour un utilisateur
 * Supprime les anciennes entrées et en crée de nouvelles
 */
export async function resetDailyQuests(userId: string): Promise<void> {
  try {
    // Supprimer les anciennes progressions
    const { error: deleteError } = await supabase
      .from('quest_progress')
      .delete()
      .eq('user_id', userId);

    if (deleteError) throw deleteError;

    // Réinitialiser les quêtes
    await initializeDailyQuests(userId);

    console.log(`🔄 Quêtes quotidiennes réinitialisées pour l'utilisateur ${userId}`);
  } catch (error) {
    console.error('Erreur lors du reset des quêtes:', error);
    throw error;
  }
}

/**
 * Vérifie si c'est un nouveau jour de jeu pour l'utilisateur
 * Compare la dernière date de jeu avec aujourd'hui
 */
export function isNewDay(lastPlayDate: string | null): boolean {
  if (!lastPlayDate) return true;

  const lastPlay = new Date(lastPlayDate);
  const today = new Date();

  lastPlay.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return lastPlay.getTime() !== today.getTime();
}

/**
 * Calcule le nouveau streak basé sur la dernière date de jeu
 * @param lastPlayDate - Dernière date de jeu (ISO string)
 * @param currentStreak - Streak actuel
 * @returns Le nouveau streak
 */
export function calculateNewStreak(
  lastPlayDate: string | null,
  currentStreak: number
): number {
  if (!lastPlayDate) {
    // Première partie
    return 1;
  }

  const lastPlay = new Date(lastPlayDate);
  const today = new Date();

  lastPlay.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffInDays = Math.floor(
    (today.getTime() - lastPlay.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffInDays === 0) {
    // Même jour, pas de changement
    return currentStreak;
  } else if (diffInDays === 1) {
    // Jour consécutif
    return currentStreak + 1;
  } else {
    // Streak cassé
    return 1;
  }
}

/**
 * Retourne la date d'aujourd'hui en format YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}
