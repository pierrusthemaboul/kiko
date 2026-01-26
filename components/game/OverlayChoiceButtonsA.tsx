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

const { width } = Dimensions.get('window');

interface OverlayChoiceButtonsAProps {
  onChoice: (choice: 'avant' | 'après') => void;
  isLevelPaused: boolean;
  isWaitingForCountdown?: boolean;
  transitioning?: boolean;
}

/**
 * Composant de boutons de choix simplifié - élimine les états complexes
 * pour se concentrer sur la simplicité et répondre au problème d'affichage.
 */
const OverlayChoiceButtonsA: React.FC<OverlayChoiceButtonsAProps> = ({
  onChoice,
  isLevelPaused,
  isWaitingForCountdown = false,
  transitioning = false
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
              { scale: pulseAnim }
            ]
          }
        ]}
      >
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
              size={18} 
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
              { scale: pulseAnim }
            ]
          }
        ]}
      >
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
              size={18} 
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
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  buttonIcon: {
    marginHorizontal: 6,
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
});

export default OverlayChoiceButtonsA;