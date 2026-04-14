import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase/supabaseClients';
import { todayWindow } from '@/utils/time';
import { Logger } from '@/utils/logger';
import { partiesPerDayFromXP } from '@/lib/economy/ranks';

type PlaysRefreshListener = () => void;
const playsRefreshListeners = new Set<PlaysRefreshListener>();

export function notifyPlaysRefreshRequested(source: string = 'unknown'): void {
  Logger.info('Plays', `Global plays refresh requested (source=${source})`);
  playsRefreshListeners.forEach(listener => {
    try {
      listener();
    } catch (err) {
      Logger.error('Plays', 'Global refresh listener failed', err);
    }
  });
}

export interface PlaysInfo {
  allowed: number;
  used: number;
  remaining: number;
}

export function usePlays() {
  const [playsInfo, setPlaysInfo] = useState<PlaysInfo | null>(null);
  const [canStartRun, setCanStartRun] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchPlaysInfo = useCallback(async (): Promise<PlaysInfo | null> => {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setPlaysInfo(null);
        setCanStartRun(false);
        return null;
      }

      const { data: profile } = await (supabase
        .from('profiles')
        .select('parties_per_day, parties_restantes, is_admin, xp_total')
        .eq('id', authUser.id)
        .single() as any);

      const baseFromRank = partiesPerDayFromXP(profile?.xp_total ?? 0);
      const storedQuota = profile?.parties_per_day ?? 3;
      const extraPlays = profile?.parties_restantes ?? 0;

      // Seuil minimal: le grade définit un minimum, la base peut forcer plus haut.
      const allowed = Math.max(baseFromRank, storedQuota);

      let isAdmin = profile?.is_admin === true;

      // Simulation pour le test des pubs via Reactotron
      if (__DEV__) {
        const simulated = await AsyncStorage.getItem('@debug_simulated_plays');
        if (simulated === 'true') {
          isAdmin = false;
        }
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
      // Nouveau calcul : Quota journalier restants + Parties en réserve
      const dailyRemaining = Math.max(0, allowed - used);
      const remaining = dailyRemaining + extraPlays;
      
      const canStart = isAdmin || remaining > 0;
      const info = { allowed, used, remaining };

      Logger.info('Plays', 'quota_snapshot', {
        allowed,
        used,
        dailyRemaining,
        extraPlays,
        remaining,
        isAdmin,
        storedQuota,
        baseFromRank,
      });

      setPlaysInfo(info);
      setCanStartRun(canStart);
      return info;
    } catch (error) {
      Logger.error('Plays', 'Failed to fetch plays info', error);
      setPlaysInfo(null);
      setCanStartRun(false);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaysInfo();
  }, [fetchPlaysInfo]);

  useEffect(() => {
    const listener = () => {
      void fetchPlaysInfo();
    };
    playsRefreshListeners.add(listener);
    return () => {
      playsRefreshListeners.delete(listener);
    };
  }, [fetchPlaysInfo]);

  return {
    playsInfo,
    canStartRun,
    loadingPlays: loading,
    refreshPlaysInfo: fetchPlaysInfo,
  };
}