import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  Animated, 
  Dimensions, 
  Easing,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/Colors';

const { width, height } = Dimensions.get('window');
const isVerySmallScreen = width < 360 || height < 640;

interface OverlayChoiceButtonsAProps {
  onChoice: (choice: 'avant' | 'après') => void;
  isLevelPaused: boolean;
  isWaitingForCountdown?: boolean;
  transitioning?: boolean;
  isTutorialActive?: boolean;
  tutorialStep?: number;
}

/**
 * Composant de boutons de choix simplifié - élimine les états complexes
 * pour se concentrer sur la simplicité et répondre au problème d'affichage.
 */
const OverlayChoiceButtonsA: React.FC<OverlayChoiceButtonsAProps> = ({
  onChoice,
  isLevelPaused,
  isWaitingForCountdown = false,
  transitioning = false,
  isTutorialActive = false,
  tutorialStep = 0,
}) => {
  // États simples
  const [pressedButton, setPressedButton] = useState<'avant' | 'après' | null>(null);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const leftButtonScale = useRef(new Animated.Value(1)).current;
  const rightButtonScale = useRef(new Animated.Value(1)).current;
  const leftButtonRotate = useRef(new Animated.Value(0)).current;
  const rightButtonRotate = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const leftGlowOpacity = useRef(new Animated.Value(0)).current;
  const rightGlowOpacity = useRef(new Animated.Value(0)).current;

  // Animation de fade-in dès le montage
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Animation de pulsation
    startPulseAnimation();

    return () => {
      pulseAnim.stopAnimation();
    };
  }, []);

  // Animation de pulsation
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Animation de glow pour le tutoriel
  useEffect(() => {
    if (isTutorialActive) {
      // Step 2: highlight left button (AVANT)
      if (tutorialStep === 2) {
        leftGlowOpacity.setValue(0);
        Animated.loop(
          Animated.sequence([
            Animated.timing(leftGlowOpacity, {
              toValue: 1,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(leftGlowOpacity, {
              toValue: 0.3,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ).start();
        rightGlowOpacity.setValue(0);
      }
      // Step 3: highlight right button (APRÈS)
      else if (tutorialStep === 3) {
        rightGlowOpacity.setValue(0);
        Animated.loop(
          Animated.sequence([
            Animated.timing(rightGlowOpacity, {
              toValue: 1,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(rightGlowOpacity, {
              toValue: 0.3,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ).start();
        leftGlowOpacity.setValue(0);
      }
      // Reset glows for other steps
      else {
        leftGlowOpacity.setValue(0);
        rightGlowOpacity.setValue(0);
      }
    } else {
      // Reset when tutorial is not active
      leftGlowOpacity.setValue(0);
      rightGlowOpacity.setValue(0);
    }

    return () => {
      leftGlowOpacity.stopAnimation();
      rightGlowOpacity.stopAnimation();
    };
  }, [isTutorialActive, tutorialStep]);

  // Gérer le clic sur un bouton
  const handlePress = (choice: 'avant' | 'après') => {
    setPressedButton(choice);
    
    // Animation de pression
    Animated.sequence([
      Animated.parallel([
        Animated.spring(choice === 'avant' ? leftButtonScale : rightButtonScale, {
          toValue: 0.9,
          useNativeDriver: true,
          friction: 3,
        }),
        Animated.timing(choice === 'avant' ? leftButtonRotate : rightButtonRotate, {
          toValue: choice === 'avant' ? -1 : 1,
          duration: 150,
          useNativeDriver: true,
        })
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(choice === 'avant' ? leftButtonScale : rightButtonScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 5,
        }),
      ])
    ]).start();

    // Appeler la fonction parent avec le choix
    onChoice(choice);
  };

  // Transformations pour la rotation des boutons
  const leftRotate = leftButtonRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-5deg', '0deg', '5deg']
  });

  const rightRotate = rightButtonRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-5deg', '0deg', '5deg']
  });

  return (
    <Animated.View 
      style={[styles.container, { opacity: fadeAnim }]} 
      pointerEvents="auto"
    >
      <Animated.View 
        style={[
          styles.buttonWrapper,
          { 
            transform: [
              { scale: leftButtonScale },
              { rotate: leftRotate },
              { scale: pulseAnim },
            ]
          },
        ]}
      >
        <Animated.View 
          style={[
            styles.tutorialGlow,
            { opacity: leftGlowOpacity }
          ]}
        />
        <TouchableOpacity
          onPress={() => handlePress('avant')}
          activeOpacity={0.9}
          style={styles.button}
        >
          <LinearGradient
            colors={pressedButton === 'avant' 
              ? ['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.7)'] 
              : ['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.5)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            <Ionicons
              name="arrow-back"
              size={isVerySmallScreen ? 14 : 18}
              color={colors.white}
              style={styles.buttonIcon}
            />
            <Text style={styles.buttonText}>AVANT</Text>
          </LinearGradient>
        </TouchableOpacity>
        <View style={styles.buttonShadow} />
      </Animated.View>

      <Animated.View 
        style={[
          styles.buttonWrapper,
          { 
            transform: [
              { scale: rightButtonScale },
              { rotate: rightRotate },
              { scale: pulseAnim },
            ]
          },
        ]}
      >
        <Animated.View 
          style={[
            styles.tutorialGlow,
            { opacity: rightGlowOpacity }
          ]}
        />
        <TouchableOpacity
          onPress={() => handlePress('après')}
          activeOpacity={0.9}
          style={styles.button}
        >
          <LinearGradient
            colors={pressedButton === 'après' 
              ? ['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.7)'] 
              : ['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.5)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>APRÈS</Text>
            <Ionicons
              name="arrow-forward"
              size={isVerySmallScreen ? 14 : 18}
              color={colors.white}
              style={styles.buttonIcon}
            />
          </LinearGradient>
        </TouchableOpacity>
        <View style={styles.buttonShadow} />
      </Animated.View>
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
    paddingHorizontal: 10,
  },
  buttonWrapper: {
    width: '42%',
    position: 'relative',
    marginHorizontal: 8,
  },
  button: {
    borderRadius: 25,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  buttonGradient: {
    padding: isVerySmallScreen ? 10 : 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
  },
  buttonText: {
    color: colors.white,
    fontSize: isVerySmallScreen ? 12 : 16,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: isVerySmallScreen ? 0.5 : 1,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  buttonIcon: {
    marginHorizontal: isVerySmallScreen ? 4 : 6,
  },
  buttonShadow: {
    position: 'absolute',
    top: 4,
    left: 0,
    right: 0,
    bottom: -4,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    zIndex: -1,
  },
  tutorialGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 33,
    borderWidth: 3,
    borderColor: '#F4D068',
    backgroundColor: 'rgba(244, 208, 104, 0.2)',
    shadowColor: '#F4D068',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 10,
    zIndex: -1,
  },
});

export default OverlayChoiceButtonsA;