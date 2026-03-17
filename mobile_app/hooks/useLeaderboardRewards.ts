import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/supabaseClients';

export interface PendingReward {
  periodType: string;
  periodKey: string;
  rank: number;
  playsAvailable: number;
}

export function useLeaderboardRewards(userId: string | undefined) {
  const [pendingRewards, setPendingRewards] = useState<PendingReward[]>([]);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const checkPendingRewards = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)(
        'get_pending_leaderboard_rewards',
        { p_user_id: userId }
      );

      if (error) {
        console.error('[LeaderboardRewards] Check error:', error.message);
        return;
      }

      setPendingRewards(
        (data || []).map((r: any) => ({
          periodType: r.period_type,
          periodKey: r.period_key,
          rank: r.rank_achieved,
          playsAvailable: r.plays_available,
        }))
      );
    } catch (err) {
      console.error('[LeaderboardRewards] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const claimReward = useCallback(async (periodType: string, periodKey: string) => {
    if (!userId || claiming) return null;

    setClaiming(true);
    try {
      const { data, error } = await (supabase.rpc as any)(
        'claim_leaderboard_reward',
        { p_user_id: userId, p_period_type: periodType, p_period_key: periodKey }
      );

      if (error) {
        console.error('[LeaderboardRewards] Claim error:', error.message);
        return null;
      }

      const result = data?.[0];
      if (result?.success) {
        setPendingRewards((prev) =>
          prev.filter((r) => !(r.periodType === periodType && r.periodKey === periodKey))
        );
        return { rank: result.rank_achieved, playsAwarded: result.plays_awarded };
      }

      return null;
    } catch (err) {
      console.error('[LeaderboardRewards] Claim exception:', err);
      return null;
    } finally {
      setClaiming(false);
    }
  }, [userId, claiming]);

  const claimAll = useCallback(async () => {
    if (!userId || claiming || pendingRewards.length === 0) return 0;

    let totalPlays = 0;
    for (const reward of [...pendingRewards]) {
      const result = await claimReward(reward.periodType, reward.periodKey);
      if (result) totalPlays += result.playsAwarded;
    }
    return totalPlays;
  }, [userId, claiming, pendingRewards, claimReward]);

  useEffect(() => {
    checkPendingRewards();
  }, [checkPendingRewards]);

  return {
    pendingRewards,
    loading,
    claiming,
    claimReward,
    claimAll,
    refresh: checkPendingRewards,
  };
}
