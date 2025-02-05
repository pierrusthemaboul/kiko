import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '@/constants/colors';

interface CountdownProps {
  timeLeft: number;
  isActive?: boolean;
}

const Countdown: React.FC<CountdownProps> = ({ timeLeft, isActive = true }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

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

  const getBackgroundColor = () => {
    if (!isActive) return colors.lightText;
    if (timeLeft > 14) return colors.timerNormal;
    if (timeLeft > 7) return colors.warningYellow;
    return colors.incorrectRed;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { 
          backgroundColor: getBackgroundColor(),
          transform: [{ scale: scaleAnim }]
        },
      ]}
    >
      <Text style={styles.text}>{timeLeft}</Text>
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
  text: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  }
});

export default Countdown;