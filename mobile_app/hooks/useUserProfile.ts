import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/supabaseClients';

type ProfileLite = {
  id: string;
  display_name: string | null;
  xp_total: number;
  title_key?: string | null;
  parties_per_day: number;
  parties_restantes: number;
  high_score?: number | null;
  last_reroll_date?: string | null;
  reroll_count?: number;
};

/**
 * Hook React Query pour récupérer le profil utilisateur avec cache intelligent
 * Évite les requêtes répétées lors de la navigation entre onglets
 */
export function useUserProfile(userId: string | null) {
  return useQuery({
    queryKey: ['userProfile', userId],
    queryFn: async (): Promise<ProfileLite> => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, xp_total, title_key, parties_per_day, parties_restantes, high_score, last_reroll_date, reroll_count')
        .eq('id', userId)
        .maybeSingle() as any;

      if (error) throw error;
      if (!data) throw new Error('Profile not found');

      return {
        id: data.id,
        display_name: data.display_name ?? null,
        xp_total: data.xp_total ?? 0,
        title_key: data.title_key ?? 'page',
        parties_per_day: data.parties_per_day ?? 3,
        parties_restantes: data.parties_restantes ?? 0,
        high_score: data.high_score ?? null,
        last_reroll_date: data.last_reroll_date ?? null,
        reroll_count: data.reroll_count ?? 0,
      };
    },
    enabled: !!userId, // N'exécute la requête que si userId est défini
    staleTime: 5 * 60 * 1000, // 5 minutes - données considérées fraîches
    gcTime: 10 * 60 * 1000, // 10 minutes - garbage collection
  });
}
