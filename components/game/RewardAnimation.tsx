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

  useEffect(() => {
    let isMounted = true;

    // Si la position est invalide ou manquante, on skip l’animation
    if (!targetPosition || typeof targetPosition.x !== 'number' || typeof targetPosition.y !== 'number') {
      opacity.setValue(0);
      translateY.setValue(0);
      scale.setValue(1);
      onComplete?.();
      return;
    }

    // On lance la séquence d’animation
    requestAnimationFrame(() => {
      if (!isMounted) return;

      // 1) Apparition
      const appear = Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1.2,
          friction: 4,
          useNativeDriver: true,
        }),
      ]);

      // 2) On fait “flotter” et disparaître
      const floatAndFade = Animated.parallel([
        Animated.timing(translateY, {
          toValue: -50,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 400,
          delay: 400,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
      ]);

      Animated.sequence([appear, floatAndFade]).start(({ finished }) => {
        if (finished && isMounted) {
          // On reset les valeurs
          opacity.setValue(0);
          translateY.setValue(0);
          scale.setValue(1);
          onComplete?.();
        }
      });
    });

    // Cleanup
    return () => {
      isMounted = false;
    };
  }, [type, amount, targetPosition, onComplete]);

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
          left: targetPosition.x - 30,
          top: targetPosition.y - 30,
        },
      ]}
    >
      <View style={[styles.bubble, { backgroundColor: config.color }]}>
        <Ionicons name={config.icon} size={20} color="white" style={styles.icon} />
        <Text style={styles.amount}>+{amount}</Text>
      </View>
    </Animated.View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    pointerEvents: 'none',
  },
  bubble: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  icon: {
    marginBottom: 2,
  },
  amount: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    position: 'absolute',
    bottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

// Ajout de onComplete dans la comparaison
export default React.memo(RewardAnimation, (prevProps, nextProps) => {
  return (
    prevProps.type === nextProps.type &&
    prevProps.amount === nextProps.amount &&
    prevProps.onComplete === nextProps.onComplete &&
    prevProps.targetPosition?.x === nextProps.targetPosition?.x &&
    prevProps.targetPosition?.y === nextProps.targetPosition?.y
  );
});
