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
 * Génère une seed basée sur la date du jour en heure française
 */
function getDailySeed(): number {
  const now = new Date();
  const options = { timeZone: 'Europe/Paris', year: 'numeric', month: 'numeric', day: 'numeric' } as const;
  const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(now);

  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0');
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');

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
 * Sélectionne 3 quêtes quotidiennes adaptées au grade du joueur
 * 1. Détermine le Tier (1-4)
 * 2. Filtre par Tier
 * 3. Sélectionne 3 catégories différentes
 * 4. Applique un scaling intra-tier (+5% par grade dans le tier)
 */

function scaleTargetValue(baseValue: number, rankIndex: number): number {
  // Le tier change tous les 4 grades
  // On applique +5% par grade au-dessus du début du tier
  const progressInTier = rankIndex % 4;
  const multiplier = 1 + (progressInTier * 0.05);

  // Pour les petits nombres (ex: 3 parties), on arrondit à l'entier
  // Pour les grands nombres (ex: 10 000 points), on arrondit à la centaine la plus proche pour que ce soit "beau"
  const scaled = baseValue * multiplier;
  if (scaled >= 1000) {
    return Math.round(scaled / 100) * 100;
  }
  return Math.ceil(scaled);
}

export async function selectDailyQuests(rankIndex: number = 0): Promise<DailyQuest[]> {
  try {
    // Déterminer le tier de difficulté (1 à 4)
    // Page(0)-Chevalier(3) -> Tier 1
    // Baronnet(4)-Seigneur(7) -> Tier 2
    // Comte(8)-Margrave(11) -> Tier 3
    // Duc(12)+ -> Tier 4
    let difficultyTier = 1;
    if (rankIndex >= 12) difficultyTier = 4;
    else if (rankIndex >= 8) difficultyTier = 3;
    else if (rankIndex >= 4) difficultyTier = 2;

    // Récupérer toutes les quêtes quotidiennes actives du tier correspondant
    const { data: allDailyQuests, error } = await supabase
      .from('daily_quests')
      .select('*')
      .eq('quest_type', 'daily')
      .eq('is_active', true)
      .eq('difficulty', difficultyTier);

    if (error) throw error;

    if (!allDailyQuests || allDailyQuests.length < 3) {
      // Fallback : si pas assez de quêtes dans le tier, on prend tout le daily actif
      const { data: fallbackQuests } = await supabase
        .from('daily_quests')
        .select('*')
        .eq('quest_type', 'daily')
        .eq('is_active', true);

      const seed = getDailySeed();
      return shuffleWithSeed(fallbackQuests || [], seed).slice(0, 3) as DailyQuest[];
    }

    // Sélection intelligente par catégorie pour éviter les doublons de type (ex: 3 scores)
    const seed = getDailySeed();
    const shuffled = shuffleWithSeed(allDailyQuests, seed);

    const selected: DailyQuest[] = [];
    const usedCategories = new Set<string>();

    // Premier passage : on essaie de prendre des catégories uniques
    for (const q of shuffled) {
      const cat = (q as any).category || 'general';
      if (!usedCategories.has(cat)) {
        selected.push(q as DailyQuest);
        usedCategories.add(cat);
      }
      if (selected.length >= 3) break;
    }

    // Appliquer le scaling intra-tier sur les objets sélectionnés
    return selected.map(q => ({
      ...q,
      target_value: scaleTargetValue(q.target_value, rankIndex)
    }));

    // Deuxième passage : si on n'a pas encore 3 quêtes (rare), on complète avec le reste
    if (selected.length < 3) {
      for (const q of shuffled) {
        if (!selected.find(s => s.quest_key === q.quest_key)) {
          selected.push(q as DailyQuest);
        }
        if (selected.length >= 3) break;
      }
    }

    return selected;
  } catch (err) {
    console.error('Erreur lors de la sélection des quêtes quotidiennes:', err);
    return [];
  }
}

/**
 * Récupère les 3 quêtes hebdomadaires adaptées au grade du joueur
 */
export async function getWeeklyQuests(rankIndex: number = 0): Promise<DailyQuest[]> {
  try {
    let difficultyTier = 1;
    if (rankIndex >= 12) difficultyTier = 4;
    else if (rankIndex >= 8) difficultyTier = 3;
    else if (rankIndex >= 4) difficultyTier = 2;

    const { data, error } = await supabase
      .from('daily_quests')
      .select('*')
      .eq('quest_type', 'weekly')
      .eq('is_active', true)
      .eq('difficulty', difficultyTier);

    if (error) throw error;

    let selected = data || [];
    if (selected.length === 0) {
      // Fallback si pas de quêtes pour ce tier spécifique
      const { data: fallback } = await supabase
        .from('daily_quests')
        .select('*')
        .eq('quest_type', 'weekly')
        .eq('is_active', true);
      selected = fallback || [];
    }

    // Prendre 3 au hasard (ou seedé)
    const seed = getDailySeed();
    const result = shuffleWithSeed(selected, seed + 1).slice(0, 3) as DailyQuest[];

    // Appliquer le scaling
    return result.map(q => ({
      ...q,
      target_value: scaleTargetValue(q.target_value, rankIndex)
    }));
  } catch (err) {
    console.error('Erreur lors de la récupération des quêtes hebdomadaires:', err);
    return [];
  }
}

/**
 * Récupère les 3 quêtes mensuelles adaptées au grade du joueur
 */
export async function getMonthlyQuests(rankIndex: number = 0): Promise<DailyQuest[]> {
  try {
    let difficultyTier = 1;
    if (rankIndex >= 12) difficultyTier = 4;
    else if (rankIndex >= 8) difficultyTier = 3;
    else if (rankIndex >= 4) difficultyTier = 2;

    const { data, error } = await supabase
      .from('daily_quests')
      .select('*')
      .eq('quest_type', 'monthly')
      .eq('is_active', true)
      .eq('difficulty', difficultyTier);

    if (error) throw error;

    let selected = data || [];
    if (selected.length === 0) {
      const { data: fallback } = await supabase
        .from('daily_quests')
        .select('*')
        .eq('quest_type', 'monthly')
        .eq('is_active', true);
      selected = fallback || [];
    }

    const seed = getDailySeed();
    const result = shuffleWithSeed(selected, seed + 2).slice(0, 3) as DailyQuest[];

    // Appliquer le scaling
    return result.map(q => ({
      ...q,
      target_value: scaleTargetValue(q.target_value, rankIndex)
    }));
  } catch (err) {
    console.error('Erreur lors de la récupération des quêtes mensuelles:', err);
    return [];
  }
}

/**
 * Calcule la date de reset en fonction du type de quête (Heure Française)
 */
function getResetDate(questType: 'daily' | 'weekly' | 'monthly'): string {
  // Obtenir la date actuelle à Paris de manière robuste via Intl
  const now = new Date();
  const options = { timeZone: 'Europe/Paris', year: 'numeric', month: 'numeric', day: 'numeric' } as const;
  const parts = new Intl.DateTimeFormat('en-US', options).formatToParts(now);

  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1');
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');

  // On utilise Date.UTC pour les calculs afin d'éviter les effets de bord du timezone local du device
  // On construit un objet Date représentant minuit aujourd'hui à Paris (en UTC pour le calcul)
  const currentParisMidnight = new Date(Date.UTC(year, month - 1, day));
  const resetDate = new Date(currentParisMidnight);

  if (questType === 'daily') {
    // Reset demain à minuit Paris
    resetDate.setUTCDate(resetDate.getUTCDate() + 1);
  } else if (questType === 'weekly') {
    // Reset lundi prochain à minuit Paris
    // getUTCDay: 0=Dim, 1=Lun, ..., 6=Sam
    const dayOfWeek = currentParisMidnight.getUTCDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    resetDate.setUTCDate(resetDate.getUTCDate() + daysUntilMonday);
  } else {
    // Reset le 1er du mois prochain à minuit Paris
    resetDate.setUTCMonth(resetDate.getUTCMonth() + 1);
    resetDate.setUTCDate(1);
  }

  // Formatage manuel de la date au format ISO sans millisecondes avec offset fixe +01:00
  // (Note: l'offset +01:00 est conservé pour la compatibilité avec l'existant,
  // Supabase convertira correctement en UTC lors de l'insertion)
  const Y = resetDate.getUTCFullYear();
  const M = String(resetDate.getUTCMonth() + 1).padStart(2, '0');
  const D = String(resetDate.getUTCDate()).padStart(2, '0');

  return `${Y}-${M}-${D}T00:00:00+01:00`;
}

/**
 * Initialise la progression pour toutes les quêtes
 */
async function initializeQuestProgress(userId: string, quests: DailyQuest[]): Promise<void> {
  // Vérifier que l'utilisateur est valide (pas null ou vide)
  if (!userId || userId === 'null' || userId === 'undefined') {
    console.warn('[QUESTS INIT] ⚠️ Tentative d\'initialisation avec userId invalide, abandon');
    return;
  }

  const progressEntries = quests.map(quest => {
    const resetAt = getResetDate(quest.quest_type as 'daily' | 'weekly' | 'monthly');

    return {
      user_id: userId,
      quest_key: quest.quest_key,
      current_value: 0,
      completed: false,
      reset_at: resetAt,
    } as any;
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
 * NOUVELLE FONCTIONNALITÉ: Scaling automatique par grade
 */
export async function getAllQuestsWithProgress(userId: string, rankIndex: number = 0) {
  try {
    // Vérifier que l'utilisateur est valide avant toute opération
    if (!userId || userId === 'null' || userId === 'undefined') {
      console.warn('[QUESTS] ⚠️ userId invalide, retour de quêtes vides');
      return {
        daily: [],
        weekly: [],
        monthly: [],
      };
    }

    // Nettoyer les quêtes expirées avant de récupérer
    await cleanExpiredQuests(userId);

    // Récupérer les quêtes sélectionnées (Passage du rankIndex pour le filtrage par Tier)
    const [dailyQuests, weeklyQuests, monthlyQuests] = await Promise.all([
      selectDailyQuests(rankIndex),
      getWeeklyQuests(rankIndex),
      getMonthlyQuests(rankIndex),
    ]);

    // IMPORTANT: Le scaling dynamique est désactivé car les quêtes sont désormais
    // pré-équilibrées par Tier dans la base de données.
    const allQuests = [...dailyQuests, ...weeklyQuests, ...monthlyQuests];

    questLog('[QUESTS] 🎯 Rank Index:', rankIndex);

    // Récupérer la progression de l'utilisateur
    const { data: progressData, error: progressError } = await supabase
      .from('quest_progress')
      .select('*')
      .eq('user_id', userId);

    if (progressError) throw progressError;

    // LAZY LOADING: Créer les quêtes manquantes (nouvelles quêtes ajoutées ou premier accès)
    const existingQuestKeys = new Set((progressData as any[])?.map((p: any) => p.quest_key) || []);
    const missingQuests = allQuests.filter(q => !existingQuestKeys.has(q.quest_key));

    if (missingQuests.length > 0) {
      questLog('[QUESTS LAZY] 🔄 Création de', missingQuests.length, 'quêtes manquantes pour user:', userId);
      await initializeQuestProgress(userId, missingQuests);

      // Récupérer à nouveau après ajout
      const { data: updatedProgressData } = await supabase
        .from('quest_progress')
        .select('*')
        .eq('user_id', userId);

      questLog('[QUESTS LAZY] ✅ Total:', (updatedProgressData as any[])?.length || 0, 'quêtes');

      const mapQuestsWithProgress = (qs: DailyQuest[]) =>
        qs.map((quest) => ({
          ...quest,
          progress: (updatedProgressData as any[])?.find((p: any) => p.quest_key === quest.quest_key) || null,
        }));

      return {
        daily: mapQuestsWithProgress(dailyQuests),
        weekly: mapQuestsWithProgress(weeklyQuests),
        monthly: mapQuestsWithProgress(monthlyQuests),
      };
    }

    // Combiner les quêtes avec leur progression
    const mapQuestsWithProgress = (qs: DailyQuest[]) =>
      qs.map((quest) => ({
        ...quest,
        progress: (progressData as any[])?.find((p: any) => p.quest_key === quest.quest_key) || null,
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
