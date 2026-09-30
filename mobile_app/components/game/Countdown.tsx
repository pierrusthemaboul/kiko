import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AnimatedRe, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
} from 'react-native-reanimated';
import { colors } from '@/constants/Colors';
import { traceGameRender } from '@/utils/logger';


interface CountdownProps {
  timeLeft: number;
  isActive?: boolean;
  isTutorial?: boolean;
}

const Countdown: React.FC<CountdownProps> = ({ timeLeft, isActive = true, isTutorial = false }) => {
  const scaleAnim = useSharedValue(1);
  const tutorialPulseAnim = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isTutorial ? tutorialPulseAnim.value : scaleAnim.value }],
  }));

  useEffect(() => {
    if (isActive && timeLeft <= 5) {
      traceGameRender('countdown.pulse', { timeLeft });
      // Animation de pulse pour les dernières 5 secondes
      scaleAnim.value = withSequence(
        withTiming(1.2, { duration: 200 }),
        withTiming(1, { duration: 200 })
      );
    }
  }, [timeLeft, isActive]);

  // Animation de pulse continue pendant le tutoriel
  useEffect(() => {
    if (isTutorial) {
      tutorialPulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1
      );
    } else {
      tutorialPulseAnim.value = 1;
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
    <AnimatedRe.View
      style={[
        styles.container,
        isTutorial && styles.tutorialContainer,
        {
          backgroundColor: getBackgroundColor(),
        },
        pulseStyle,
      ]}
    >
      <Text style={[styles.text, { color: getTextColor() }]}>{timeLeft}</Text>
    </AnimatedRe.View>
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
    // Style spécial pour le tutoriel - plus visible
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // Fond blanc semi-transparent
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
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