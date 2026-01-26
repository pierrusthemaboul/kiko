import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/supabaseClients';
import { ACHIEVEMENTS, shouldUnlockAchievement } from '@/lib/economy/quests';
import { Database } from '@/lib/supabase/database.types';

type UserAchievement = Database['public']['Tables']['user_achievements']['Row'];

interface AchievementWithStatus {
  achievement_key: string;
  achievement_type: string;
  title: string;
  description: string;
  xp_bonus: number;
  icon: string;
  unlocked: boolean;
  unlocked_at: string | null;
}

/**
 * Hook pour g�rer les achievements de l'utilisateur
 */
export function useAchievements(userId: string | undefined) {
  const [achievements, setAchievements] = useState<AchievementWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    loadAchievements();
  }, [userId]);

  async function loadAchievements() {
    try {
      setLoading(true);
      setError(null);

      if (!userId) return;

      // R�cup�rer les achievements d�bloqu�s par l'utilisateur
      const { data: userAchievements, error: userAchError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId);

      if (userAchError) throw userAchError;

      // Cr�er la liste compl�te des achievements avec leur statut
      const achievementsWithStatus: AchievementWithStatus[] = Object.values(ACHIEVEMENTS).map(
        achievement => {
          const unlocked = userAchievements?.find(
            ua => ua.achievement_key === achievement.achievement_key
          );

          return {
            ...achievement,
            unlocked: !!unlocked,
            unlocked_at: unlocked?.unlocked_at || null,
          };
        }
      );

      setAchievements(achievementsWithStatus);
    } catch (err) {
      console.error('Erreur lors du chargement des achievements:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }

  /**
   * D�bloque un achievement et attribue l'XP bonus
   */
  async function unlockAchievement(
    achievementKey: string
  ): Promise<{ success: boolean; xpReward: number }> {
    try {
      if (!userId) return { success: false, xpReward: 0 };

      const achievement = ACHIEVEMENTS[achievementKey];
      if (!achievement) {
        console.warn(`Achievement ${achievementKey} n'existe pas`);
        return { success: false, xpReward: 0 };
      }

      // V�rifier si d�j� d�bloqu�
      const isAlreadyUnlocked = achievements.find(
        a => a.achievement_key === achievementKey && a.unlocked
      );

      if (isAlreadyUnlocked) {
        console.log(`Achievement ${achievementKey} d�j� d�bloqu�`);
        return { success: false, xpReward: 0 };
      }

      // D�bloquer l'achievement
      const { error: unlockError } = await supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_key: achievementKey,
          unlocked_at: new Date().toISOString(),
        });

      if (unlockError) throw unlockError;

      // Ajouter l'XP � l'utilisateur
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('xp_total')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      const newXP = (profile?.xp_total || 0) + achievement.xp_bonus;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ xp_total: newXP })
        .eq('id', userId);

      if (updateError) throw updateError;

      console.log(
        `<� Achievement ${achievementKey} d�bloqu�! +${achievement.xp_bonus} XP`
      );

      // Recharger les achievements
      await loadAchievements();

      return { success: true, xpReward: achievement.xp_bonus };
    } catch (err) {
      console.error('Erreur lors du d�bloquage de l\'achievement:', err);
      return { success: false, xpReward: 0 };
    }
  }

  /**
   * V�rifie et d�bloque automatiquement les achievements bas�s sur les stats
   */
  async function checkAndUnlockAchievements(userData: {
    title_key?: string;
    current_streak?: number;
    games_played?: number;
    high_score?: number;
  }): Promise<string[]> {
    const unlockedKeys: string[] = [];

    try {
      if (!userId) return unlockedKeys;

      // Parcourir tous les achievements et v�rifier les conditions
      for (const [key, achievement] of Object.entries(ACHIEVEMENTS)) {
        // V�rifier si d�j� d�bloqu�
        const isAlreadyUnlocked = achievements.find(
          a => a.key === key && a.unlocked
        );

        if (isAlreadyUnlocked) continue;

        // V�rifier si les conditions sont remplies
        if (shouldUnlockAchievement(key, userData)) {
          const result = await unlockAchievement(key);
          if (result.success) {
            unlockedKeys.push(key);
          }
        }
      }

      return unlockedKeys;
    } catch (err) {
      console.error('Erreur lors de la v�rification des achievements:', err);
      return unlockedKeys;
    }
  }

  /**
   * Retourne le nombre total d'achievements d�bloqu�s
   */
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  /**
   * Retourne le nombre total d'achievements disponibles
   */
  const totalCount = achievements.length;

  /**
   * Retourne le pourcentage de compl�tion
   */
  const completionPercentage = totalCount > 0
    ? Math.round((unlockedCount / totalCount) * 100)
    : 0;

  return {
    achievements,
    loading,
    error,
    unlockAchievement,
    checkAndUnlockAchievements,
    reload: loadAchievements,
    unlockedCount,
    totalCount,
    completionPercentage,
  };
}
