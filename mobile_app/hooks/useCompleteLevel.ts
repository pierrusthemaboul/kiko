import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/supabaseClients';

type CompleteLevelParams = {
  userId: string;
  levelCompleted: number;
  xpReward: number;
  heartsReward?: number;
};

type CompleteLevelResult = {
  success: boolean;
  newXp: number;
  newLevel: number;
  newTitleKey: string;
  xpReward: number;
  heartsReward?: number;
};

/**
 * Hook pour appeler l'Edge Function complete-level
 * Valide le niveau côté serveur et ajoute les récompenses (XP, cœurs)
 * Invalide automatiquement le cache du profil utilisateur après succès
 */
export function useCompleteLevel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, levelCompleted, xpReward, heartsReward = 0 }: CompleteLevelParams): Promise<CompleteLevelResult> => {
      const { data, error } = await supabase.functions.invoke('complete-level', {
        body: {
          userId,
          levelCompleted,
          xpReward,
          heartsReward,
        },
      });

      if (error) {
        throw new Error(`Edge Function error: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to complete level');
      }

      return data;
    },
    onSuccess: (data, variables) => {
      // Invalider le cache du profil utilisateur pour forcer le rechargement
      queryClient.invalidateQueries({ queryKey: ['userProfile', variables.userId] });
    },
  });
}
