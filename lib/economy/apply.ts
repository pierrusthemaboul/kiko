import { supabase } from 'lib/supabase/supabaseClients';
import type { Database } from 'lib/supabase/database.types';
import { pointsToXP } from 'lib/economy/convert';
import { partiesPerDayFromXP, rankFromXP } from 'lib/economy/ranks';

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
    .select('xp_total, title_key, parties_per_day')
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

  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update({
      xp_total: newXp,
      title_key: rank.key,
      parties_per_day: newPartiesPerDay,
      updated_at: timestamp,
    })
    .eq('id', userId);

  if (profileUpdateError) {
    throw new Error(`Failed to update profile: ${profileUpdateError.message}`);
  }

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
  };
}
