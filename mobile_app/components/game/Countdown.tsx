import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '@/constants/Colors';


interface CountdownProps {
  timeLeft: number;
  isActive?: boolean;
  isTutorial?: boolean;
}

const Countdown: React.FC<CountdownProps> = ({ timeLeft, isActive = true, isTutorial = false }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const tutorialPulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
      if (timeLeft <= 5) {
        // Animation de pulse pour les dernières 5 secondes
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [timeLeft, isActive]);

  // Animation de pulse continue pendant le tutoriel
  useEffect(() => {
    if (isTutorial) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(tutorialPulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(tutorialPulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      tutorialPulseAnim.setValue(1);
    }
  }, [isTutorial]);

  const getBackgroundColor = () => {
    if (isTutorial) return 'transparent'; // Pas de fond coloré pendant le tutoriel
    if (!isActive) return colors.lightText;
    if (timeLeft > 14) return colors.timerNormal;
    if (timeLeft > 7) return colors.warningYellow;
    return colors.incorrectRed;
  };

  const getTextColor = () => {
    if (isTutorial) return '#333333'; // Texte foncé pour le tutoriel
    return colors.white;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        isTutorial && styles.tutorialContainer,
        { 
          backgroundColor: getBackgroundColor(),
          transform: [{ scale: isTutorial ? tutorialPulseAnim : scaleAnim }]
        },
      ]}
    >
      <Text style={[styles.text, { color: getTextColor() }]}>{timeLeft}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
  },
  tutorialContainer: {
    // Style spécial pour le tutoriel - plus visible avec un cadre
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#FFD700', // Bordure dorée
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // Fond blanc semi-transparent
    elevation: 8,
    shadowColor: '#FFD700',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  text: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  }
});

export default Countdown;