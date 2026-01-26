import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Image } from 'react-native';

const { width, height } = Dimensions.get('window');

interface LevelTransitionProps {
  visible: boolean;
  onComplete: () => void;
}

const LevelTransition: React.FC<LevelTransitionProps> = ({ visible, onComplete }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    console.log('[LevelTransition] useEffect, visible:', visible);
    if (visible) {
      console.log('[LevelTransition] Démarrage animation d\'entrée');
      // Animation d'entrée
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start(() => {
        console.log('[LevelTransition] Animation d\'entrée terminée');
      });

      // Animation de sortie après 2 secondes (affichage plus long)
      setTimeout(() => {
        console.log('[LevelTransition] Démarrage animation de sortie');
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start(() => {
          console.log('[LevelTransition] Animation de sortie terminée');
          onComplete();
        });
      }, 2000);
    }
  }, [visible]);

  console.log('[LevelTransition] Render, visible:', visible);
  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      <Image
        source={require('@/assets/images/cartefinniveau.png')}
        style={styles.image}
        resizeMode="contain"
      />
    </Animated.View>
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
