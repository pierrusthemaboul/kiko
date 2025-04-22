// /home/pierre/sword/kiko/hooks/useRewards.ts

import { useState, useCallback, useEffect, useRef } from 'react';
import { RewardType, User, MAX_LIVES } from './types';
import { LEVEL_CONFIGS } from './levelConfigs';
import { FirebaseAnalytics } from '../lib/firebase';

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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingReward = useRef(false);

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
      triggerType: 'streak',
      triggerValue: streak,
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
    triggerType: 'level',
    triggerValue: newLevel,
  };
}, []);

// completeRewardAnimation - Version améliorée
const completeRewardAnimation = useCallback(() => {
  console.log('[useRewards] Animation completed, resetting state');
  
  // Nettoyer le timeout de sécurité
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }
  
  setCurrentReward(null);
  setIsAnimating(false);
  isProcessingReward.current = false;

  if (onRewardAnimationComplete) {
    onRewardAnimationComplete();
  }
}, [onRewardAnimationComplete]);

// updateRewardPosition - Version améliorée
const updateRewardPosition = useCallback((position: Position) => {
  if (!currentReward) {
    console.log('[useRewards] No current reward to update position');
    return;
  }

  // Vérifier que la position est valide
  if (isNaN(position.x) || isNaN(position.y)) {
    console.warn(`[useRewards] Invalid position coordinates: x=${position.x}, y=${position.y}`);
    return;
  }
  
  // Valeurs trop faibles probablement incorrectes
  if (position.x < 10 || position.y < 10) {
    console.warn(`[useRewards] Position too close to origin, might be incorrect: x=${position.x}, y=${position.y}`);
    return;
  }

  console.log(`[useRewards] Updating reward position to x=${position.x}, y=${position.y}`);

  setCurrentReward(prev => {
    if (!prev) return null;
    
    // Si la position a changé de manière significative
    const positionChanged = 
      !prev.targetPosition || 
      Math.abs(prev.targetPosition.x - position.x) > 5 || 
      Math.abs(prev.targetPosition.y - position.y) > 5;
      
    if (positionChanged) {
      return {
        ...prev,
        targetPosition: position
      };
    }
    
    return prev; // Pas de changement significatif
  });
}, [currentReward]);

// checkRewards - Version améliorée
const checkRewards = useCallback((trigger: RewardTrigger, user: User) => {
  // Éviter le traitement concurrent des récompenses
  if (isProcessingReward.current) {
    console.log('[useRewards] Already processing a reward, skipping this check');
    return;
  }

  isProcessingReward.current = true;
  const triggerKey = `${trigger.type}-${trigger.value}`;
  
  // Éviter les doublons
  if (triggerKey === lastProcessedTrigger) {
    console.log(`[useRewards] Trigger ${triggerKey} already processed, skipping`);
    isProcessingReward.current = false;
    return;
  }

  // Si une animation est déjà en cours, on peut soit:
  // 1. Ignorer la nouvelle récompense (approche actuelle)
  // 2. Terminer l'animation en cours et passer à la suivante (alternative)
  if (isAnimating) {
    console.log('[useRewards] Animation in progress, ignoring new reward');
    isProcessingReward.current = false;
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
    console.log(`[useRewards] No reward calculated for trigger ${trigger.type}-${trigger.value}`);
    isProcessingReward.current = false;
    return;
  }

  console.log(`[useRewards] Reward calculated: ${reward.type}, amount: ${reward.amount} for trigger ${trigger.type}-${trigger.value}`);

  // Tracking Firebase
  try {
    const currentLevelForLog = trigger.type === 'level' ? trigger.value - 1 : user.level;
    const triggerValueForLog = trigger.type === 'streak' ? `streak-${trigger.value}` : `level-${trigger.value}`;

    FirebaseAnalytics.reward(
      reward.type,
      reward.amount,
      trigger.type,
      triggerValueForLog,
      currentLevelForLog,
      user.points
    );
    console.log(`[useRewards] FirebaseAnalytics.reward logged successfully.`);
  } catch (error) {
    console.error("[useRewards] Error logging FirebaseAnalytics.reward:", error);
  }

  // Mettre en place l'animation et notifier le parent
  setCurrentReward(reward);
  setIsAnimating(true);
  setLastProcessedTrigger(triggerKey);

  // Mettre en place un timeout de sécurité pour s'assurer que l'animation se termine
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
  }
  
  timeoutRef.current = setTimeout(() => {
    if (isAnimating) {
      console.warn('[useRewards] Animation timeout reached, forcing completion');
      completeRewardAnimation();
    }
  }, 5000); // 5 secondes max pour l'animation complète

  if (onRewardEarned) {
    onRewardEarned(reward);
  }

}, [
  isAnimating,
  lastProcessedTrigger,
  calculateStreakReward,
  calculateLevelReward,
  onRewardEarned,
  completeRewardAnimation
]);

// Nettoyage au démontage
useEffect(() => {
  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };
}, []);

return {
  currentReward,
  isAnimating,
  checkRewards,
  completeRewardAnimation,
  updateRewardPosition,
};
};

export default useRewards;