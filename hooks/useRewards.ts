import { useState, useCallback, useEffect } from 'react';
import { RewardType, User, MAX_LIVES } from './types';
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

export const useRewards = ({
  onRewardEarned,
  onRewardAnimationComplete
}: UseRewardsProps = {}) => {

  const [currentReward, setCurrentReward] = useState<Reward | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastProcessedTrigger, setLastProcessedTrigger] = useState<string | null>(null);

  // A. Calcul Streak (multiples de 10)
  // Modification : ajustement de la formule pour correspondre à 2000, 8000, 16 000, etc.
  const calculateStreakReward = useCallback((streak: number, user: User): Reward | null => {
    if (streak % 10 !== 0 || streak === 0) return null;
    
    let pointsAmount;
    if (streak === 10) {
      pointsAmount = 2000;
    } else {
      // Pour 20, 30, 40, etc., on applique un facteur exponentiel :
      pointsAmount = 2000 * Math.pow(2, streak / 10);
    }

    const canGiveLife = user.lives < MAX_LIVES;

    console.log(`Calculating streak reward: streak=${streak}, canGiveLife=${canGiveLife}, amount=${canGiveLife ? 1 : pointsAmount}`);

    return {
      type: canGiveLife ? RewardType.EXTRA_LIFE : RewardType.POINTS,
      amount: canGiveLife ? 1 : pointsAmount,
      reason: `Série de ${streak} bonnes réponses !`
    };
  }, []);

  // B. Calcul Level
  const calculateLevelReward = useCallback((newLevel: number, user: User): Reward | null => {
    if (isNaN(newLevel) || newLevel <= 0 || newLevel === 1) return null;
    
    const levelConfig = LEVEL_CONFIGS[newLevel];
    if (!levelConfig) return null;

    const canGiveLife = user.lives < MAX_LIVES;
    const rewardAmount = canGiveLife ? 1 : (levelConfig.pointsReward || 1000);
    
    console.log(`Calculating level reward: level=${newLevel}, canGiveLife=${canGiveLife}, amount=${rewardAmount}`);
    
    return {
      type: canGiveLife ? RewardType.EXTRA_LIFE : RewardType.POINTS,
      amount: rewardAmount,
      reason: `Niveau ${newLevel} atteint !`
    };
  }, []);

  // D. checkRewards
  const checkRewards = useCallback((trigger: RewardTrigger, user: User) => {
    // Protection contre les appels répétés avec le même trigger
    const triggerKey = `${trigger.type}-${trigger.value}`;
    if (triggerKey === lastProcessedTrigger) {
      console.log(`Trigger ${triggerKey} already processed, skipping`);
      return;
    }
    
    // Si on est déjà en train d'animer => on ignore
    if (isAnimating) {
      console.log('Animation in progress, ignoring new reward');
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
      console.log(`No reward calculated for trigger ${trigger.type}-${trigger.value}`);
      return;
    }

    console.log(`Setting current reward: ${reward.type}, amount: ${reward.amount}`);
    
    // On commence direct l'animation
    setCurrentReward(reward);
    setIsAnimating(true);
    setLastProcessedTrigger(triggerKey);

    // On notifie immédiatement le parent
    if (onRewardEarned) {
      onRewardEarned(reward);
    }

  }, [
    isAnimating,
    lastProcessedTrigger,
    calculateStreakReward,
    calculateLevelReward,
    onRewardEarned
  ]);

  // E. completeRewardAnimation
  const completeRewardAnimation = useCallback(() => {
    console.log('Animation completed, resetting state');
    setCurrentReward(null);
    setIsAnimating(false);

    if (onRewardAnimationComplete) {
      onRewardAnimationComplete();
    }
  }, [onRewardAnimationComplete]);

  // F. updateRewardPosition
  const updateRewardPosition = useCallback((position: Position) => {
    if (!currentReward) return;
    
    console.log(`Updating reward position to x=${position.x}, y=${position.y}`);
    
    setCurrentReward(prev => prev ? {
      ...prev,
      targetPosition: position
    } : null);
  }, [currentReward]);

  // Cleanup timer pour éviter les blocages
  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => {
        if (isAnimating) {
          console.log('Animation timeout reached, forcing completion');
          completeRewardAnimation();
        }
      }, 5000); // 5 secondes maximum pour l'animation
      
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
