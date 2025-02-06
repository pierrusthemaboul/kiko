import React, { useEffect, useState, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../constants/Colors';


const { width } = Dimensions.get('window');

interface OverlayChoiceButtonsAProps {
  onChoice: (choice: 'avant' | 'après') => void;
  isLevelPaused: boolean;
  isWaitingForCountdown?: boolean;
  transitioning?: boolean;
}

const OverlayChoiceButtonsA: React.FC<OverlayChoiceButtonsAProps> = ({
  onChoice,
  isLevelPaused,
  isWaitingForCountdown = false,
  transitioning = false
}) => {
  const [buttonClicked, setButtonClicked] = useState(false);
  const [justAnswered, setJustAnswered] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handlePress = (choice: 'avant' | 'après') => {
    if (!isLevelPaused && !transitioning && !isWaitingForCountdown && !buttonClicked && !justAnswered) {
      setButtonClicked(true);
      setJustAnswered(true);
      onChoice(choice);

      // Prolonger le verrou justAnswered
      setTimeout(() => {
        setJustAnswered(false);
      }, 750);
    }
  };

  // Reset buttonClicked après 500ms
  useEffect(() => {
    if (buttonClicked) {
      const timer = setTimeout(() => {
        setButtonClicked(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [buttonClicked]);

  // Fade OUT si l'une des conditions est vraie
  useEffect(() => {
    const shouldFadeOut = isLevelPaused || isWaitingForCountdown || transitioning || buttonClicked || justAnswered;

    Animated.timing(fadeAnim, {
      toValue: shouldFadeOut ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isLevelPaused, isWaitingForCountdown, transitioning, buttonClicked, justAnswered]);

  const pointerEvents =
    !isLevelPaused && !isWaitingForCountdown && !transitioning && !buttonClicked && !justAnswered
      ? 'auto'
      : 'none';

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]} pointerEvents={pointerEvents}>
      <TouchableOpacity
        onPress={() => handlePress('avant')}
        activeOpacity={0.8}
        style={styles.button}
      >
        <LinearGradient
          colors={['#6e6e6e', '#5a5a5a', '#4a4a4a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.buttonGradient}
        >
          <Text style={styles.buttonText}>AVANT</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => handlePress('après')}
        activeOpacity={0.8}
        style={styles.button}
      >
        <LinearGradient
          colors={['#6e6e6e', '#5a5a5a', '#4a4a4a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.buttonGradient}
        >
          <Text style={styles.buttonText}>APRÈS</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: 10,
    width: '100%',
  },
  button: {
    borderRadius: 25,
    overflow: 'hidden',
    width: '40%',
  },
  buttonGradient: {
    padding: 12,
    alignItems: 'center',
    borderRadius: 25,
  },
  buttonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

export default OverlayChoiceButtonsA;