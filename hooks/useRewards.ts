// /home/pierre/sword/kiko/hooks/useRewards.ts

import { useState, useCallback, useEffect, useRef } from 'react';
import { RewardType, User, MAX_LIVES } from './types';
import { LEVEL_CONFIGS } from './levelConfigs';
import { logger } from '../utils/logger';
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
  maxLives?: number;
}

export const useRewards = ({
  onRewardEarned,
  onRewardAnimationComplete,
  maxLives,
}: UseRewardsProps = {}) => {
  const [currentReward, setCurrentReward] = useState<Reward | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastProcessedTrigger, setLastProcessedTrigger] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingReward = useRef(false);
  const effectiveMaxLives = Math.max(1, maxLives ?? MAX_LIVES);

  // A. Calcul Streak RÉÉQUILIBRÉ (multiples de 10)
  const calculateStreakReward = useCallback((streak: number, user: User): Reward | null => {
    if (streak % 10 !== 0 || streak === 0) return null;

    let pointsAmount;
    
    // NOUVEAU SYSTÈME - Progression modérée et plafonnée
    if (streak === 10) {
      pointsAmount = 300; // Base réduite de 2000 → 300
    } else if (streak === 20) {
      pointsAmount = 500; // Progression modérée
    } else if (streak === 30) {
      pointsAmount = 750; // Encore modérée
    } else if (streak === 40) {
      pointsAmount = 1000; // Équivalent à un gros niveau
    } else if (streak === 50) {
      pointsAmount = 1500; // Récompense pour l'excellence
    } else if (streak >= 60) {
      // PLAFOND à partir de 60+ : progression très lente
      const extraStreaks = Math.floor((streak - 50) / 10);
      pointsAmount = 1500 + (extraStreaks * 200); // +200 par tranche de 10
      // Exemple: 70 = 1500 + 400 = 1900, 100 = 1500 + 1000 = 2500
    }

    // Priorité aux vies si possible
    const canGiveLife = user.lives < effectiveMaxLives;
    const finalAmount = canGiveLife ? 1 : pointsAmount;
    const finalType = canGiveLife ? RewardType.EXTRA_LIFE : RewardType.POINTS;

    // logger.log(`Calculating BALANCED streak reward: streak=${streak}, canGiveLife=${canGiveLife}, type=${finalType}, amount=${finalAmount}`);

    return {
      type: finalType,
      amount: finalAmount,
      reason: `Série de ${streak} bonnes réponses !`,
      triggerType: 'streak',
      triggerValue: streak,
    };
  }, []);

  // B. Calcul Level LÉGÈREMENT AUGMENTÉ
  const calculateLevelReward = useCallback((newLevel: number, user: User): Reward | null => {
    if (isNaN(newLevel) || newLevel <= 0 || newLevel === 1) return null;

    const levelConfig = LEVEL_CONFIGS[newLevel];
    if (!levelConfig) return null;

    // Priorité aux vies si possible
    const canGiveLife = user.lives < effectiveMaxLives;
    
    // Si on peut donner une vie, on la donne
    if (canGiveLife) {
      return {
        type: RewardType.EXTRA_LIFE,
        amount: 1,
        reason: `Niveau ${newLevel} atteint !`,
        triggerType: 'level',
        triggerValue: newLevel,
      };
    }

    // Sinon, donner les points du niveau (déjà équilibrés dans levelConfigs.ts)
    const rewardAmount = levelConfig.pointsReward || 1000;

    // logger.log(`Calculating level reward: level=${newLevel}, type=POINTS, amount=${rewardAmount}`);

    return {
      type: RewardType.POINTS,
      amount: rewardAmount,
      reason: `Niveau ${newLevel} atteint !`,
      triggerType: 'level',
      triggerValue: newLevel,
    };
  }, []);

  // completeRewardAnimation - Version améliorée
  const completeRewardAnimation = useCallback(() => {
    // logger.log('[useRewards] Animation completed, resetting state');
    
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
      // logger.log('[useRewards] No current reward to update position');
      return;
    }

    // Vérifier que la position est valide
    if (isNaN(position.x) || isNaN(position.y)) {
      logger.warn(`[useRewards] Invalid position coordinates: x=${position.x}, y=${position.y}`);
      return;
    }
    
    // Valeurs trop faibles probablement incorrectes
    if (position.x < 10 || position.y < 10) {
      // logger.warn(`[useRewards] Position too close to origin, might be incorrect: x=${position.x}, y=${position.y}`);
      return;
    }

    // console.log(`[useRewards] Updating reward position to x=${position.x}, y=${position.y}`);

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
      // logger.log('[useRewards] Already processing a reward, skipping this check');
      return;
    }

    isProcessingReward.current = true;
    const triggerKey = `${trigger.type}-${trigger.value}`;
    
    // Éviter les doublons
    if (triggerKey === lastProcessedTrigger) {
      // logger.log(`[useRewards] Trigger ${triggerKey} already processed, skipping`);
      isProcessingReward.current = false;
      return;
    }

    // Si une animation est déjà en cours, on peut soit:
    // 1. Ignorer la nouvelle récompense (approche actuelle)
    // 2. Terminer l'animation en cours et passer à la suivante (alternative)
    if (isAnimating) {
      // logger.log('[useRewards] Animation in progress, ignoring new reward');
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
      // logger.log(`[useRewards] No reward calculated for trigger ${trigger.type}-${trigger.value}`);
      isProcessingReward.current = false;
      return;
    }

    // logger.log(`[useRewards] BALANCED reward calculated: ${reward.type}, amount: ${reward.amount} for trigger ${trigger.type}-${trigger.value}`);

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
      // console.log(`[useRewards] FirebaseAnalytics.reward logged successfully.`);
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
        // logger.warn('[useRewards] Animation timeout reached, forcing completion');
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
