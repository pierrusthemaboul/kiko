import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/supabaseClients';

export interface RankingPlayer {
  id: string;
  name: string;
  score: number;
  rank: number;
  isMe: boolean;
}

export interface MyRankingData {
  daily: RankingPlayer[];
  weekly: RankingPlayer[];
  monthly: RankingPlayer[];
  allTime: RankingPlayer[];
}

const EMPTY: MyRankingData = { daily: [], weekly: [], monthly: [], allTime: [] };

export function useMyRanking(userId: string | undefined) {
  const [rankings, setRankings] = useState<MyRankingData>(EMPTY);
  const [loading, setLoading] = useState(true);

  const fetchMyRanking = useCallback(async () => {
    if (!userId) {
      setRankings(EMPTY);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const periods = ['daily', 'weekly', 'monthly', 'allTime'] as const;

      const results = await Promise.all(
        periods.map(async (period) => {
          const { data, error } = await (supabase.rpc as any)(
            'get_my_ranking',
            { p_user_id: userId, p_period: period, p_mode: 'classic' }
          );

          if (error) {
            console.error(`[useMyRanking] ${period}:`, error.message);
            return [];
          }

          return (data || []).map((row: any) => ({
            id: row.user_id,
            name: row.display_name?.trim() || 'Joueur Anonyme',
            score: row.score || 0,
            rank: Number(row.rank),
            isMe: row.is_me === true,
          }));
        })
      );

      setRankings({
        daily: results[0],
        weekly: results[1],
        monthly: results[2],
        allTime: results[3],
      });
    } catch (err) {
      console.error('[useMyRanking] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchMyRanking();
  }, [fetchMyRanking]);

  return { rankings, loading, refresh: fetchMyRanking };
}
