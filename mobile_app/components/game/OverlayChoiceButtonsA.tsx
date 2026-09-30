import React, { useEffect, useState, useRef, useId, useMemo, useCallback, createContext, useContext } from 'react';
import { traceGameRender } from '@/utils/logger';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Dimensions,
  Platform
} from 'react-native';
import AnimatedRe, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  withRepeat,
  cancelAnimation,
  runOnJS,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/Colors';

const { width, height } = Dimensions.get('window');
const isVerySmallScreen = width < 360 || height < 640;

// État partagé aux enfants des Animated.View via contexte : props.children
// doit garder une identité stable, sinon React Native recrée le nœud
// AnimatedProps à chaque render et appelle __restoreDefaultValues() → les
// vues animées reviennent une frame à leurs valeurs par défaut (clignotement).
type BtnChoice = 'avant' | 'après';
interface ChoiceButtonsCtxValue {
  pressedButton: BtnChoice | null;
  onPress: (choice: BtnChoice) => void;
}
const ChoiceButtonsCtx = createContext<ChoiceButtonsCtxValue | null>(null);

const ChoiceButtonInner: React.FC<{ choice: BtnChoice; glow: SharedValue<number> }> = ({ choice, glow }) => {
  const ctx = useContext(ChoiceButtonsCtx);
  const isLeft = choice === 'avant';
  const pressed = ctx?.pressedButton === choice;
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  return (
    <>
      <AnimatedRe.View
        style={[styles.tutorialGlow, glowStyle]}
      />
      <TouchableOpacity
        onPress={() => ctx?.onPress(choice)}
        activeOpacity={0.9}
        style={styles.button}
      >
        <LinearGradient
          colors={pressed
            ? ['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,0.7)']
            : ['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.5)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.buttonGradient}
        >
          {isLeft && (
            <Ionicons
              name="arrow-back"
              size={isVerySmallScreen ? 14 : 18}
              color={colors.white}
              style={styles.buttonIcon}
            />
          )}
          <Text style={styles.buttonText}>{isLeft ? 'AVANT' : 'APRÈS'}</Text>
          {!isLeft && (
            <Ionicons
              name="arrow-forward"
              size={isVerySmallScreen ? 14 : 18}
              color={colors.white}
              style={styles.buttonIcon}
            />
          )}
        </LinearGradient>
      </TouchableOpacity>
      <View style={styles.buttonShadow} />
    </>
  );
};

interface OverlayChoiceButtonsAProps {
  onChoice: (choice: 'avant' | 'après') => void;
  isLevelPaused: boolean;
  isWaitingForCountdown?: boolean;
  transitioning?: boolean;
  isTutorialActive?: boolean;
  tutorialStep?: number;
  debugEventId?: string;
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
  debugEventId,
}) => {
  const buttonsId = useId();
  const trace = (action: string, data: Record<string, unknown> = {}) => {
    traceGameRender(action, { buttonsId, eventId: debugEventId, ...data });
  };
  // États simples
  const [pressedButton, setPressedButton] = useState<'avant' | 'après' | null>(null);
  
  // Animations (Reanimated : un seul canal UI-thread — plus de restauration
  // de valeurs par défaut au milieu des animations, cause des clignotements)
  const fadeAnim = useSharedValue(0);
  const leftButtonScale = useSharedValue(1);
  const rightButtonScale = useSharedValue(1);
  const leftButtonRotate = useSharedValue(0);
  const rightButtonRotate = useSharedValue(0);
  const pulseAnim = useSharedValue(1);
  const leftGlowOpacity = useSharedValue(0);
  const rightGlowOpacity = useSharedValue(0);

  const containerStyle = useAnimatedStyle(() => ({ opacity: fadeAnim.value }));
  const leftButtonStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: leftButtonScale.value },
      { rotate: `${leftButtonRotate.value * 5}deg` },
      { scale: pulseAnim.value },
    ],
  }));
  const rightButtonStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: rightButtonScale.value },
      { rotate: `${rightButtonRotate.value * 5}deg` },
      { scale: pulseAnim.value },
    ],
  }));

  // Animation de fade-in dès le montage
  useEffect(() => {
    const startedAt = Date.now();
    trace('buttons.mount', { fadeDurationMs: 200 });
    fadeAnim.value = withTiming(1, { duration: 200 }, (finished) =>
      runOnJS(trace)('buttons.fade-end', { finished: finished === true, elapsedMs: Date.now() - startedAt }));

    // Animation de pulsation
    startPulseAnimation();

    return () => {
      trace('buttons.unmount');
      cancelAnimation(pulseAnim);
    };
  }, []);

  // Animation de pulsation
  const startPulseAnimation = () => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
  };

  // Animation de glow pour le tutoriel
  useEffect(() => {
    const glowLoop = () => withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );

    if (isTutorialActive && tutorialStep === 2) {
      leftGlowOpacity.value = 0;
      leftGlowOpacity.value = glowLoop();
      rightGlowOpacity.value = 0;
    } else if (isTutorialActive && tutorialStep === 3) {
      rightGlowOpacity.value = 0;
      rightGlowOpacity.value = glowLoop();
      leftGlowOpacity.value = 0;
    } else {
      leftGlowOpacity.value = 0;
      rightGlowOpacity.value = 0;
    }

    return () => {
      cancelAnimation(leftGlowOpacity);
      cancelAnimation(rightGlowOpacity);
    };
  }, [isTutorialActive, tutorialStep]);

  // Gérer le clic sur un bouton
  const handlePress = useCallback((choice: 'avant' | 'après') => {
    setPressedButton(choice);

    // Animation de pression : squash+rotate, puis fade-out du conteneur
    // et rebond du bouton.
    const scale = choice === 'avant' ? leftButtonScale : rightButtonScale;
    const rotate = choice === 'avant' ? leftButtonRotate : rightButtonRotate;
    scale.value = withSequence(
      withSpring(0.9, { damping: 8, stiffness: 150 }),
      withSpring(1, { damping: 10, stiffness: 120 })
    );
    rotate.value = withTiming(choice === 'avant' ? -1 : 1, { duration: 150 });
    fadeAnim.value = withDelay(150, withTiming(0, { duration: 150 }));

    // Appeler la fonction parent avec le choix
    onChoice(choice);
  }, [onChoice]);

  // Enfants figés des Animated.View : voir ChoiceButtonsCtx.
  const buttonsCtx = useMemo<ChoiceButtonsCtxValue>(
    () => ({ pressedButton, onPress: handlePress }),
    [pressedButton, handlePress],
  );
  const leftButtonEl = useMemo(() => (
    <AnimatedRe.View style={[styles.buttonWrapper, leftButtonStyle]}>
      <ChoiceButtonInner choice="avant" glow={leftGlowOpacity} />
    </AnimatedRe.View>
  ), [leftButtonStyle, leftGlowOpacity]);
  const rightButtonEl = useMemo(() => (
    <AnimatedRe.View style={[styles.buttonWrapper, rightButtonStyle]}>
      <ChoiceButtonInner choice="après" glow={rightGlowOpacity} />
    </AnimatedRe.View>
  ), [rightButtonStyle, rightGlowOpacity]);
  const containerChildren = useMemo(() => (
    <>
      {leftButtonEl}
      {rightButtonEl}
    </>
  ), [leftButtonEl, rightButtonEl]);

  return (
    <ChoiceButtonsCtx.Provider value={buttonsCtx}>
      <AnimatedRe.View
        style={[styles.container, containerStyle]}
        pointerEvents="auto"
      >
        {containerChildren}
      </AnimatedRe.View>
    </ChoiceButtonsCtx.Provider>
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