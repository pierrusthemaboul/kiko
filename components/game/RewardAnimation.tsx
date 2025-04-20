import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
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
  // Réfs pour les animations
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.3)).current;

  // Dimensions de l'écran
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  useEffect(() => {
    let isMounted = true;

    // Déterminer la position finale en fonction du type et de la cible
    let destinationX: number, destinationY: number;

    // Si une position cible est fournie ET que ses valeurs sont valides (non NaN), on l'utilise
    if (targetPosition && !isNaN(targetPosition.x) && !isNaN(targetPosition.y)) {
      destinationX = targetPosition.x;
      destinationY = targetPosition.y;
    } else {
      // Sinon, utiliser des positions par défaut en fonction du type de récompense
      if (type === "EXTRA_LIFE") {
        // Pour les vies : 30% de la largeur de l'écran (zone des cœurs)
        destinationX = screenWidth * 0.30; // Ajusté selon l'image
        destinationY = 20; // Position Y plus haute
      } else {
        // Pour les points : près du score (à côté de "Pierrot")
        destinationX = screenWidth * 0.20; // Ajusté selon l'image
        destinationY = 20;
      }
    }

    // Calcul des décalages par rapport au centre de l'écran
    const offsetX = destinationX - (screenWidth / 2);
    const offsetY = destinationY - (screenHeight / 2);

    const startAnimation = () => {
      // Réinitialisation des valeurs
      translateX.setValue(0);
      translateY.setValue(0);
      opacity.setValue(0);
      scale.setValue(0.3);

      Animated.sequence([
        // 1. Apparition au centre
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(scale, {
            toValue: 1.3,
            friction: 6,
            useNativeDriver: true,
          }),
        ]),

        // 2. Petit délai
        Animated.delay(200),

        // 3. Déplacement vers la position finale
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: offsetX,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: offsetY,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),

        // 4. Effet "pop" à l'arrivée
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 0.9,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.7,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),

        // 5. Disparition
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && isMounted && onComplete) {
          onComplete();
        }
      });
    };

    // Lancer l'animation après un court délai
    const timer = setTimeout(startAnimation, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [type, amount, targetPosition, screenWidth, screenHeight, onComplete]);

  // Configuration de l'icône et de la couleur en fonction du type de récompense
  const getConfig = () => {
    switch (type) {
      case "POINTS":
        return { icon: 'star', color: '#FFD700' }; // Or
      case "EXTRA_LIFE":
        return { icon: 'heart', color: '#FF4757' }; // Rouge vif pour correspondre aux cœurs
      case "STREAK_BONUS":
        return { icon: 'flame', color: '#4169E1' }; // Bleu royal
      default:
        return { icon: 'star', color: '#1E88E5' }; // Bleu
    }
  };

  const config = getConfig();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [
            { translateX },
            { translateY },
            { scale }
          ],
        }
      ]}
    >
      <View style={[styles.bubble, { backgroundColor: config.color }]}>
        <Ionicons name={config.icon} size={24} color="white" style={styles.icon} />
        <Text style={styles.amount}>+{amount}</Text>
      </View>
    </Animated.View>
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