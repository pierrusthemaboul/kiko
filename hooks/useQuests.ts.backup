import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/supabaseClients';
import { QuestWithProgress } from '@/lib/economy/quests';
import {
  shouldResetQuests,
  resetDailyQuests,
  initializeDailyQuests,
  getTomorrowResetTime
} from '@/utils/questHelpers';

/**
 * Hook pour g�rer les qu�tes quotidiennes
 * R�cup�re les qu�tes actives et leur progression
 */
export function useQuests(userId: string | undefined) {
  const [quests, setQuests] = useState<QuestWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    loadQuests();
  }, [userId]);

  async function loadQuests() {
    try {
      setLoading(true);
      setError(null);

      if (!userId) return;

      // R�cup�rer les qu�tes quotidiennes disponibles
      const { data: dailyQuests, error: questsError } = await supabase
        .from('daily_quests')
        .select('*')
        .order('created_at', { ascending: true });

      if (questsError) throw questsError;

      // R�cup�rer la progression de l'utilisateur
      const { data: progressData, error: progressError } = await supabase
        .from('quest_progress')
        .select('*')
        .eq('user_id', userId);

      if (progressError) throw progressError;

      // V�rifier si les qu�tes doivent �tre r�initialis�es
      if (progressData && progressData.length > 0) {
        const firstProgress = progressData[0];
        if (shouldResetQuests(firstProgress.reset_at)) {
          console.log('= Reset des qu�tes quotidiennes n�cessaire');
          await resetDailyQuests(userId);
          // Recharger apr�s reset
          await loadQuests();
          return;
        }
      } else {
        // Aucune progression existante, initialiser
        console.log('=� Initialisation des qu�tes quotidiennes');
        await initializeDailyQuests(userId);
        // Recharger apr�s initialisation
        await loadQuests();
        return;
      }

      // Combiner les qu�tes avec leur progression
      const questsWithProgress: QuestWithProgress[] = dailyQuests.map(quest => ({
        ...quest,
        progress: progressData?.find(p => p.quest_key === quest.quest_key) || null,
      }));

      setQuests(questsWithProgress);
    } catch (err) {
      console.error('Erreur lors du chargement des qu�tes:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Met � jour la progression d'une qu�te
   */
  async function updateQuestProgress(
    questKey: string,
    increment: number
  ): Promise<boolean> {
    try {
      if (!userId) return false;

      const quest = quests.find(q => q.quest_key === questKey);
      if (!quest || !quest.progress) return false;

      // Ne pas mettre � jour si d�j� compl�t�e
      if (quest.progress.completed) return false;

      const newValue = quest.progress.current_value + increment;
      const isCompleted = newValue >= quest.target_value;

      const { error } = await supabase
        .from('quest_progress')
        .update({
          current_value: newValue,
          completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quest.progress.id);

      if (error) throw error;

      // Recharger les qu�tes
      await loadQuests();

      return isCompleted;
    } catch (err) {
      console.error('Erreur lors de la mise � jour de la progression:', err);
      return false;
    }
  }

  /**
   * Marque une qu�te comme compl�t�e (pour les qu�tes binaires)
   */
  async function completeQuest(questKey: string): Promise<boolean> {
    try {
      if (!userId) return false;

      const quest = quests.find(q => q.quest_key === questKey);
      if (!quest || !quest.progress) return false;

      // Ne pas mettre � jour si d�j� compl�t�e
      if (quest.progress.completed) return false;

      const { error } = await supabase
        .from('quest_progress')
        .update({
          current_value: quest.target_value,
          completed: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', quest.progress.id);

      if (error) throw error;

      // Recharger les qu�tes
      await loadQuests();

      return true;
    } catch (err) {
      console.error('Erreur lors de la compl�tion de la qu�te:', err);
      return false;
    }
  }

  /**
   * D�finit la valeur exacte de progression d'une qu�te
   */
  async function setQuestProgress(
    questKey: string,
    value: number
  ): Promise<boolean> {
    try {
      if (!userId) return false;

      const quest = quests.find(q => q.quest_key === questKey);
      if (!quest || !quest.progress) return false;

      // Ne pas mettre � jour si d�j� compl�t�e
      if (quest.progress.completed) return false;

      const isCompleted = value >= quest.target_value;

      const { error } = await supabase
        .from('quest_progress')
        .update({
          current_value: value,
          completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quest.progress.id);

      if (error) throw error;

      // Recharger les qu�tes
      await loadQuests();

      return isCompleted;
    } catch (err) {
      console.error('Erreur lors de la d�finition de la progression:', err);
      return false;
    }
  }

  return {
    quests,
    loading,
    error,
    updateQuestProgress,
    completeQuest,
    setQuestProgress,
    reload: loadQuests,
  };
}
