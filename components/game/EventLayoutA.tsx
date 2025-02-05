/************************************************************************************
 * EventLayoutA.tsx
 *
 * Gère l'affichage superposé de deux cartes (previousEvent, newEvent) et anime
 * la transition lorsque "newEvent" change.
 ************************************************************************************/

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import AnimatedEventCardA from './AnimatedEventCardA';
import OverlayChoiceButtonsA from './OverlayChoiceButtonsA';

const { height } = Dimensions.get('window');
const ANIMATION_DURATION = 800;

interface EventLayoutAProps {
  previousEvent: any;
  newEvent: any;
  onImageLoad: () => void;
  onChoice: (choice: string) => void;
  showDate?: boolean;
  isCorrect?: boolean;
  isImageLoaded: boolean;
  streak: number;
  level: number;
  isLevelPaused: boolean;
}

const EventLayoutA: React.FC<EventLayoutAProps> = ({
  previousEvent,
  newEvent,
  onImageLoad,
  onChoice,
  showDate = false,
  isCorrect,
  isImageLoaded,
  streak,
  level,
  isLevelPaused,
}) => {
  // 1) États locaux
  const [transitioning, setTransitioning] = useState(false);
  const [hasNewEventArrived, setHasNewEventArrived] = useState(false);
  const [isWaitingForCountdown, setIsWaitingForCountdown] = useState(false);

  // 2) Cartes actuelles
  const [currentTop, setCurrentTop] = useState(previousEvent);
  const [currentBottom, setCurrentBottom] = useState(newEvent);

  // 3) Animations
  const topCardTranslateY = useRef(new Animated.Value(0)).current;
  const bottomCardTranslateY = useRef(new Animated.Value(0)).current;
  const topCardScale = useRef(new Animated.Value(1)).current;

  // ─────────────────────────────────────────────────────────────────────
  // 4) Sur changement de newEvent => lancer l'animation
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!newEvent) {
      return;
    }

    if (!currentBottom || newEvent.id !== currentBottom.id) {
      setHasNewEventArrived(true);
      animateCards();
    }
  }, [newEvent]);

  // ─────────────────────────────────────────────────────────────────────
  // 5) Fonction d'animation des cartes (si un nouvel event est arrivé)
  // ─────────────────────────────────────────────────────────────────────
  const animateCards = () => {
    if (!transitioning) {
      setTransitioning(true);
    }

    const moveDistance = -(height * 0.42);

    Animated.parallel([
      Animated.timing(topCardTranslateY, {
        toValue: moveDistance,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(topCardScale, {
        toValue: 0.95,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(bottomCardTranslateY, {
        toValue: moveDistance,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // On swap : la carte du haut devient la carte du bas, etc.
      setCurrentTop(currentBottom);
      setCurrentBottom(newEvent);

      // Reset des valeurs
      topCardTranslateY.setValue(0);
      bottomCardTranslateY.setValue(0);
      topCardScale.setValue(1);

      // Fin de transition
      setTransitioning(false);
      setHasNewEventArrived(false);
    });
  };

  // ─────────────────────────────────────────────────────────────────────
  // 6) handleChoice => clic sur "avant" / "après"
  // ─────────────────────────────────────────────────────────────────────
  const handleChoice = (choice: string) => {
    // On force transitioning = true
    setTransitioning(true);
    setHasNewEventArrived(false);

    onChoice(choice);

    // Après 600ms, si hasNewEventArrived est resté false => aucun newEvent
    setTimeout(() => {
      if (!hasNewEventArrived) {
        setTransitioning(false);
      }
    }, 600);
  };

  // ─────────────────────────────────────────────────────────────────────
  // 7) Rendu
  // ─────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Carte du haut */}
      <Animated.View
        style={[
          styles.cardContainer,
          styles.topCard,
          {
            transform: [
              { translateY: topCardTranslateY },
              { scale: topCardScale },
            ],
          },
        ]}
      >
        <AnimatedEventCardA
          event={currentTop}
          position="top"
          showDate={true}
          streak={streak}
          level={level}
        />
      </Animated.View>

      {/* Carte du bas */}
      <Animated.View
        style={[
          styles.cardContainer,
          styles.bottomCard,
          { transform: [{ translateY: bottomCardTranslateY }] },
        ]}
      >
        <View style={styles.bottomCardContent}>
          <AnimatedEventCardA
            event={currentBottom}
            position="bottom"
            onImageLoad={onImageLoad}
            showDate={showDate}
            isCorrect={isCorrect}
            streak={streak}
            level={level}
          />

          <View style={styles.buttonsContainer}>
            <OverlayChoiceButtonsA
              onChoice={handleChoice}
              isLevelPaused={isLevelPaused}
              isWaitingForCountdown={isWaitingForCountdown}
              transitioning={transitioning}
            />
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cardContainer: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: height * 0.42,
    backgroundColor: 'transparent',
  },
  topCard: {
    top: 10,
    zIndex: 1,
  },
  bottomCard: {
    top: height * 0.45,
    zIndex: 2,
  },
  bottomCardContent: {
    flex: 1,
    position: 'relative',
  },
  buttonsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 40,
    paddingHorizontal: 20,
    zIndex: 3,
  },
});

export default EventLayoutA;