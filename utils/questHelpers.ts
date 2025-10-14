import { supabase } from '@/lib/supabase/supabaseClients';

/**
 * Retourne le timestamp de minuit aujourd'hui en ISO (heure française UTC+1/UTC+2)
 * IMPORTANT: Utilise l'heure locale du système. Si ton serveur est en UTC,
 * le reset se fera à minuit UTC (= 1h-2h du matin en France)
 */
export function getTodayResetTime(): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
}

/**
 * Retourne le timestamp de minuit demain en ISO (heure française UTC+1/UTC+2)
 */
export function getTomorrowResetTime(): string {
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString();
}

/**
 * Retourne le timestamp de minuit aujourd'hui en heure française (Europe/Paris)
 */
export function getTodayResetTimeFrance(): string {
  // Créer une date à minuit en heure française
  const formatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;

  // Construire la date à minuit en heure française
  const dateStr = `${year}-${month}-${day}T00:00:00`;
  const parisDate = new Date(dateStr + '+01:00'); // Heure d'hiver (ajuster selon besoin)

  return parisDate.toISOString();
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
 * Calcule la date de reset en fonction du type de quête
 */
function getResetDateByType(questType: 'daily' | 'weekly' | 'monthly'): string {
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
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
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
 * Initialise les quêtes quotidiennes pour un utilisateur
 * Crée les entrées dans quest_progress pour toutes les quêtes actives
 */
export async function initializeDailyQuests(userId: string): Promise<void> {
  try {
    // Récupérer toutes les quêtes disponibles (daily, weekly, monthly)
    const { data: allQuests, error: questsError } = await supabase
      .from('daily_quests')
      .select('quest_key, quest_type')
      .eq('is_active', true);

    if (questsError) throw questsError;
    if (!allQuests || allQuests.length === 0) {
      console.warn('Aucune quête trouvée');
      return;
    }

    // Créer les entrées de progression pour chaque quête avec le bon reset_at
    const progressEntries = allQuests.map(quest => ({
      user_id: userId,
      quest_key: quest.quest_key,
      current_value: 0,
      completed: false,
      reset_at: getResetDateByType(quest.quest_type as 'daily' | 'weekly' | 'monthly'),
    }));

    const { error: insertError } = await supabase
      .from('quest_progress')
      .insert(progressEntries);

    if (insertError) throw insertError;

    console.log(`✅ Quêtes initialisées pour l'utilisateur ${userId}`);
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
