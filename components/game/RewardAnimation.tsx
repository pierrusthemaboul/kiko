// RewardAnimation.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RewardType } from '@/hooks/types';
import { colors } from '../../constants/Colors';

// 1. Définition des props
interface RewardAnimationProps {
  type: RewardType;
  amount: number;
  targetPosition?: { x: number; y: number };
  onComplete?: () => void;
}

const RewardAnimation: React.FC<RewardAnimationProps> = ({
  type,
  amount,
  targetPosition = { x: 0, y: 0 },
  onComplete,
}) => {
  // Réfs animées
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  // Log de debug pour tracer le cycle de vie
  console.log(`RewardAnimation rendered: type=${type}, amount=${amount}, target=(${targetPosition?.x},${targetPosition?.y})`);

  useEffect(() => {
    let isMounted = true;

    // Si la position est invalide ou manquante, on skip l'animation
    if (!targetPosition || typeof targetPosition.x !== 'number' || typeof targetPosition.y !== 'number') {
      console.log('Invalid target position, skipping animation');
      opacity.setValue(0);
      translateY.setValue(0);
      scale.setValue(1);
      onComplete?.();
      return;
    }

    console.log(`Starting animation to target=(${targetPosition.x},${targetPosition.y})`);

    // On lance la séquence d'animation
    requestAnimationFrame(() => {
      if (!isMounted) return;

      // 1) Apparition
      const appear = Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300, // Légèrement plus long pour mieux voir l'apparition
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1.3, // Légèrement plus grand pour plus d'impact
          friction: 4,
          useNativeDriver: true,
        }),
      ]);

      // 2) On fait "flotter" et disparaître
      const floatAndFade = Animated.parallel([
        Animated.timing(translateY, {
          toValue: -70, // Plus loin pour un meilleur effet
          duration: 1000, // Plus long pour voir le mouvement
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 500,
          delay: 500, // Plus de délai pour voir l'animation
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.8,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]);

      Animated.sequence([appear, floatAndFade]).start(({ finished }) => {
        if (finished && isMounted) {
          console.log('Animation sequence completed');
          // On reset les valeurs
          opacity.setValue(0);
          translateY.setValue(0);
          scale.setValue(1);
          if (onComplete) {
            console.log('Calling onComplete callback');
            onComplete();
          }
        }
      });
    });

    // Cleanup
    return () => {
      isMounted = false;
    };
  }, [type, amount, targetPosition?.x, targetPosition?.y, onComplete]);

  // Gestion du style en fonction du type de reward
  const getConfig = () => {
    switch (type) {
      case RewardType.POINTS:
        return {
          icon: 'star',
          color: colors.warningYellow,
        };
      case RewardType.EXTRA_LIFE:
        return {
          icon: 'heart',
          color: colors.incorrectRed,
        };
      case RewardType.STREAK_BONUS:
        return {
          icon: 'flame',
          color: colors.primary,
        };
      default:
        return {
          icon: 'star',
          color: colors.primary,
        };
    }
  };

  const config = getConfig();

  // Rendu
  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateY },
            { scale }
          ],
          opacity,
          left: targetPosition.x - 35, // Ajusté pour mieux centrer
          top: targetPosition.y - 35,  // Ajusté pour mieux centrer
        },
      ]}
    >
      <View style={[styles.bubble, { backgroundColor: config.color }]}>
        <Ionicons name={config.icon} size={24} color="white" style={styles.icon} />
        <Text style={styles.amount}>+{amount}</Text>
      </View>
    </Animated.View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 70,  // Plus grand pour plus d'impact
    height: 70, // Plus grand pour plus d'impact
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    pointerEvents: 'none',
  },
  bubble: {
    width: '100%',
    height: '100%',
    borderRadius: 35, // Ajusté pour le nouveau size
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4.5,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  icon: {
    marginBottom: 3,
  },
  amount: {
    color: 'white',
    fontSize: 16,  // Plus grand
    fontWeight: 'bold',
    position: 'absolute',
    bottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default React.memo(RewardAnimation, (prevProps, nextProps) => {
  // Vérification explicite des props pour debugger 
  const positionChanged = 
    prevProps.targetPosition?.x !== nextProps.targetPosition?.x || 
    prevProps.targetPosition?.y !== nextProps.targetPosition?.y;
  
  const otherPropsChanged = 
    prevProps.type !== nextProps.type ||
    prevProps.amount !== nextProps.amount ||
    prevProps.onComplete !== nextProps.onComplete;
  
  // Si une prop a changé, on rerender
  const shouldUpdate = positionChanged || otherPropsChanged;
  
  if (shouldUpdate) {
    console.log('RewardAnimation will update due to prop changes');
  }
  
  return !shouldUpdate;
});