import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase/supabaseClients';
import { todayWindow } from '@/utils/time';
import { Logger } from '@/utils/logger';

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
    // 🔍 REACTOTRON LOG - DÉBUT FETCH
    if (__DEV__ && console.tron) {
      console.tron.display({
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
        if (__DEV__ && console.tron) {
          console.tron.warn('❌ Pas d\'utilisateur authentifié');
        }
        setPlaysInfo(null);
        setCanStartRun(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('parties_per_day, is_admin')
        .eq('id', authUser.id)
        .single();

      // ... (imports)

      // ... inside fetchPlaysInfo
      const isAdmin = profile?.is_admin === true;
      const allowed = isAdmin ? 999 : (profile?.parties_per_day ?? 3);

      Logger.debug('Plays', `Fetching info for user ${authUser.id}`, { isAdmin, allowed });

      if (isAdmin) {
        // ...
      }

      const window = todayWindow();
      const { count: runsToday, error: countError } = await supabase
      // ...
      if (countError) {
        Logger.error('Plays', 'Error counting runs', countError);
        if (__DEV__ && console.tron) {
          console.tron.error('❌ Erreur count runs:', countError);
        }
        throw countError;
      }

      const used = runsToday ?? 0;
      const remaining = Math.max(0, allowed - used);
      const info = { allowed, used, remaining };

      // 🔍 REACTOTRON LOG - RÉSULTAT FETCH
      if (__DEV__ && console.tron) {
        console.tron.display({
          name: '✅ PLAYS INFO CALCULÉ',
          preview: `${remaining} parties restantes`,
          value: {
            allowed,
            used,
            remaining,
            isAdmin,
            userId: authUser.id,
            window: { start: window.start, end: window.end },
            runsToday
          },
          important: true
        });
      }

      Logger.debug('Plays', 'Calculated plays info', info);

      setPlaysInfo(info);
      // ...
    } catch (error) {
      Logger.error('Plays', 'Failed to fetch plays info', error);
      if (__DEV__ && console.tron) {
        console.tron.error('❌ ERREUR fetchPlaysInfo:', error);
      }
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