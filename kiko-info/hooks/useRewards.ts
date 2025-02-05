import { useState, useCallback } from 'react';
import { RewardType, User, MAX_LIVES } from './types/index';
import { LEVEL_CONFIGS } from './levelConfigs';

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
}
interface RewardTrigger {
  type: 'streak' | 'level' | 'precision';
  value: number;
}
interface UseRewardsProps {
  onRewardEarned?: (reward: Reward) => void;
  onRewardAnimationComplete?: () => void;
}

const debugLogs = { /* ... invariable, comme avant ... */ };

export const useRewards = ({
  onRewardEarned,
  onRewardAnimationComplete
}: UseRewardsProps = {}) => {

  const [currentReward, setCurrentReward] = useState<Reward | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // 1) On va plus se servir de la file d’attente : on la supprime ou la met en commentaire
  // Pour vraiment empêcher les enchaînements multiples, on refuse toute nouvelle reward si isAnimating est true
  // const [pendingRewards, setPendingRewards] = useState<Reward[]>([]);

  // A. Calcul Streak (multiples de 10)
  const calculateStreakReward = useCallback((streak: number, user: User): Reward | null => {
    if (streak % 10 !== 0) return null;
    const multiplier = Math.floor(streak / 10);
    const basePoints = 100;
    const pointsAmount = basePoints * multiplier;

    const canGiveLife = user.lives < MAX_LIVES;

    return {
      type: canGiveLife ? RewardType.EXTRA_LIFE : RewardType.POINTS,
      amount: canGiveLife ? 1 : pointsAmount,
      reason: `Série de ${streak} bonnes réponses !`
    };
  }, []);

  // B. Calcul Level
  const calculateLevelReward = useCallback((newLevel: number, user: User): Reward | null => {
    if (isNaN(newLevel) || newLevel <= 0) return null;
    const levelConfig = LEVEL_CONFIGS[newLevel];
    if (!levelConfig) return null;

    const canGiveLife = user.lives < MAX_LIVES;
    return {
      type: canGiveLife ? RewardType.EXTRA_LIFE : RewardType.POINTS,
      amount: canGiveLife ? 1 : (levelConfig.pointsReward || 1000),
      reason: `Niveau ${newLevel} atteint !`
    };
  }, []);

  // C. “processNextReward” n’est plus utile si on n’a pas de file d’attente

  // D. checkRewards
  const checkRewards = useCallback((trigger: RewardTrigger, user: User) => {
    // Si on est déjà en train d’animer => on ignore
    if (isAnimating) {
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
      return;
    }

    // On commence direct l’animation
    setCurrentReward(reward);
    setIsAnimating(true);

    // On notifie immédiatement le parent
    if (onRewardEarned) {
      onRewardEarned(reward);
    }

  }, [
    isAnimating,
    calculateStreakReward,
    calculateLevelReward,
    onRewardEarned
  ]);

  // E. completeRewardAnimation
  const completeRewardAnimation = useCallback(() => {
    setCurrentReward(null);
    setIsAnimating(false);

    if (onRewardAnimationComplete) {
      onRewardAnimationComplete();
    }
  }, [onRewardAnimationComplete]);

  // F. updateRewardPosition
  const updateRewardPosition = useCallback((position: Position) => {
    if (!currentReward) return;
    setCurrentReward(prev => prev ? { ...prev, targetPosition: position } : null);
  }, [currentReward]);

  return {
    currentReward,
    isAnimating,
    checkRewards,
    completeRewardAnimation,
    updateRewardPosition,
  };
};

export default useRewards;
