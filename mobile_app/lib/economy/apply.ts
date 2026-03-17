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

type DailyQuestRow = Database['public']['Tables']['daily_quests']['Row'];
type QuestProgressRow = Database['public']['Tables']['quest_progress']['Row'];
type QuestProgressInsert = Database['public']['Tables']['quest_progress']['Insert'];
type QuestProgressUpdate = Database['public']['Tables']['quest_progress']['Update'];
type UserAchievementRow = Database['public']['Tables']['user_achievements']['Row'];
type UserAchievementInsert = Database['public']['Tables']['user_achievements']['Insert'];

function runsRepo() {
  const table = supabase.from('runs') as unknown;

  return {
    async selectById(runId: string): Promise<{ data: RunsRow | null; error: unknown | null }> {
      const res = await (table as {
        select: (cols: '*') => {
          eq: (col: 'id', value: string) => {
            maybeSingle: () => Promise<{ data: RunsRow | null; error: unknown | null }>;
          };
        };
      })
        .select('*')
        .eq('id', runId)
        .maybeSingle();

      return { data: res.data ?? null, error: res.error ?? null };
    },
    async selectModesByUserSince(userId: string, startIso: string): Promise<{ data: Array<Pick<RunsRow, 'mode'>> | null; error: unknown | null }> {
      const res = await (table as {
        select: (cols: 'mode') => {
          eq: (col: 'user_id', value: string) => {
            gte: (col2: 'created_at', value2: string) => Promise<{ data: Array<Pick<RunsRow, 'mode'>> | null; error: unknown | null }>;
          };
        };
      })
        .select('mode')
        .eq('user_id', userId)
        .gte('created_at', startIso);

      return { data: res.data ?? null, error: res.error ?? null };
    },
    async insertOne(values: RunsInsert): Promise<{ data: RunsRow | null; error: unknown | null }> {
      const res = await (table as {
        insert: (v: RunsInsert) => {
          select: (cols: '*') => { single: () => Promise<{ data: RunsRow | null; error: unknown | null }> };
        };
      })
        .insert(values)
        .select('*')
        .single();
      return { data: res.data ?? null, error: res.error ?? null };
    },
    async updateById(id: string, values: Partial<RunsRow>): Promise<{ error: unknown | null }> {
      const res = await (table as {
        update: (v: Partial<RunsRow>) => { eq: (col: 'id', value: string) => Promise<{ error: unknown | null }> };
      })
        .update(values)
        .eq('id', id);
      return { error: res.error ?? null };
    },
  };
}

function dailyQuestsRepo() {
  const table = supabase.from('daily_quests') as unknown;

  return {
    async selectAll(): Promise<{ data: DailyQuestRow[] | null; error: unknown | null }> {
      const res = await (table as {
        select: (cols: '*') => { returns: <T>() => Promise<{ data: T | null; error: unknown | null }> };
      })
        .select('*')
        .returns<DailyQuestRow[]>();

      return { data: res.data ?? null, error: res.error ?? null };
    },
    async selectActive(): Promise<{ data: DailyQuestRow[] | null; error: unknown | null }> {
      const res = await (table as {
        select: (cols: '*') => {
          eq: (col: 'is_active', value: boolean) => { returns: <T>() => Promise<{ data: T | null; error: unknown | null }> };
        };
      })
        .select('*')
        .eq('is_active', true)
        .returns<DailyQuestRow[]>();

      return { data: res.data ?? null, error: res.error ?? null };
    },
    async selectByQuestKey(questKey: string): Promise<{ data: DailyQuestRow | null; error: unknown | null }> {
      const res = await (table as {
        select: (cols: '*') => {
          eq: (col: 'quest_key', value: string) => { single: () => Promise<{ data: DailyQuestRow | null; error: unknown | null }> };
        };
      })
        .select('*')
        .eq('quest_key', questKey)
        .single();

      return { data: res.data ?? null, error: res.error ?? null };
    },
    async selectDailyActiveByDifficultyAndCategoryExcludingKeys(params: {
      difficulty: number;
      category: string;
      excludedKeys: string[];
    }): Promise<{ data: DailyQuestRow[] | null; error: unknown | null }> {
      const { difficulty, category, excludedKeys } = params;
      const notIn = excludedKeys.length > 0 ? `(${excludedKeys.join(',')})` : '("")';

      const res = await (table as {
        select: (cols: '*') => {
          eq: (col: 'quest_type', value: 'daily') => {
            eq: (col2: 'is_active', value2: boolean) => {
              eq: (col3: 'difficulty', value3: number) => {
                eq: (col4: 'category', value4: string) => {
                  not: (col5: 'quest_key', op: 'in', value5: string) => Promise<{ data: DailyQuestRow[] | null; error: unknown | null }>;
                };
              };
            };
          };
        };
      })
        .select('*')
        .eq('quest_type', 'daily')
        .eq('is_active', true)
        .eq('difficulty', difficulty)
        .eq('category', category)
        .not('quest_key', 'in', notIn);

      return { data: res.data ?? null, error: res.error ?? null };
    },
    async selectDailyActiveByDifficultyExcludingKeys(params: {
      difficulty: number;
      excludedKeys: string[];
    }): Promise<{ data: DailyQuestRow[] | null; error: unknown | null }> {
      const { difficulty, excludedKeys } = params;
      const notIn = excludedKeys.length > 0 ? `(${excludedKeys.join(',')})` : '("")';

      const res = await (table as {
        select: (cols: '*') => {
          eq: (col: 'quest_type', value: 'daily') => {
            eq: (col2: 'is_active', value2: boolean) => {
              eq: (col3: 'difficulty', value3: number) => {
                not: (col4: 'quest_key', op: 'in', value4: string) => Promise<{ data: DailyQuestRow[] | null; error: unknown | null }>;
              };
            };
          };
        };
      })
        .select('*')
        .eq('quest_type', 'daily')
        .eq('is_active', true)
        .eq('difficulty', difficulty)
        .not('quest_key', 'in', notIn);

      return { data: res.data ?? null, error: res.error ?? null };
    },
  };
}

type ProfilesUpdatePayload = Partial<Pick<
  ProfileRow,
  | 'xp_total'
  | 'title_key'
  | 'parties_per_day'
  | 'current_streak'
  | 'best_streak'
  | 'last_play_date'
  | 'games_played'
  | 'high_score'
  | 'last_reroll_date'
  | 'reroll_count'
  | 'updated_at'
>>;

function questProgressRepo() {
  const table = supabase.from('quest_progress') as unknown;

  return {
    async insertMany(values: QuestProgressInsert[]): Promise<{ error: unknown | null }> {
      const res = await (table as {
        insert: (v: QuestProgressInsert[]) => Promise<{ error: unknown | null }>;
      }).insert(values);
      return { error: res.error ?? null };
    },
    async selectIncompleteByUserId(userId: string): Promise<{ data: QuestProgressRow[] | null; error: unknown | null }> {
      const res = await (table as {
        select: (cols: '*') => {
          eq: (col: 'user_id', value: string) => {
            eq: (col2: 'completed', value2: boolean) => Promise<{ data: QuestProgressRow[] | null; error: unknown | null }>;
          };
        };
      })
        .select('*')
        .eq('user_id', userId)
        .eq('completed', false);

      return { data: res.data ?? null, error: res.error ?? null };
    },
    async selectByUserAndQuestKey(userId: string, questKey: string): Promise<{ data: QuestProgressRow | null; error: unknown | null }> {
      const res = await (table as {
        select: (cols: '*') => {
          eq: (col: 'user_id', value: string) => {
            eq: (col2: 'quest_key', value2: string) => {
              single: () => Promise<{ data: QuestProgressRow | null; error: unknown | null }>;
            };
          };
        };
      })
        .select('*')
        .eq('user_id', userId)
        .eq('quest_key', questKey)
        .single();

      return { data: res.data ?? null, error: res.error ?? null };
    },
    async selectQuestKeysByUserId(userId: string): Promise<{ data: Array<Pick<QuestProgressRow, 'quest_key'>> | null; error: unknown | null }> {
      const res = await (table as {
        select: (cols: 'quest_key') => {
          eq: (col: 'user_id', value: string) => Promise<{ data: Array<Pick<QuestProgressRow, 'quest_key'>> | null; error: unknown | null }>;
        };
      })
        .select('quest_key')
        .eq('user_id', userId);

      return { data: res.data ?? null, error: res.error ?? null };
    },
    async updateById(id: string, values: QuestProgressUpdate): Promise<{ error: unknown | null }> {
      const res = await (table as {
        update: (v: QuestProgressUpdate) => { eq: (col: 'id', value: string) => Promise<{ error: unknown | null }> };
      })
        .update(values)
        .eq('id', id);

      return { error: res.error ?? null };
    },
  };
}

function profilesRepo() {
  const table = supabase.from('profiles') as unknown;

  return {
    async selectEconomyById(userId: string): Promise<{ data: ProfileRow | null; error: unknown | null }> {
      const res = await (table as {
        select: (cols: string) => {
          eq: (col: 'id', value: string) => { maybeSingle: () => Promise<{ data: ProfileRow | null; error: unknown | null }> };
        };
      })
        .select('xp_total, title_key, parties_per_day, current_streak, best_streak, last_play_date, games_played, high_score')
        .eq('id', userId)
        .maybeSingle();

      return { data: res.data ?? null, error: res.error ?? null };
    },
    async selectXpTotalById(userId: string): Promise<{ data: Pick<ProfileRow, 'xp_total'> | null; error: unknown | null }> {
      const res = await (table as {
        select: (cols: 'xp_total') => {
          eq: (col: 'id', value: string) => { single: () => Promise<{ data: Pick<ProfileRow, 'xp_total'> | null; error: unknown | null }> };
        };
      })
        .select('xp_total')
        .eq('id', userId)
        .single();

      return { data: res.data ?? null, error: res.error ?? null };
    },
    async selectRerollInfoById(userId: string): Promise<{ data: Pick<ProfileRow, 'last_reroll_date' | 'reroll_count'> | null; error: unknown | null }> {
      const res = await (table as {
        select: (cols: 'last_reroll_date, reroll_count') => {
          eq: (col: 'id', value: string) => {
            single: () => Promise<{ data: Pick<ProfileRow, 'last_reroll_date' | 'reroll_count'> | null; error: unknown | null }>;
          };
        };
      })
        .select('last_reroll_date, reroll_count')
        .eq('id', userId)
        .single();

      return { data: res.data ?? null, error: res.error ?? null };
    },
    async selectXpAndPartiesById(userId: string): Promise<{ data: Pick<ProfileRow, 'xp_total' | 'parties_per_day'> | null; error: unknown | null }> {
      const res = await (table as {
        select: (cols: 'xp_total, parties_per_day') => {
          eq: (col: 'id', value: string) => {
            single: () => Promise<{ data: Pick<ProfileRow, 'xp_total' | 'parties_per_day'> | null; error: unknown | null }>;
          };
        };
      })
        .select('xp_total, parties_per_day')
        .eq('id', userId)
        .single();

      return { data: res.data ?? null, error: res.error ?? null };
    },
    async updateById(id: string, values: ProfilesUpdatePayload): Promise<{ error: unknown | null }> {
      const res = await (table as {
        update: (v: ProfilesUpdatePayload) => { eq: (col: 'id', value: string) => Promise<{ error: unknown | null }> };
      })
        .update(values)
        .eq('id', id);

      return { error: res.error ?? null };
    },
  };
}

function userAchievementsRepo() {
  const table = supabase.from('user_achievements') as unknown;

  return {
    async insertOne(values: UserAchievementInsert): Promise<{ error: unknown | null }> {
      const res = await (table as {
        insert: (v: UserAchievementInsert) => Promise<{ error: unknown | null }>;
      }).insert(values);
      return { error: res.error ?? null };
    },
  };
}

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

  const { data: existingRun, error: runFetchError } = await runsRepo().selectById(runId);

  if (runFetchError) {
    throw new Error(`Failed to load run history: ${String(runFetchError)}`);
  }

  let runRecord = existingRun;

  if (!runRecord) {
    const { data: insertedRun, error: runInsertError } = await runsRepo().insertOne({
      id: runId,
      user_id: userId,
      mode,
      points: safePoints,
    });

    if (runInsertError) {
      throw new Error(`Failed to create run record: ${String(runInsertError)}`);
    }

    runRecord = insertedRun;
  }

  const { data: profile, error: profileError } = await profilesRepo().selectEconomyById(userId);

  if (profileError) {
    throw new Error(`Failed to load profile: ${String(profileError)}`);
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

  const { error: profileUpdateError } = await profilesRepo().updateById(userId, updatePayload);

  if (profileUpdateError) {
    economyLog('[ECONOMY] ❌ Profile update error:', profileUpdateError);
    throw new Error(`Failed to update profile: ${String(profileUpdateError)}`);
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
    const { error: runUpdateError } = await runsRepo().updateById(runRecord.id, runPayload as Partial<RunsRow>);
    if (runUpdateError) {
      throw new Error(`Failed to mark run as processed: ${String(runUpdateError)}`);
    }
  } else {
    const { error: runInsertError } = await runsRepo().insertOne(runPayload as RunsInsert);
    if (runInsertError) {
      throw new Error(`Failed to record run: ${String(runInsertError)}`);
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
    const { data: runs, error } = await runsRepo().selectModesByUserSince(userId, startDate.toISOString());

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
    const { data: questProgressData, error: fetchError } = await questProgressRepo().selectIncompleteByUserId(userId);

    let questProgress = questProgressData;

    economyLog('[QUESTS] 📊 Résultat fetch:', {
      count: questProgress?.length,
      error: fetchError ? String(fetchError) : undefined,
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
      const { data: allActiveQuests, error: allQuestsErr } = await dailyQuestsRepo().selectActive();

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
      const progressToCreate: QuestProgressInsert[] = allActiveQuests.map((quest: DailyQuestRow) => ({
        user_id: userId,
        quest_key: quest.quest_key,
        current_value: 0,
        completed: false,
        reset_at: resetAt,
      }));

      const { error: createErr } = await questProgressRepo().insertMany(progressToCreate);

      if (createErr) {
        console.error('[QUESTS] ❌ Erreur création quest_progress:', createErr);
        economyLog('[QUESTS] ⚠️ Impossible de créer les quêtes - vérifiez les politiques RLS');
        return;
      }

      economyLog(`[QUESTS] ✅ Créé ${progressToCreate.length} quest_progress`);

      // Récupérer à nouveau les quest_progress non complétés
      const { data: newQuestProgress, error: refetchErr } = await questProgressRepo().selectIncompleteByUserId(userId);

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
    const { data: dailyQuests, error: questsError } = await dailyQuestsRepo().selectAll();

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
      const { error: updateError } = await questProgressRepo().updateById(update.id, {
        current_value: update.current_value,
        completed: update.completed,
        completed_at: update.completed_at,
        updated_at: timestamp,
      });

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
    const { data: profile, error: fetchError } = await profilesRepo().selectXpTotalById(userId);

    if (fetchError) throw fetchError;

    const newXP = (profile?.xp_total || 0) + xpAmount;

    const { error: updateError } = await profilesRepo().updateById(userId, { xp_total: newXP });

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
      .eq('user_id', userId)
      .returns<Array<Pick<UserAchievementRow, 'achievement_key'>>>();

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
        const { error: insertError } = await userAchievementsRepo().insertOne({
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
    const { data: progress, error: fetchError } = await questProgressRepo().selectByUserAndQuestKey(userId, questKey);

    if (fetchError || !progress) throw new Error('Quête non trouvée');
    if (!progress.completed) throw new Error('Quête non terminée');
    if (progress.claimed) throw new Error('Récompense déjà réclamée');

    // 2. Récupérer les détails de la quête (requête séparée car le JOIN ne fonctionne pas encore)
    const { data: quest, error: questError } = await dailyQuestsRepo().selectByQuestKey(questKey);

    if (questError || !quest) throw new Error('Détails de quête manquants');

    const xpAmount = quest.xp_reward || 0;
    const partsAmount = quest.parts_reward || 0;

    // 2. Marquer comme réclamé AVANT de donner les récompenses (éviter les exploits)
    const { error: updateProgressError } = await questProgressRepo().updateById(progress.id, {
      claimed: true,
      updated_at: new Date().toISOString(),
    });

    if (updateProgressError) throw updateProgressError;

    // 3. Attribuer les récompenses
    const { data: profile, error: profileFetchError } = await profilesRepo().selectXpAndPartiesById(userId);

    if (profileFetchError) throw profileFetchError;
    if (!profile) throw new Error('Profil introuvable');

    const newXP = (profile.xp_total || 0) + xpAmount;
    const newParties = (profile.parties_per_day || 0) + partsAmount;

    const { error: profileUpdateError } = await profilesRepo().updateById(userId, {
      xp_total: newXP,
      parties_per_day: newParties,
      updated_at: new Date().toISOString(),
    });

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
    const { data: profile, error: profileError } = await profilesRepo().selectRerollInfoById(userId);

    if (profileError) throw profileError;
    if (!profile) throw new Error('Profil introuvable');

    const today = new Date().toISOString().split('T')[0];
    if (profile.last_reroll_date === today && profile.reroll_count >= 1) {
      throw new Error('Limite de reroll quotidien atteinte (1/jour)');
    }

    // 2. Récupérer la quête actuelle pour connaître son Tier
    const { data: currentProgress, error: fetchError } = await questProgressRepo().selectByUserAndQuestKey(userId, questKey);

    if (fetchError || !currentProgress) throw new Error('Quête à changer non trouvée');
    if (currentProgress.completed) throw new Error('Impossible de changer une quête déjà terminée');

    // Récupérer les détails de la quête actuelle (requête séparée)
    const { data: currentQuest, error: questFetchError } = await dailyQuestsRepo().selectByQuestKey(questKey);

    if (questFetchError || !currentQuest) throw new Error('Détails de quête manquants');

    const currentDifficulty = currentQuest.difficulty;
    const currentCategory = currentQuest.category;

    // 3. Chercher une nouvelle quête alternative du même Tier et de la même catégorie
    // On exclut les quêtes déjà possédées par le joueur
    const { data: userProgress } = await questProgressRepo().selectQuestKeysByUserId(userId);

    const excludedKeys = userProgress?.map(p => p.quest_key) || [];

    const { data: availableQuests, error: availError } = await dailyQuestsRepo().selectDailyActiveByDifficultyAndCategoryExcludingKeys({
      difficulty: currentDifficulty,
      category: currentCategory,
      excludedKeys,
    });

    if (availError || !availableQuests || availableQuests.length === 0) {
      // Si pas de même catégorie, on prend n'importe quelle catégorie du même tier
      const { data: anyQuests } = await dailyQuestsRepo().selectDailyActiveByDifficultyExcludingKeys({
        difficulty: currentDifficulty,
        excludedKeys,
      });

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

async function applyReroll(userId: string, progressId: string, newQuest: DailyQuestRow, date: string, count: number) {
  // 1. Mettre à jour la progression avec la nouvelle quête
  const { error: updateError } = await questProgressRepo().updateById(progressId, {
    quest_key: newQuest.quest_key,
    current_value: 0,
    completed: false,
    claimed: false,
    completed_at: null,
    updated_at: new Date().toISOString(),
  });

  if (updateError) throw updateError;

  // 2. Mettre à jour le quota dans le profil
  const { error: profileError } = await profilesRepo().updateById(userId, {
    last_reroll_date: date,
    reroll_count: count,
  });

  if (profileError) throw profileError;

  return { success: true, newQuest };
}
