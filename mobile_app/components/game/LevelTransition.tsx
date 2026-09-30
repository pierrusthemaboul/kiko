import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Image } from 'react-native';
import AnimatedRe, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface LevelTransitionProps {
  visible: boolean;
  onComplete: () => void;
}

const LevelTransition: React.FC<LevelTransitionProps> = ({ visible, onComplete }) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    console.log('[LevelTransition] useEffect, visible:', visible);
    if (visible) {
      console.log('[LevelTransition] Démarrage animation d\'entrée');
      // Animation d'entrée
      opacity.value = withTiming(1, { duration: 600 });
      scale.value = withSpring(1, { damping: 15, stiffness: 90 });

      // Animation de sortie après 2 secondes (affichage plus long)
      const t = setTimeout(() => {
        console.log('[LevelTransition] Démarrage animation de sortie');
        opacity.value = withTiming(0, { duration: 500 }, () => {
          console.log('[LevelTransition] Animation de sortie terminée');
          runOnJS(onComplete)();
        });
        scale.value = withTiming(1.1, { duration: 500 });
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [visible]);

  // Enfant figé : un nouvel élément `children` recréerait le nœud AnimatedProps
  // et restaurerait les valeurs par défaut une frame (snap pendant l'animation).
  const imageEl = useMemo(() => (
    <Image
      source={require('@/assets/images/cartefinniveau.png')}
      style={styles.image}
      resizeMode="contain"
    />
  ), []);

  console.log('[LevelTransition] Render, visible:', visible);
  if (!visible) return null;

  return (
    <AnimatedRe.View
      style={[styles.container, animStyle]}
    >
      {imageEl}
    </AnimatedRe.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999, // Au-dessus de tout
    backgroundColor: 'rgba(0,0,0,0.9)', // Fond très sombre pour cacher le jeu
  },
  image: {
    width: width * 0.9,
    height: height * 0.7,
  },
});

export default LevelTransition;
