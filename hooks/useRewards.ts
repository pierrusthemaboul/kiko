// /home/pierre/sword/kiko/hooks/useRewards.ts

import { useState, useCallback, useEffect } from 'react';
import { RewardType, User, MAX_LIVES } from './types';
import { LEVEL_CONFIGS } from './levelConfigs';
import { FirebaseAnalytics } from '../lib/firebase'; // <-- AJOUTER L'IMPORT (Vérifier le chemin)

// ... (Interfaces Position, Reward, RewardTrigger, UseRewardsProps restent inchangées et) ...
interface Position {
  x: number;
  y: number;
}
interface Reward {
  type: RewardType;
  amount: number;
  reason: string;
  sourcePosition?: Position;
  targetPosition?: Position;
  // Optionnel: ajouter le trigger source pour faciliter le logging
  triggerType?: 'streak' | 'level' | 'precision';
  triggerValue?: number;
}
interface RewardTrigger {
  type: 'streak' | 'level' | 'precision';
  value: number;
}
interface UseRewardsProps {
  onRewardEarned?: (reward: Reward) => void;
  onRewardAnimationComplete?: () => void;
}


export const useRewards = ({
  onRewardEarned,
  onRewardAnimationComplete
}: UseRewardsProps = {}) => {

  const [currentReward, setCurrentReward] = useState<Reward | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastProcessedTrigger, setLastProcessedTrigger] = useState<string | null>(null);

  // A. Calcul Streak (multiples de 10)
  const calculateStreakReward = useCallback((streak: number, user: User): Reward | null => {
    if (streak % 10 !== 0 || streak === 0) return null;

    let pointsAmount;
    if (streak === 10) {
      pointsAmount = 2000;
    } else {
      pointsAmount = 2000 * Math.pow(2, streak / 10);
    }

    const canGiveLife = user.lives < MAX_LIVES;
    const finalAmount = canGiveLife ? 1 : pointsAmount;
    const finalType = canGiveLife ? RewardType.EXTRA_LIFE : RewardType.POINTS;

    console.log(`Calculating streak reward: streak=${streak}, canGiveLife=${canGiveLife}, type=${finalType}, amount=${finalAmount}`);

    return {
      type: finalType,
      amount: finalAmount,
      reason: `Série de ${streak} bonnes réponses !`,
      triggerType: 'streak', // Ajouter le type de trigger
      triggerValue: streak,   // Ajouter la valeur du trigger
    };
  }, []);

  // B. Calcul Level
  const calculateLevelReward = useCallback((newLevel: number, user: User): Reward | null => {
    if (isNaN(newLevel) || newLevel <= 0 || newLevel === 1) return null;

    const levelConfig = LEVEL_CONFIGS[newLevel];
    if (!levelConfig) return null;

    const canGiveLife = user.lives < MAX_LIVES;
    const rewardAmount = canGiveLife ? 1 : (levelConfig.pointsReward || 1000);
    const finalType = canGiveLife ? RewardType.EXTRA_LIFE : RewardType.POINTS;

    console.log(`Calculating level reward: level=${newLevel}, canGiveLife=${canGiveLife}, type=${finalType}, amount=${rewardAmount}`);

    return {
      type: finalType,
      amount: rewardAmount,
      reason: `Niveau ${newLevel} atteint !`,
      triggerType: 'level',  // Ajouter le type de trigger
      triggerValue: newLevel, // Ajouter la valeur du trigger
    };
  }, []);

  // D. checkRewards (MODIFIÉ pour inclure FirebaseAnalytics)
  const checkRewards = useCallback((trigger: RewardTrigger, user: User) => {
    const triggerKey = `${trigger.type}-${trigger.value}`;
    if (triggerKey === lastProcessedTrigger) {
      console.log(`[useRewards] Trigger ${triggerKey} already processed, skipping`);
      return;
    }

    if (isAnimating) {
      console.log('[useRewards] Animation in progress, ignoring new reward');
      return;
    }

    let reward: Reward | null = null;

    switch (trigger.type) {
      case 'streak':
        reward = calculateStreakReward(trigger.value, user);
        break;
      case 'level':
        reward = calculateLevelReward(trigger.value, user);
        break;
      default:
        break;
    }

    if (!reward) {
      // console.log(`[useRewards] No reward calculated for trigger ${trigger.type}-${trigger.value}`);
      return;
    }

    console.log(`[useRewards] Reward calculated: ${reward.type}, amount: ${reward.amount} for trigger ${trigger.type}-${trigger.value}`);

    // --- AJOUT DU TRACKING FIREBASE ICI ---
    try {
        const currentLevelForLog = trigger.type === 'level' ? trigger.value - 1 : user.level; // Utilise le niveau *précédent* si c'est un level up, sinon le niveau actuel
        const triggerValueForLog = trigger.type === 'streak' ? `streak_${trigger.value}` : `level_${trigger.value}`; // Valeur plus descriptive

        FirebaseAnalytics.reward(
            reward.type,        // 'POINTS' ou 'EXTRA_LIFE'
            reward.amount,      // Le montant calculé
            trigger.type,       // 'streak' ou 'level' (le type de trigger)
            triggerValueForLog, // La valeur spécifique (ex: 'streak_10', 'level_5')
            currentLevelForLog, // Le niveau où le trigger s'est produit
            user.points         // Le score *avant* application de la récompense (plus logique pour le contexte du trigger)
        );
        console.log(`[useRewards] FirebaseAnalytics.reward logged successfully.`);
    } catch (error) {
        console.error("[useRewards] Error logging FirebaseAnalytics.reward:", error);
        // Ne pas bloquer le flux de récompense pour une erreur de log
    }
    // --- FIN AJOUT TRACKING ---


    // Mettre en place l'animation et notifier le parent
    setCurrentReward(reward);
    setIsAnimating(true);
    setLastProcessedTrigger(triggerKey);

    if (onRewardEarned) {
      onRewardEarned(reward); // onRewardEarned est applyReward dans useGameLogicA
    }

  }, [
    isAnimating,
    lastProcessedTrigger,
    calculateStreakReward,
    calculateLevelReward,
    onRewardEarned
    // user n'est pas une dépendance directe de useCallback mais est passé en argument
    // FirebaseAnalytics est stable et importé
  ]);

  // ... (completeRewardAnimation, updateRewardPosition, useEffect cleanup restent inchangés) ...
  // E. completeRewardAnimation
  const completeRewardAnimation = useCallback(() => {
    console.log('[useRewards] Animation completed, resetting state');
    setCurrentReward(null);
    setIsAnimating(false);

    if (onRewardAnimationComplete) {
      onRewardAnimationComplete();
    }
  }, [onRewardAnimationComplete]);

  // F. updateRewardPosition
  const updateRewardPosition = useCallback((position: Position) => {
    if (!currentReward) return;

    console.log(`[useRewards] Updating reward position to x=${position.x}, y=${position.y}`);

    setCurrentReward(prev => prev ? {
      ...prev,
      targetPosition: position
    } : null);
  }, [currentReward]);

  // Cleanup timer
  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => {
        if (isAnimating) {
          console.warn('[useRewards] Animation timeout reached, forcing completion');
          completeRewardAnimation();
        }
      }, 5000); // 5 secondes

      return () => clearTimeout(timer);
    }
  }, [isAnimating, completeRewardAnimation]);


  return {
    currentReward,
    isAnimating,
    checkRewards,
    completeRewardAnimation,
    updateRewardPosition,
  };
};

export default useRewards;