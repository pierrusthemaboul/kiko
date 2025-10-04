import { supabase } from 'lib/supabase/supabaseClients';
import type { Database } from 'lib/supabase/database.types';
import { pointsToXP } from 'lib/economy/convert';
import { partiesPerDayFromXP, rankFromXP } from 'lib/economy/ranks';
import { calculateNewStreak, getTodayDateString } from '@/utils/questHelpers';
import { shouldUnlockAchievement, ACHIEVEMENTS } from './quests';

type GameMode = 'classic' | 'date';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type RunsRow = Database['public']['Tables']['runs']['Row'];
type RunsInsert = Database['public']['Tables']['runs']['Insert'];

type ApplyParams = { runId: string; userId: string; mode: GameMode; points: number };

type ApplySummary = {
  xpEarned: number;
  newXp: number;
  rank: { key: string; label: string; partiesPerDay: number };
  leveledUp: boolean;
  newStreak?: number;
  unlockedAchievements?: string[];
};

function ensureProfile(profile: ProfileRow | null, userId: string): ProfileRow {
  if (!profile) {
    throw new Error(`Profile not found for user ${userId}`);
  }

  return profile;
}

function runAlreadyProcessed(run: RunsRow | null | undefined): boolean {
  if (!run) {
    return false;
  }

  if (run.economy_applied_at) {
    return true;
  }

  if (run.processed_at) {
    return true;
  }

  if (typeof run.xp_earned === 'number' && typeof run.new_xp === 'number') {
    return true;
  }

  return false;
}

function buildRunPayload(params: {
  existingRun: RunsRow | null;
  userId: string;
  mode: GameMode;
  points: number;
  xpEarned: number;
  oldXp: number;
  newXp: number;
  rank: { key: string; label: string; partiesPerDay: number };
  leveledUp: boolean;
  timestamp: string;
}): RunsInsert | Partial<RunsRow> {
  const { existingRun, userId, mode, points, xpEarned, oldXp, newXp, rank, leveledUp, timestamp } = params;

  const payload: RunsInsert | Partial<RunsRow> = {
    user_id: userId,
    mode,
    points,
    xp_earned: xpEarned,
    old_xp: oldXp,
    new_xp: newXp,
    rank_key: rank.key,
    rank_label: rank.label,
    parties_per_day: rank.partiesPerDay,
    leveled_up: leveledUp,
    economy_applied_at: timestamp,
  };

  if (existingRun?.id) {
    (payload as Partial<RunsRow>).updated_at = timestamp;
  } else {
    (payload as RunsInsert).created_at = timestamp;
  }

  return payload;
}

export async function applyEndOfRunEconomy({ runId, userId, mode, points }: ApplyParams): Promise<ApplySummary> {
  const safePoints = Number.isFinite(points) ? points : 0;
  const xpEarned = pointsToXP(safePoints, mode);

  const { data: existingRun, error: runFetchError } = await supabase
    .from('runs')
    .select('*')
    .eq('id', runId)
    .maybeSingle();

  if (runFetchError) {
    throw new Error(`Failed to load run history: ${runFetchError.message}`);
  }

  let runRecord = existingRun;

  if (!runRecord) {
    const { data: insertedRun, error: runInsertError } = await supabase
      .from('runs')
      .insert({
        id: runId,
        user_id: userId,
        mode,
        points: safePoints,
      })
      .select('*')
      .single();

    if (runInsertError) {
      throw new Error(`Failed to create run record: ${runInsertError.message}`);
    }

    runRecord = insertedRun;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('xp_total, title_key, parties_per_day, current_streak, best_streak, last_play_date, games_played, high_score')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Failed to load profile: ${profileError.message}`);
  }

  const safeProfile = ensureProfile(profile, userId);
  const currentStoredXp = safeProfile.xp_total ?? 0;

  if (runAlreadyProcessed(runRecord)) {
    const currentRank = rankFromXP(currentStoredXp);

    return {
      xpEarned: runRecord?.xp_earned ?? xpEarned,
      newXp: currentStoredXp,
      rank: {
        key: currentRank.key,
        label: currentRank.label,
        partiesPerDay: currentRank.partiesPerDay,
      },
      leveledUp: Boolean(runRecord?.leveled_up ?? false),
    };
  }

  const previousRank = rankFromXP(currentStoredXp);
  const newXp = currentStoredXp + xpEarned;
  const rank = rankFromXP(newXp);
  const newPartiesPerDay = partiesPerDayFromXP(newXp);
  const leveledUp = rank.label !== previousRank.label;
  const timestamp = new Date().toISOString();

  // Calculer le nouveau streak
  const currentStreak = safeProfile.current_streak ?? 0;
  const bestStreak = safeProfile.best_streak ?? 0;
  const lastPlayDate = safeProfile.last_play_date;
  const newStreak = calculateNewStreak(lastPlayDate, currentStreak);
  const newBestStreak = Math.max(newStreak, bestStreak);
  const todayDate = getTodayDateString();

  // Mettre à jour le profil avec XP, rang, et streak
  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update({
      xp_total: newXp,
      title_key: rank.key,
      parties_per_day: newPartiesPerDay,
      current_streak: newStreak,
      best_streak: newBestStreak,
      last_play_date: todayDate,
      games_played: (safeProfile.games_played ?? 0) + 1,
      high_score: Math.max(safeProfile.high_score ?? 0, safePoints),
      updated_at: timestamp,
    })
    .eq('id', userId);

  if (profileUpdateError) {
    throw new Error(`Failed to update profile: ${profileUpdateError.message}`);
  }

  // Mettre à jour les quêtes quotidiennes
  await updateDailyQuests(userId, {
    points: safePoints,
    streak: newStreak,
  });

  // Vérifier et débloquer les achievements
  const unlockedAchievements = await checkAndUnlockAchievements(userId, {
    title_key: rank.key,
    current_streak: newStreak,
    games_played: (safeProfile.games_played ?? 0) + 1,
    high_score: Math.max(safeProfile.high_score ?? 0, safePoints),
  });

  const runPayload = buildRunPayload({
    existingRun: runRecord ?? null,
    userId,
    mode,
    points: safePoints,
    xpEarned,
    oldXp: currentStoredXp,
    newXp,
    rank: {
      key: rank.key,
      label: rank.label,
      partiesPerDay: newPartiesPerDay,
    },
    leveledUp,
    timestamp,
  });

  if (runRecord?.id) {
    const { error: runUpdateError } = await supabase
      .from('runs')
      .update(runPayload)
      .eq('id', runRecord.id);

    if (runUpdateError) {
      throw new Error(`Failed to mark run as processed: ${runUpdateError.message}`);
    }
  } else {
    const { error: runInsertError } = await supabase.from('runs').insert(runPayload as RunsInsert);

    if (runInsertError) {
      throw new Error(`Failed to record run: ${runInsertError.message}`);
    }
  }

  return {
    xpEarned,
    newXp,
    rank: {
      key: rank.key,
      label: rank.label,
      partiesPerDay: newPartiesPerDay,
    },
    leveledUp,
    newStreak,
    unlockedAchievements,
  };
}

/**
 * Met à jour les quêtes quotidiennes basées sur la partie jouée
 */
async function updateDailyQuests(
  userId: string,
  gameData: {
    points: number;
    streak: number;
  }
): Promise<void> {
  try {
    // Récupérer la progression des quêtes
    const { data: questProgress, error: fetchError } = await supabase
      .from('quest_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('completed', false);

    if (fetchError) {
      console.error('Erreur récupération quest_progress:', fetchError);
      return;
    }

    if (!questProgress || questProgress.length === 0) return;

    const updates: Array<{ id: string; current_value: number; completed: boolean; completed_at: string | null }> = [];
    const timestamp = new Date().toISOString();

    // Récupérer les templates de quêtes pour les target_value
    const { data: dailyQuests, error: questsError } = await supabase
      .from('daily_quests')
      .select('*');

    if (questsError) {
      console.error('Erreur récupération daily_quests:', questsError);
      return;
    }

    for (const progress of questProgress) {
      const questTemplate = dailyQuests?.find(q => q.quest_key === progress.quest_key);
      if (!questTemplate) continue;

      let shouldUpdate = false;
      let newValue = progress.current_value;

      // Incrémenter les quêtes selon leur type
      if (progress.quest_key === 'daily_play_3') {
        // +1 partie jouée
        newValue = progress.current_value + 1;
        shouldUpdate = true;
      } else if (progress.quest_key === 'daily_streak_5' && gameData.streak >= 5) {
        // Marquer comme complète si streak >= 5
        newValue = questTemplate.target_value;
        shouldUpdate = true;
      } else if (progress.quest_key === 'daily_precision_80') {
        // Calculer la précision (points / max_points_possible)
        // Note: cette logique dépend de votre jeu, à adapter
        const precision = Math.min(100, (gameData.points / 1000) * 100);
        if (precision >= 80) {
          newValue = questTemplate.target_value;
          shouldUpdate = true;
        }
      } else if (progress.quest_key === 'daily_score_500' && gameData.points >= 500) {
        // Marquer comme complète si score >= 500
        newValue = questTemplate.target_value;
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        const isCompleted = newValue >= questTemplate.target_value;
        updates.push({
          id: progress.id,
          current_value: newValue,
          completed: isCompleted,
          completed_at: isCompleted ? timestamp : null,
        });
      }
    }

    // Appliquer les mises à jour
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('quest_progress')
        .update({
          current_value: update.current_value,
          completed: update.completed,
          completed_at: update.completed_at,
          updated_at: timestamp,
        })
        .eq('id', update.id);

      if (updateError) {
        console.error('Erreur mise à jour quest_progress:', updateError);
      }

      // Si la quête est complétée, ajouter l'XP
      if (update.completed && !questProgress.find(q => q.id === update.id)?.completed) {
        const quest = dailyQuests?.find(q => q.key === questProgress.find(qp => qp.id === update.id)?.quest_key);
        if (quest) {
          await awardQuestXP(userId, quest.xp_reward);
        }
      }
    }
  } catch (error) {
    console.error('Erreur dans updateDailyQuests:', error);
  }
}

/**
 * Attribue l'XP d'une quête à l'utilisateur
 */
async function awardQuestXP(userId: string, xpAmount: number): Promise<void> {
  try {
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('xp_total')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    const newXP = (profile?.xp_total || 0) + xpAmount;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ xp_total: newXP })
      .eq('id', userId);

    if (updateError) throw updateError;

    console.log(`🎯 Quête complétée! +${xpAmount} XP`);
  } catch (error) {
    console.error('Erreur attribution XP quête:', error);
  }
}

/**
 * Vérifie et débloque les achievements
 */
async function checkAndUnlockAchievements(
  userId: string,
  userData: {
    title_key: string;
    current_streak: number;
    games_played: number;
    high_score: number;
  }
): Promise<string[]> {
  const unlockedKeys: string[] = [];

  try {
    // Récupérer les achievements déjà débloqués
    const { data: userAchievements, error: fetchError } = await supabase
      .from('user_achievements')
      .select('achievement_key')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('Erreur récupération achievements:', fetchError);
      return unlockedKeys;
    }

    const alreadyUnlocked = new Set(userAchievements?.map(a => a.achievement_key) || []);

    // Parcourir tous les achievements
    for (const [key, achievement] of Object.entries(ACHIEVEMENTS)) {
      if (alreadyUnlocked.has(key)) continue;

      if (shouldUnlockAchievement(key, userData)) {
        // Débloquer l'achievement
        const { error: insertError } = await supabase
          .from('user_achievements')
          .insert({
            user_id: userId,
            achievement_key: key,
            unlocked_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('Erreur débloquage achievement:', insertError);
          continue;
        }

        // Ajouter l'XP
        await awardQuestXP(userId, achievement.xp_bonus);

        unlockedKeys.push(key);
        console.log(`🏆 Achievement débloqué: ${achievement.title} (+${achievement.xp_bonus} XP)`);
      }
    }

    return unlockedKeys;
  } catch (error) {
    console.error('Erreur dans checkAndUnlockAchievements:', error);
    return unlockedKeys;
  }
}
