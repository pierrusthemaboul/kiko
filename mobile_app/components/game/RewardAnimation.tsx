import React, { useEffect, useCallback, useRef, useId, useMemo } from 'react';
import { traceGameRender } from '@/utils/logger';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import AnimatedRe, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface RewardAnimationProps {
  type: string;
  amount: number;
  targetPosition?: { x: number; y: number }; // Utilisée si fournie
  onComplete?: () => void;
}

const RewardAnimation: React.FC<RewardAnimationProps> = ({
  type,
  amount,
  targetPosition,
  onComplete,
}) => {
  const rewardId = useId();
  useEffect(() => {
    traceGameRender('reward.mount', { rewardId, type, amount });
    return () => traceGameRender('reward.unmount', { rewardId });
  }, []);
  useEffect(() => {
    traceGameRender('reward.props', { rewardId, type, amount, targetPosition });
  }, [type, amount, targetPosition?.x, targetPosition?.y]);

  // Réfs pour les animations (Reanimated : un seul canal UI-thread)
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(0.3);
  const isAnimationStarted = useRef(false);
  const isMountedRef = useRef(true);

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // Dimensions de l'écran
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // Fonction pour démarrer l'animation
  const startAnimation = useCallback(() => {
    // Éviter de lancer plusieurs animations
    if (isAnimationStarted.current || !isMountedRef.current) return;
    isAnimationStarted.current = true;
    const startedAt = Date.now();
    traceGameRender('reward.start', { rewardId, type, amount, targetPosition });

    // Déterminer la position finale en fonction du type et de la cible
    let destinationX: number, destinationY: number;

    // Si une position cible est fournie ET que ses valeurs sont valides (non NaN), on l'utilise
    if (targetPosition && !isNaN(targetPosition.x) && !isNaN(targetPosition.y)) {
      destinationX = targetPosition.x;
      destinationY = targetPosition.y;
    } else {
      // Sinon, utiliser des positions par défaut en fonction du type de récompense
      if (type === "EXTRA_LIFE") {
        destinationX = screenWidth * 0.80; // Position par défaut pour les vies
        destinationY = 40;
      } else {
        destinationX = screenWidth * 0.20; // Position par défaut pour les points
        destinationY = 40;
      }
    }

    // Calcul des décalages par rapport au centre de l'écran
    const offsetX = destinationX - (screenWidth / 2);
    const offsetY = destinationY - (screenHeight / 2);

    // Réinitialisation des valeurs
    translateX.value = 0;
    translateY.value = 0;
    opacity.value = 0;
    scale.value = 0.3;

    // Timeline Reanimated (~2 s au total) :
    //  1. 0→300 ms  : apparition (opacity 1 + scale spring 1.3)
    //  2. 300→600   : pause
    //  3. 600→1400  : déplacement + réduction scale 0.7
    //  4. 1400→1700 : "pop" (scale 0.9 → 0.7)
    //  5. 1700→2000 : disparition (opacity 0)
    const onFinished = (finished: boolean) => {
      traceGameRender('reward.end', { rewardId, finished, mounted: isMountedRef.current, elapsedMs: Date.now() - startedAt });
      if (!isMountedRef.current) return;
      if (onComplete) {
        onComplete();
      }
    };

    opacity.value = withSequence(
      withTiming(1, { duration: 300 }),
      withDelay(1400, withTiming(0, { duration: 300 }, (finished) => {
        runOnJS(onFinished)(finished === true);
      }))
    );
    scale.value = withSequence(
      withSpring(1.3, { damping: 12, stiffness: 120 }),
      withDelay(300, withTiming(0.7, { duration: 800 })),
      withTiming(0.9, { duration: 150 }),
      withTiming(0.7, { duration: 150 })
    );
    translateX.value = withDelay(600, withTiming(offsetX, { duration: 800 }));
    translateY.value = withDelay(600, withTiming(offsetY, { duration: 800 }));
  }, [
    type, amount, targetPosition, screenWidth, screenHeight,
    opacity, translateX, translateY, scale, onComplete
  ]);

  // Effet pour gérer le cycle de vie du composant et lancer l'animation
  useEffect(() => {
    isMountedRef.current = true;
    
    // Démarrer l'animation avec un court délai pour s'assurer que le composant est bien monté
    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        startAnimation();
      }
    }, 100);
    
    // Assurer que l'animation se termine après un certain temps, même en cas de problème
    const safetyTimer = setTimeout(() => {
      traceGameRender('reward.timeout', { rewardId, mounted: isMountedRef.current });
      if (isMountedRef.current) {
        if (onComplete) {
          onComplete();
        }
      }
    }, 3000); // 3 secondes max pour l'animation

    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
      clearTimeout(safetyTimer);
    };
  }, [startAnimation, onComplete]);
  
  // Effet pour réagir aux changements de targetPosition
  useEffect(() => {
    // Si l'animation n'a pas encore été lancée et que la position a été mise à jour,
    // essayer de lancer l'animation
    if (!isAnimationStarted.current && targetPosition && 
        !isNaN(targetPosition.x) && !isNaN(targetPosition.y)) {
      const timer = setTimeout(() => {
        if (isMountedRef.current && !isAnimationStarted.current) {
          startAnimation();
        }
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [targetPosition, startAnimation]);

  // Configuration de l'icône et de la couleur en fonction du type de récompense
  type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

  const getConfig = () => {
    switch (type) {
      case "POINTS":
        return { icon: 'star-outline' as IoniconName, color: '#FFD700' }; // Or
      case "EXTRA_LIFE":
        return { icon: 'heart-outline' as IoniconName, color: '#FF4757' }; // Rouge vif pour correspondre aux cœurs
      case "STREAK_BONUS":
        return { icon: 'flame-outline' as IoniconName, color: '#4169E1' }; // Bleu royal
      default:
        return { icon: 'star-outline' as IoniconName, color: '#1E88E5' }; // Bleu
    }
  };

  const config = getConfig();

  // Enfant figé de l'Animated.View : un nouvel élément à chaque render
  // recréerait le nœud AnimatedProps → __restoreDefaultValues → la bulle
  // reviendrait une frame à ses valeurs par défaut pendant son animation.
  const bubbleEl = useMemo(() => (
    <View style={[styles.bubble, { backgroundColor: config.color }]}>
      <Ionicons name={config.icon} size={24} color="white" style={styles.icon} />
      <Text style={styles.amount}>+{amount}</Text>
    </View>
  ), [config.color, config.icon, amount]);

  return (
    <AnimatedRe.View
      style={[styles.container, bubbleStyle]}
    >
      {bubbleEl}
    </AnimatedRe.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 70,
    height: 70,
    // Centre de l'écran comme point de départ
    left: Dimensions.get('window').width / 2 - 35,
    top: Dimensions.get('window').height / 2 - 35,
    zIndex: 9999,
    elevation: 9999,
  },
  bubble: {
    width: '100%',
    height: '100%',
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.5,
  },
  icon: {
    marginBottom: 3,
  },
  amount: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    position: 'absolute',
    bottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default RewardAnimation;
