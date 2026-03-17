import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase/supabaseClients';
import { todayWindow } from '@/utils/time';
import { Logger } from '@/utils/logger';
import { partiesPerDayFromXP } from '@/lib/economy/ranks';

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
    // 🔍 Logger - DÉBUT FETCH
    Logger.debug('Plays', 'Fetching plays info from Supabase');

    // 🔍 REACTOTRON LOG - DÉBUT FETCH
    if (__DEV__ && (console as any).tron) {
      (console as any).tron.display({
        name: '🔄 FETCH PLAYS INFO',
        preview: 'Récupération des parties restantes',
        value: { timestamp: new Date().toISOString() },
        important: false
      });
    }

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
        .select('parties_per_day, is_admin, xp_total')
        .eq('id', authUser.id)
        .single() as any);

      const baseFromRank = partiesPerDayFromXP(profile?.xp_total ?? 0);
      const storedQuota = profile?.parties_per_day ?? 3;

      Logger.debug('Plays', 'Quota breakdown', {
        xp: profile?.xp_total,
        baseFromRank,
        storedQuota
      });

      // Si le grade donne plus que ce qui est en base, on devrait idéalement mettre à jour la base
      // Mais pour l'instant, on va juste utiliser le maximum pour le calcul local
      let allowed = Math.max(baseFromRank, storedQuota);

      // Si le grade a augmenté au-delà de la base, on synchronise silencieusement la DB
      if (baseFromRank > storedQuota) {
        Logger.info('Plays', `Rank upgrade detected! Syncing DB quota: ${storedQuota} -> ${baseFromRank}`);
        await (supabase.from('profiles') as any)
          .update({ parties_per_day: baseFromRank })
          .eq('id', authUser.id);
      }

      let isAdmin = profile?.is_admin === true;

      // Simulation pour le test des pubs via Reactotron
      if (__DEV__) {
        const simulated = await AsyncStorage.getItem('@debug_simulated_plays');
        if (simulated === 'true') {
          isAdmin = false;
        }
      }

      if (isAdmin) {
        allowed = 999;
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
      const canStart = isAdmin || remaining > 0;
      const info = { allowed, used, remaining };

      Logger.debug('Plays', 'Calculated plays info', {
        allowed,
        used,
        remaining,
        isAdmin,
        userId: authUser.id
      });

      if (__DEV__ && (console as any).tron) {
        (console as any).tron.display({
          name: '📊 PLAYS INFO',
          preview: `Remaining: ${remaining} (${used}/${allowed})`,
          value: {
            allowed, used, remaining, isAdmin,
            isSimulated: (await AsyncStorage.getItem('@debug_simulated_plays')) === 'true',
            windowStart: window.startISO,
            userId: authUser.id
          },
          important: true
        });
      }

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

  return {
    playsInfo,
    canStartRun,
    loadingPlays: loading,
    refreshPlaysInfo: fetchPlaysInfo,
  };
}