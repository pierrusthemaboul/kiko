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

export interface LeaderboardsByMode {
  classic: LeaderboardData;
}

export function useLeaderboardsByMode() {
  const [leaderboards, setLeaderboards] = useState<LeaderboardsByMode>({
    classic: {
      daily: [],
      weekly: [],
      monthly: [],
      allTime: [],
    },
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

      // Fonction helper pour récupérer les classements par mode
      const fetchLeaderboardsForMode = async (mode: 'classic' | 'precision') => {
        // Classement du jour
        const { data: dailyData, error: dailyError } = await supabase
          .from('game_scores')
          .select('display_name, score, user_id')
          .gte('created_at', `${today}T00:00:00.000Z`)
          .in('mode', [mode, mode === 'precision' ? 'date' : mode]) // Support ancien mode 'date'
          .order('score', { ascending: false })
          .limit(5);

        // Classement de la semaine
        const { data: weeklyData, error: weeklyError } = await supabase
          .from('game_scores')
          .select('display_name, score, user_id')
          .gte('created_at', `${weekStart}T00:00:00.000Z`)
          .in('mode', [mode, mode === 'precision' ? 'date' : mode])
          .order('score', { ascending: false })
          .limit(5);

        // Classement du mois
        const { data: monthlyData, error: monthlyError } = await supabase
          .from('game_scores')
          .select('display_name, score, user_id')
          .gte('created_at', `${firstDayOfMonth}T00:00:00.000Z`)
          .in('mode', [mode, mode === 'precision' ? 'date' : mode])
          .order('score', { ascending: false })
          .limit(5);

        // Pour "all time", on utilise toujours la table profiles (high_score global)
        // Mais on pourrait aussi créer un high_score_classic et high_score_precision
        const { data: allTimeData, error: allTimeError } = await supabase
          .from('profiles')
          .select('id, display_name, high_score')
          .not('high_score', 'is', null)
          .gt('high_score', 0)
          .order('high_score', { ascending: false })
          .limit(5);

        if (dailyError || weeklyError || monthlyError || allTimeError) {
          throw new Error(`Erreur lors du chargement des classements ${mode}`);
        }

        return {
          daily: dailyData,
          weekly: weeklyData,
          monthly: monthlyData,
          allTime: allTimeData,
        };
      };

      const classicData = await fetchLeaderboardsForMode('classic');

      const formatScores = (data: any[], scoreField: string = 'score'): LeaderboardPlayer[] => {
        return (data || []).map((item, index) => ({
          id: item.user_id || item.id || `player-${index}`,
          name: item.display_name?.trim() || 'Joueur Anonyme',
          score: Number(item[scoreField]) || 0,
          rank: index + 1,
        }));
      };

      setLeaderboards({
        classic: {
          daily: formatScores(classicData.daily, 'score'),
          weekly: formatScores(classicData.weekly, 'score'),
          monthly: formatScores(classicData.monthly, 'score'),
          allTime: formatScores(classicData.allTime, 'high_score'),
        },
      });
    } catch (err) {
      console.error('[useLeaderboardsByMode] Erreur:', err);
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
