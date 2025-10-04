import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase/supabaseClients';
import { todayWindow } from '@/utils/time';

export interface PlaysInfo {
  allowed: number;
  used: number;
  remaining: number;
}

export function usePlays() {
  const [playsInfo, setPlaysInfo] = useState<PlaysInfo | null>(null);
  const [canStartRun, setCanStartRun] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchPlaysInfo = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setPlaysInfo(null);
        setCanStartRun(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('parties_per_day, is_admin')
        .eq('id', authUser.id)
        .single();

      const isAdmin = profile?.is_admin === true;
      const allowed = isAdmin ? 999 : (profile?.parties_per_day ?? 3);

      if (isAdmin) {
        const info = { allowed, used: 0, remaining: 999 };
        setPlaysInfo(info);
        setCanStartRun(true);
        return;
      }

      const window = todayWindow();
      const { count: runsToday, error: countError } = await supabase
        .from('runs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', authUser.id)
        .gte('created_at', window.startISO)
        .lt('created_at', window.endISO);

      if (countError) throw countError;

      const used = runsToday ?? 0;
      const remaining = Math.max(0, allowed - used);
      const info = { allowed, used, remaining };

      setPlaysInfo(info);
      setCanStartRun(remaining > 0);

    } catch (error) {
      setPlaysInfo(null);
      setCanStartRun(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaysInfo();
  }, [fetchPlaysInfo]);

  return {
    playsInfo,
    canStartRun,
    loadingPlays: loading,
    refreshPlaysInfo: fetchPlaysInfo,
  };
}