import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import { useGameLogicA } from '@/hooks/useGameLogicA';
import { usePlays } from '@/hooks/usePlays';
import { useLeaderboardsByMode } from '@/hooks/useLeaderboardsByMode';
import { useMyRanking } from '@/hooks/useMyRanking';
import { useLeaderboardRewards } from '@/hooks/useLeaderboardRewards';
import { rankFromXP } from '@/lib/economy/ranks';
import { getAllQuestsWithProgress } from '@/utils/questSelection';

export function useHomeData() {
  const { profile, guestPlaysInfo } = useGameLogicA();
  const { playsInfo, canStartRun, loadingPlays, refreshPlaysInfo } = usePlays();
  const { leaderboards, loading: leaderboardsLoading } = useLeaderboardsByMode();
  const { rankings: myRankings, loading: myRankingLoading } = useMyRanking(profile?.id);
  const { pendingRewards, claimAll, claiming } = useLeaderboardRewards(profile?.id);
  
  const [quests, setQuests] = useState<{ daily: any[]; weekly: any[]; monthly: any[] }>({ 
    daily: [], weekly: [], monthly: [] 
  });
  const [questsLoading, setQuestsLoading] = useState(true);

  const xp = profile?.xp_total ?? 0;
  const rank = useMemo(() => rankFromXP(xp), [xp]);
  const playerName = profile?.display_name ?? 'Voyageur';

  const headerSubtitle = useMemo(
    () => `${rank.label} · ${xp.toLocaleString('fr-FR')} XP`,
    [rank.label, xp]
  );

  const headerPlays = useMemo(() => {
    if (!profile?.id) {
      return `${guestPlaysInfo.remaining} parties restantes (invité)`;
    }
    return `${playsInfo?.remaining ?? 0} parties restantes`;
  }, [profile?.id, playsInfo?.remaining, guestPlaysInfo.remaining]);

  const canPlay = useMemo(() => {
    if (!profile?.id) return guestPlaysInfo.canStart;
    return canStartRun;
  }, [profile?.id, guestPlaysInfo.canStart, canStartRun]);

  useFocusEffect(
    useCallback(() => {
      refreshPlaysInfo();
      return () => { };
    }, [refreshPlaysInfo])
  );

  useEffect(() => {
    async function loadQuests() {
      if (!profile?.id) {
        setQuests({ daily: [], weekly: [], monthly: [] });
        setQuestsLoading(false);
        return;
      }

      setQuestsLoading(true);
      try {
        const allQuests = await getAllQuestsWithProgress(profile.id, rank.index);
        setQuests(allQuests);
      } catch (err) {
        console.error('[QUESTS ERROR]', err);
      } finally {
        setQuestsLoading(false);
      }
    }
    loadQuests();
  }, [profile?.id, rank.index]);

  return {
    profile,
    guestPlaysInfo,
    playsInfo,
    canStartRun,
    loadingPlays,
    refreshPlaysInfo,
    leaderboards,
    leaderboardsLoading,
    myRankings,
    myRankingLoading,
    pendingRewards,
    claimAll,
    claiming,
    quests,
    questsLoading,
    xp,
    rank,
    playerName,
    headerSubtitle,
    headerPlays,
    canPlay
  };
}
