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

  // File d'attente pour les récompenses
  const [rewardQueue, setRewardQueue] = useState<{ trigger: RewardTrigger, user: User }[]>([]);

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
  }, [effectiveMaxLives]);

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
  }, [effectiveMaxLives]);

  // completeRewardAnimation - Version améliorée avec gestion de la file d'attente
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

    // Laisser un petit délai avant de traiter la prochaine récompense de la file
    // Cela se fera automatiquement via le useEffect qui surveille rewardQueue et isAnimating
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

  // Traitement d'une récompense spécifique (interne)
  const processReward = useCallback((trigger: RewardTrigger, user: User) => {
    isProcessingReward.current = true;
    const triggerKey = `${trigger.type}-${trigger.value}`;

    // Éviter les doublons (sauf si c'est une nouvelle tentative valide)
    if (triggerKey === lastProcessedTrigger) {
      // logger.log(`[useRewards] Trigger ${triggerKey} already processed, skipping`);
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
  }, [calculateStreakReward, calculateLevelReward, completeRewardAnimation, lastProcessedTrigger, onRewardEarned, isAnimating]);

  // checkRewards - Version améliorée avec File d'attente
  const checkRewards = useCallback((trigger: RewardTrigger, user: User) => {
    // Ajouter à la file d'attente
    setRewardQueue(prev => [...prev, { trigger, user }]);
  }, []);

  // Effet pour traiter la file d'attente
  useEffect(() => {
    // Si on n'anime pas, qu'on ne traite pas déjà, et qu'il y a des récompenses en attente
    if (!isAnimating && !isProcessingReward.current && rewardQueue.length > 0) {
      const nextReward = rewardQueue[0];

      // Retirer de la file
      setRewardQueue(prev => prev.slice(1));

      // Traiter
      processReward(nextReward.trigger, nextReward.user);
    }
  }, [rewardQueue, isAnimating, processReward]);

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
