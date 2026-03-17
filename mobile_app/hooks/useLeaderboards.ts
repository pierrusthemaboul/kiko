import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/supabaseClients';

export interface LeaderboardPlayer {
  id: string;
  name: string;
  score: number;
  rank: number;
}

export interface LeaderboardData {
  daily: LeaderboardPlayer[];
  weekly: LeaderboardPlayer[];
  monthly: LeaderboardPlayer[];
  allTime: LeaderboardPlayer[];
}

export function useLeaderboards() {
  const [leaderboards, setLeaderboards] = useState<LeaderboardData>({
    daily: [],
    weekly: [],
    monthly: [],
    allTime: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboards = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const today = new Date().toISOString().split('T')[0];

      // Calculer le début de la semaine (dimanche)
      const firstDayOfWeek = new Date();
      firstDayOfWeek.setDate(firstDayOfWeek.getDate() - firstDayOfWeek.getDay());
      const weekStart = firstDayOfWeek.toISOString().split('T')[0];

      const firstDayOfMonth = `${today.substring(0, 7)}-01`;

      // Classement du jour
      const { data: dailyData, error: dailyError } = await supabase
        .from('game_scores')
        .select('display_name, score, user_id')
        .gte('created_at', `${today}T00:00:00.000Z`)
        .order('score', { ascending: false })
        .limit(5);

      // Classement de la semaine
      const { data: weeklyData, error: weeklyError } = await supabase
        .from('game_scores')
        .select('display_name, score, user_id')
        .gte('created_at', `${weekStart}T00:00:00.000Z`)
        .order('score', { ascending: false })
        .limit(5);

      // Classement du mois
      const { data: monthlyData, error: monthlyError } = await supabase
        .from('game_scores')
        .select('display_name, score, user_id')
        .gte('created_at', `${firstDayOfMonth}T00:00:00.000Z`)
        .order('score', { ascending: false })
        .limit(5);

      // Classement de tous les temps
      const { data: allTimeData, error: allTimeError } = await supabase
        .from('profiles')
        .select('id, display_name, high_score')
        .not('high_score', 'is', null)
        .gt('high_score', 0)
        .order('high_score', { ascending: false })
        .limit(5);

      if (dailyError || weeklyError || monthlyError || allTimeError) {
        throw new Error('Erreur lors du chargement des classements');
      }

      const formatScores = (data: any[], scoreField: string = 'score'): LeaderboardPlayer[] => {
        return (data || []).map((item, index) => ({
          id: item.user_id || item.id || `player-${index}`,
          name: item.display_name?.trim() || 'Joueur Anonyme',
          score: Number(item[scoreField]) || 0,
          rank: index + 1,
        }));
      };

      setLeaderboards({
        daily: formatScores(dailyData, 'score'),
        weekly: formatScores(weeklyData, 'score'),
        monthly: formatScores(monthlyData, 'score'),
        allTime: formatScores(allTimeData, 'high_score'),
      });
    } catch (err) {
      console.error('[useLeaderboards] Erreur:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboards();
  }, [fetchLeaderboards]);

  return {
    leaderboards,
    loading,
    error,
    refresh: fetchLeaderboards,
  };
}
