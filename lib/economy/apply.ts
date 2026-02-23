import { supabase } from 'lib/supabase/supabaseClients';
import type { Database } from 'lib/supabase/database.types';
import { pointsToXP } from 'lib/economy/convert';
import { partiesPerDayFromXP, rankFromXP } from 'lib/economy/ranks';
import { calculateNewStreak, getTodayDateString } from '@/utils/questHelpers';
import { shouldUnlockAchievement, ACHIEVEMENTS } from './quests';
import Constants from 'expo-constants';
import { FirebaseAnalytics } from 'lib/firebase';

const ECONOMY_LOG_ENABLED = (() => {
  try {
    const flag = Constants.expoConfig?.extra?.EXPO_PUBLIC_ECONOMY_LOGS;
    return flag === 'verbose';
  } catch { }
  return false;
})();

const shouldSkipQuestLog = (args: unknown[]) => {
  const [first] = args;
  return typeof first === 'string' && first.toLowerCase().includes('[quests]');
};

const economyLog = (...args: unknown[]) => {
  if (!ECONOMY_LOG_ENABLED || shouldSkipQuestLog(args)) return;
  console.log(...args);
};

const economyWarn = (...args: unknown[]) => {
  if (!ECONOMY_LOG_ENABLED || shouldSkipQuestLog(args)) return;
  console.warn(...args);
};

type GameMode = 'classic' | 'date' | 'precision';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type RunsRow = Database['public']['Tables']['runs']['Row'];
type RunsInsert = Database['public']['Tables']['runs']['Insert'];

type ApplyParams = {
  runId: string;
  userId: string;
  mode: GameMode;
  points: number;
  gameStats?: {
    totalAnswers?: number;
    correctAnswers?: number;
    perfectRound?: boolean;
    speedMaster?: boolean;
    noMistakes?: number;
    maxAnswerStreak?: number;
  };
};

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

export async function applyEndOfRunEconomy({ runId, userId, mode, points, gameStats }: ApplyParams): Promise<ApplySummary> {
  economyLog('[ECONOMY] ===== DEBUT applyEndOfRunEconomy =====');
  economyLog('[ECONOMY] Params:', { runId, userId, mode, points, gameStats });
  economyLog('[ECONOMY] 📍 User ID:', userId);
  economyLog('[ECONOMY] 🎮 Mode:', mode);
  economyLog('[ECONOMY] 🎯 Points:', points);

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
  const rankPartiesPerDay = partiesPerDayFromXP(newXp);
  // Ne jamais écraser les bonus de quêtes : garder le max entre le rang et la valeur actuelle
  const newPartiesPerDay = Math.max(rankPartiesPerDay, safeProfile.parties_per_day ?? 0);
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
  const updatePayload = {
    xp_total: newXp,
    title_key: rank.key,
    parties_per_day: newPartiesPerDay,
    current_streak: newStreak,
    best_streak: newBestStreak,
    last_play_date: todayDate,
    games_played: (safeProfile.games_played ?? 0) + 1,
    high_score: Math.max(safeProfile.high_score ?? 0, safePoints),
    updated_at: timestamp,
  };

  economyLog('[ECONOMY] 📝 UPDATE payload:', JSON.stringify(updatePayload, null, 2));
  economyLog('[ECONOMY] 📝 newXp value:', newXp, 'type:', typeof newXp, 'isNaN:', Number.isNaN(newXp));

  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId);

  if (profileUpdateError) {
    economyLog('[ECONOMY] ❌ Profile update error:', profileUpdateError);
    throw new Error(`Failed to update profile: ${profileUpdateError.message}`);
  }

  // Mettre à jour les quêtes quotidiennes
  economyLog('[ECONOMY] 📋 ===== APPEL updateDailyQuests =====');
  economyLog('[ECONOMY] 📋 User ID:', userId);
  economyLog('[ECONOMY] 📋 Points partie:', safePoints);
  economyLog('[ECONOMY] 📋 Streak:', newStreak);
  economyLog('[ECONOMY] 📋 Mode:', mode);
  economyLog('[ECONOMY] 📋 Game stats:', gameStats);
  await updateDailyQuests(userId, {
    points: safePoints,
    streak: newStreak,
    mode,
    gameStats,
  });
  economyLog('[ECONOMY] ✅ updateDailyQuests terminé');

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
 * Vérifie combien de modes différents ont été joués dans une période
 * @returns Le nombre de modes différents joués (0, 1, ou 2)
 */
async function checkModesPlayed(
  userId: string,
  period: 'daily' | 'weekly',
  currentMode: GameMode
): Promise<number> {
  try {
    // Calculer la date de début selon la période
    const now = new Date();
    let startDate: Date;

    if (period === 'daily') {
      // Début de la journée
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
    } else {
      // Début de la semaine (lundi)
      startDate = new Date(now);
      const day = startDate.getDay();
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
      startDate.setDate(diff);
      startDate.setHours(0, 0, 0, 0);
    }

    // Récupérer les runs de la période
    const { data: runs, error } = await supabase
      .from('runs')
      .select('mode')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString());

    if (error) {
      console.error('[QUESTS] Erreur checkModesPlayed:', error);
      return 0;
    }

    if (!runs || runs.length === 0) {
      // Première partie de la période, on compte le mode actuel
      return 1;
    }

    // Extraire les modes uniques (incluant le mode actuel)
    const modes = new Set<string>(runs.map(r => r.mode));
    modes.add(currentMode);

    return modes.size;
  } catch (error) {
    console.error('[QUESTS] Erreur checkModesPlayed:', error);
    return 0;
  }
}

/**
 * Met à jour les quêtes quotidiennes basées sur la partie jouée
 */
async function updateDailyQuests(
  userId: string,
  gameData: {
    points: number;
    streak: number;
    mode: GameMode;
    gameStats?: {
      totalAnswers?: number;
      correctAnswers?: number;
      perfectRound?: boolean;
      fastWin?: boolean;
      speedMaster?: boolean;
      noMistakes?: number;
      maxAnswerStreak?: number;
    };
  }
): Promise<void> {
  try {
    economyLog('[QUESTS] 🔍 ===== DEBUT updateDailyQuests =====');
    economyLog('[QUESTS] 🔍 User ID:', userId);
    economyLog('[QUESTS] 🔍 Game data:', gameData);

    // Récupérer la progression des quêtes
    economyLog('[QUESTS] 📊 Récupération de quest_progress...');
    const { data: questProgressData, error: fetchError } = await supabase
      .from('quest_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('completed', false);

    let questProgress = questProgressData;

    economyLog('[QUESTS] 📊 Résultat fetch:', {
      count: questProgress?.length,
      error: fetchError?.message,
      data: questProgress
    });

    if (fetchError) {
      console.error('[QUESTS] ❌ Erreur fetch progress:', fetchError);
      return;
    }

    if (!questProgress || questProgress.length === 0) {
      economyLog('[QUESTS] ⚠️ ===== AUCUNE PROGRESSION TROUVÉE =====');
      economyLog('[QUESTS] ⚠️ User ID recherché:', userId);
      economyLog('[QUESTS] 🔧 Tentative de création automatique des quest_progress...');

      // Récupérer toutes les quêtes actives
      const { data: allActiveQuests, error: allQuestsErr } = await supabase
        .from('daily_quests')
        .select('*')
        .eq('is_active', true);

      if (allQuestsErr) {
        console.error('[QUESTS] ❌ Erreur récupération daily_quests:', allQuestsErr);
        return;
      }

      if (!allActiveQuests || allActiveQuests.length === 0) {
        economyLog('[QUESTS] ⚠️ Aucune quête active dans daily_quests');
        return;
      }

      economyLog(`[QUESTS] 📋 Trouvé ${allActiveQuests.length} quêtes actives, création de quest_progress...`);

      // Calculer la date de reset (lendemain à minuit)
      const tomorrow = new Date();
      tomorrow.setHours(24, 0, 0, 0);
      const resetAt = tomorrow.toISOString();

      // Créer les entrées quest_progress
      const progressToCreate = allActiveQuests.map(quest => ({
        user_id: userId,
        quest_key: quest.quest_key,
        current_value: 0,
        completed: false,
        reset_at: resetAt,
      }));

      const { data: createdProgress, error: createErr } = await supabase
        .from('quest_progress')
        .insert(progressToCreate)
        .select();

      if (createErr) {
        console.error('[QUESTS] ❌ Erreur création quest_progress:', createErr);
        economyLog('[QUESTS] ⚠️ Impossible de créer les quêtes - vérifiez les politiques RLS');
        return;
      }

      economyLog(`[QUESTS] ✅ Créé ${createdProgress?.length || 0} quest_progress`);

      // Récupérer à nouveau les quest_progress non complétés
      const { data: newQuestProgress, error: refetchErr } = await supabase
        .from('quest_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('completed', false);

      if (refetchErr || !newQuestProgress || newQuestProgress.length === 0) {
        console.error('[QUESTS] ❌ Impossible de récupérer quest_progress après création');
        return;
      }

      // Continuer avec les nouvelles données
      questProgress = newQuestProgress;
      economyLog(`[QUESTS] ✅ Continuation avec ${questProgress.length} quêtes non complétées`);
    }

    economyLog('[QUESTS] ✅ Progress trouvé:', questProgress.length, 'quêtes non complétées');

    const updates: Array<{ id: string; current_value: number; completed: boolean; completed_at: string | null }> = [];
    const timestamp = new Date().toISOString();

    // Récupérer les templates de quêtes pour les target_value
    const { data: dailyQuests, error: questsError } = await supabase
      .from('daily_quests')
      .select('*');

    if (questsError) {
      console.error('[QUESTS] Erreur fetch templates:', questsError);
      return;
    }

    economyLog('[QUESTS] Données partie:', { points: gameData.points, streak: gameData.streak, mode: gameData.mode });

    for (const progress of questProgress) {
      economyLog(`[QUESTS] 🎯 Traitement quête: ${progress.quest_key}`);
      const questTemplate = dailyQuests?.find(q => q.quest_key === progress.quest_key);
      if (!questTemplate) {
        economyWarn('[QUESTS] ⚠️ Template non trouvé pour:', progress.quest_key);
        continue;
      }

      let shouldUpdate = false;
      let newValue = progress.current_value;
      const key = progress.quest_key;
      economyLog(`[QUESTS] 📝 ${key}: valeur actuelle=${progress.current_value}, target=${questTemplate.target_value}`);

      // Helpers pour identifier le type de quête par sa clé
      const isPlayQuest = key.startsWith('daily_play_') || key.startsWith('weekly_play_') || key.startsWith('monthly_play_')
        || /^[twm]\d+_play_/.test(key);
      const isDailyScoreOneShot = key.startsWith('daily_score_') || /^t\d+_score_/.test(key);
      const isWeeklyMonthlyScoreCumul = (key.startsWith('weekly_score_') || key.startsWith('monthly_score_')
        || /^[wm]\d+_score_/.test(key) || key.includes('_champion') || key.includes('_points'));
      const isStreakQuest = key.includes('_streak_') || key === 'daily_high_streak' || key === 'weekly_long_streak' || key === 'monthly_streak_master';
      const isBothModes = key === 'daily_both_modes' || key === 'weekly_both_modes' || /^t\d+_both_modes$/.test(key);
      const isSpeedQuest = key === 'daily_speed_master' || /^t\d+_speed_/.test(key);

      // === QUÊTES DE JEU (incrémenter +1 à chaque partie) ===
      if (isPlayQuest) {
        newValue = progress.current_value + 1;
        shouldUpdate = true;
        economyLog(`[QUESTS] ✓ Type: PLAY - ${progress.current_value} → ${newValue}`);
      }
      // === QUÊTES DE SCORE ONE-SHOT (atteindre le score en UNE partie) ===
      // Couvre: daily_score_XXXX, t1_score_XXXX, t2_score_XXXX, etc.
      else if (isDailyScoreOneShot) {
        if (gameData.points >= questTemplate.target_value) {
          newValue = questTemplate.target_value;
          shouldUpdate = true;
          economyLog(`[QUESTS] ✓ Type: DAILY_SCORE - Score ${gameData.points} >= target ${questTemplate.target_value} - COMPLÉTÉE!`);
        } else {
          economyLog(`[QUESTS] ⏭️ Type: DAILY_SCORE - Score ${gameData.points} < target ${questTemplate.target_value} - Pas encore atteint`);
        }
      }
      // === QUÊTES DE SCORE HIGH (meilleur score - one-shot aussi) ===
      else if (key.includes('high_score')) {
        if (gameData.points >= questTemplate.target_value) {
          newValue = questTemplate.target_value;
          shouldUpdate = true;
          economyLog(`[QUESTS] ✓ Type: HIGH_SCORE - Score ${gameData.points} >= target ${questTemplate.target_value}`);
        } else {
          economyLog(`[QUESTS] ⏭️ Type: HIGH_SCORE - Score ${gameData.points} < target ${questTemplate.target_value}`);
        }
      }
      // === QUÊTES DE SCORE CUMULATIF (weekly/monthly - cumule sur plusieurs parties) ===
      // Couvre: weekly_score_XXXX, monthly_score_XXXX, w1_score_XXX, m1_score_XXX, *_champion*, *_points
      else if (isWeeklyMonthlyScoreCumul) {
        newValue = progress.current_value + gameData.points;
        shouldUpdate = true;
        economyLog(`[QUESTS] ✓ Type: SCORE_CUMUL - Ajout de ${gameData.points} points: ${progress.current_value} → ${newValue} (target: ${questTemplate.target_value})`);
      }
      // === QUÊTES DE STREAK (réponses correctes dans la partie) ===
      else if (isStreakQuest) {
        const maxAnswerStreak = gameData.gameStats?.maxAnswerStreak || 0;
        economyLog(`[QUESTS] 📊 Type: STREAK - maxAnswerStreak=${maxAnswerStreak}, target=${questTemplate.target_value}`);
        if (maxAnswerStreak >= questTemplate.target_value) {
          newValue = questTemplate.target_value;
          shouldUpdate = true;
          economyLog(`[QUESTS] ✓ Type: STREAK - Streak atteint!`);
        } else {
          economyLog(`[QUESTS] ⏭️ Type: STREAK - Pas encore atteint`);
        }
      }
      // === QUÊTES BOTH MODES (jouer les 2 modes) ===
      else if (isBothModes) {
        const period = key.startsWith('weekly') ? 'weekly' : 'daily';
        const modesPlayed = await checkModesPlayed(userId, period, gameData.mode);

        if (modesPlayed >= 2) {
          newValue = 2;
          shouldUpdate = true;
          economyLog(`[QUESTS] ✓ Type: BOTH_MODES - Les 2 modes ont été joués (${period})`);
        } else if (modesPlayed === 1) {
          newValue = 1;
          shouldUpdate = true;
          economyLog(`[QUESTS] ⏳ Type: BOTH_MODES - 1/2 modes joués (${period})`);
        }
      }
      // === QUÊTES PARTIE PARFAITE (aucune vie perdue + seuil de réponses) ===
      else if (isSpeedQuest) {
        // noMistakes = totalEventsCompleted si 3 vies restantes (partie parfaite), sinon 0
        const perfectAnswers = gameData.gameStats?.noMistakes || 0;
        if (perfectAnswers >= questTemplate.target_value) {
          newValue = questTemplate.target_value;
          shouldUpdate = true;
          economyLog(`[QUESTS] ✓ Type: PERFECT_GAME - perfectAnswers ${perfectAnswers} >= target ${questTemplate.target_value}`);
        } else {
          economyLog(`[QUESTS] ⏭️ Type: PERFECT_GAME - perfectAnswers ${perfectAnswers} < target ${questTemplate.target_value}`);
        }
      }
      else if (key === 'daily_no_mistake_5' || /^t\d+_no_mistake_/.test(key)) {
        const maxStreak = gameData.gameStats?.maxAnswerStreak || 0;
        if (maxStreak >= questTemplate.target_value) {
          newValue = questTemplate.target_value;
          shouldUpdate = true;
          economyLog(`[QUESTS] ✓ Type: NO_MISTAKE - Streak de ${maxStreak} >= ${questTemplate.target_value} - COMPLÉTÉE!`);
        }
      }
      else if (key === 'daily_precision_perfect' || key === 'weekly_precision_master') {
        if (gameData.mode === 'date' && gameData.gameStats?.perfectRound) {
          newValue = progress.current_value + 1;
          shouldUpdate = true;
        }
      }
      else if (key === 'monthly_daily_login') {
        // Géré ailleurs (connexion quotidienne)
      }
      else if (key === 'monthly_weekly_quests' || key === 'weekly_daily_quests') {
        // Géré par un trigger côté base ou via un système séparé
      }

      if (shouldUpdate) {
        const isCompleted = newValue >= questTemplate.target_value;
        economyLog(`[QUESTS] ✏️ MISE À JOUR: ${key}: ${progress.current_value} → ${newValue}/${questTemplate.target_value} ${isCompleted ? '✅ COMPLÉTÉE' : '⏳ En cours'}`);

        updates.push({
          id: progress.id,
          current_value: newValue,
          completed: isCompleted,
          completed_at: isCompleted ? timestamp : null,
        });

        if (isCompleted) {
          FirebaseAnalytics.trackEvent('quest_completed', {
            quest_key: progress.quest_key,
            quest_type: questTemplate.quest_type || 'daily'
          });
        }
      } else {
        economyLog(`[QUESTS] ⏭️ PAS DE MISE À JOUR pour ${key}`);
      }
    }

    economyLog(`[QUESTS] 📊 ===== RÉSUMÉ DES MISES À JOUR =====`);
    economyLog(`[QUESTS] 📊 Total mises à jour à appliquer:`, updates.length);
    if (updates.length > 0) {
      economyLog(`[QUESTS] 📊 Détails:`, updates.map(u => `ID=${u.id.substring(0, 8)}..., value=${u.current_value}, completed=${u.completed}`));
    }

    // Appliquer les mises à jour
    economyLog(`[QUESTS] 💾 ===== APPLICATION DES MISES À JOUR EN BASE =====`);
    for (const update of updates) {
      economyLog(`[QUESTS] 💾 Updating quest_progress ID=${update.id.substring(0, 8)}...`);
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
        console.error('[QUESTS] ❌ Erreur update DB pour ID', update.id, ':', updateError);
      } else {
        economyLog(`[QUESTS] ✅ Mise à jour réussie pour ID=${update.id.substring(0, 8)}...`);
      }

      // NOTE: L'attribution automatique de l'XP est supprimée.
      // Le joueur doit maintenant cliquer sur "Réclamer" dans l'UI.
    }

    economyLog(`[QUESTS] ✅ ===== FIN updateDailyQuests =====`);
  } catch (error) {
    console.error('[QUESTS] ❌ ===== ERREUR CRITIQUE dans updateDailyQuests =====');
    console.error('[QUESTS] ❌', error);
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

    economyLog(`🎯 Quête complétée! +${xpAmount} XP`);
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

        FirebaseAnalytics.trackEvent('achievement_unlocked', {
          achievement_key: key,
          xp_bonus: achievement.xp_bonus
        });

        unlockedKeys.push(key);
        economyLog(`🏆 Achievement débloqué: ${achievement.title} (+${achievement.xp_bonus} XP)`);
      }
    }

    return unlockedKeys;
  } catch (error) {
    console.error('Erreur dans checkAndUnlockAchievements:', error);
    return unlockedKeys;
  }
}

/**
 * Réclame la récompense d'une quête complétée
 */
export async function claimQuestReward(userId: string, questKey: string): Promise<{ success: boolean; xpEarned: number; partsEarned: number; error?: string }> {
  try {
    // 1. Vérifier la progression
    const { data: progress, error: fetchError } = await supabase
      .from('quest_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('quest_key', questKey)
      .single();

    if (fetchError || !progress) throw new Error('Quête non trouvée');
    if (!progress.completed) throw new Error('Quête non terminée');
    if (progress.claimed) throw new Error('Récompense déjà réclamée');

    // 2. Récupérer les détails de la quête (requête séparée car le JOIN ne fonctionne pas encore)
    const { data: quest, error: questError } = await supabase
      .from('daily_quests')
      .select('*')
      .eq('quest_key', questKey)
      .single();

    if (questError || !quest) throw new Error('Détails de quête manquants');

    const xpAmount = quest.xp_reward || 0;
    const partsAmount = quest.parts_reward || 0;

    // 2. Marquer comme réclamé AVANT de donner les récompenses (éviter les exploits)
    const { error: updateProgressError } = await supabase
      .from('quest_progress')
      .update({ claimed: true, updated_at: new Date().toISOString() })
      .eq('id', progress.id);

    if (updateProgressError) throw updateProgressError;

    // 3. Attribuer les récompenses
    const { data: profile, error: profileFetchError } = await supabase
      .from('profiles')
      .select('xp_total, parties_per_day')
      .eq('id', userId)
      .single();

    if (profileFetchError) throw profileFetchError;

    const newXP = (profile.xp_total || 0) + xpAmount;
    const newParties = (profile.parties_per_day || 0) + partsAmount;

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        xp_total: newXP,
        parties_per_day: newParties,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (profileUpdateError) throw profileUpdateError;

    return { success: true, xpEarned: xpAmount, partsEarned: partsAmount };
  } catch (error: any) {
    console.error('[ECONOMY] Error claiming reward:', error.message);
    return { success: false, xpEarned: 0, partsEarned: 0, error: error.message };
  }
}

/**
 * Change une quête quotidienne (Reroll)
 */
export async function rerollQuest(userId: string, questKey: string, rankIndex: number): Promise<{ success: boolean; newQuest?: any; error?: string }> {
  try {
    // 1. Vérifier le quota de reroll (1 par jour)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('last_reroll_date, reroll_count')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    const today = new Date().toISOString().split('T')[0];
    if (profile.last_reroll_date === today && profile.reroll_count >= 1) {
      throw new Error('Limite de reroll quotidien atteinte (1/jour)');
    }

    // 2. Récupérer la quête actuelle pour connaître son Tier
    const { data: currentProgress, error: fetchError } = await supabase
      .from('quest_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('quest_key', questKey)
      .single();

    if (fetchError || !currentProgress) throw new Error('Quête à changer non trouvée');
    if (currentProgress.completed) throw new Error('Impossible de changer une quête déjà terminée');

    // Récupérer les détails de la quête actuelle (requête séparée)
    const { data: currentQuest, error: questFetchError } = await supabase
      .from('daily_quests')
      .select('*')
      .eq('quest_key', questKey)
      .single();

    if (questFetchError || !currentQuest) throw new Error('Détails de quête manquants');

    const currentDifficulty = currentQuest.difficulty;
    const currentCategory = currentQuest.category;

    // 3. Chercher une nouvelle quête alternative du même Tier et de la même catégorie
    // On exclut les quêtes déjà possédées par le joueur
    const { data: userProgress } = await supabase
      .from('quest_progress')
      .select('quest_key')
      .eq('user_id', userId);

    const excludedKeys = userProgress?.map(p => p.quest_key) || [];

    const { data: availableQuests, error: availError } = await supabase
      .from('daily_quests')
      .select('*')
      .eq('quest_type', 'daily')
      .eq('is_active', true)
      .eq('difficulty', currentDifficulty)
      .eq('category', currentCategory)
      .not('quest_key', 'in', `(${excludedKeys.join(',')})`);

    if (availError || !availableQuests || availableQuests.length === 0) {
      // Si pas de même catégorie, on prend n'importe quelle catégorie du même tier
      const { data: anyQuests } = await supabase
        .from('daily_quests')
        .select('*')
        .eq('quest_type', 'daily')
        .eq('is_active', true)
        .eq('difficulty', currentDifficulty)
        .not('quest_key', 'in', `(${excludedKeys.join(',')})`);

      if (!anyQuests || anyQuests.length === 0) throw new Error('Aucune quête alternative disponible');

      const newQuest = anyQuests[Math.floor(Math.random() * anyQuests.length)];
      return await applyReroll(userId, currentProgress.id, newQuest, today, (profile.reroll_count || 0) + 1);
    }

    const newQuest = availableQuests[Math.floor(Math.random() * availableQuests.length)];
    return await applyReroll(userId, currentProgress.id, newQuest, today, (profile.reroll_count || 0) + 1);

  } catch (error: any) {
    console.error('[ECONOMY] Reroll error:', error.message);
    return { success: false, error: error.message };
  }
}

async function applyReroll(userId: string, progressId: string, newQuest: any, date: string, count: number) {
  // 1. Mettre à jour la progression avec la nouvelle quête
  const { error: updateError } = await supabase
    .from('quest_progress')
    .update({
      quest_key: newQuest.quest_key,
      current_value: 0,
      completed: false,
      claimed: false,
      completed_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', progressId);

  if (updateError) throw updateError;

  // 2. Mettre à jour le quota dans le profil
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      last_reroll_date: date,
      reroll_count: count
    })
    .eq('id', userId);

  if (profileError) throw profileError;

  return { success: true, newQuest };
}
