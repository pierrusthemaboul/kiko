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
  // 1) États de base
  const [transitioning, setTransitioning] = useState(false);
  const [isWaitingForCountdown, setIsWaitingForCountdown] = useState(false);
  const [showButtons, setShowButtons] = useState(true);
  const [uniqueKey, setUniqueKey] = useState(`event-${Date.now()}`);

  // 2) Cartes actuelles
  const [currentTop, setCurrentTop] = useState(previousEvent);
  const [currentBottom, setCurrentBottom] = useState(newEvent);
  
  // 3) Animations
  const topCardTranslateY = useRef(new Animated.Value(0)).current;
  const bottomCardTranslateY = useRef(new Animated.Value(0)).current;
  const topCardScale = useRef(new Animated.Value(1)).current;

  // ─────────────────────────────────────────────────────────────────────
  // Effet pour suivre l'événement actuel
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!newEvent) return;
    
    // Si c'est un nouvel événement, lancer l'animation
    if (!currentBottom || newEvent.id !== currentBottom.id) {
      // Masquer les boutons pendant la transition
      setShowButtons(false);
      
      // Déclencher l'animation
      animateCards();
    }
  }, [newEvent?.id]);

  // ─────────────────────────────────────────────────────────────────────
  // Effet pour réafficher les boutons quand l'image est chargée
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isImageLoaded && !showDate && !isLevelPaused) {
      // Générer une nouvelle clé unique pour le remontage
      setUniqueKey(`buttons-${newEvent?.id || currentBottom?.id}-${Date.now()}`);
      
      // Afficher les boutons avec un léger délai
      const timer = setTimeout(() => {
        setShowButtons(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isImageLoaded, showDate, isLevelPaused, newEvent?.id, currentBottom?.id]);

  // ─────────────────────────────────────────────────────────────────────
  // Effet pour masquer les boutons quand on montre la date
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (showDate) {
      setShowButtons(false);
    }
  }, [showDate]);

  // ─────────────────────────────────────────────────────────────────────
  // Animation des cartes
  // ─────────────────────────────────────────────────────────────────────
  const animateCards = () => {
    setTransitioning(true);
    
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
      // Swap cards
      setCurrentTop(currentBottom);
      setCurrentBottom(newEvent);

      // Reset animation values
      topCardTranslateY.setValue(0);
      bottomCardTranslateY.setValue(0);
      topCardScale.setValue(1);

      // End transition
      setTransitioning(false);
    });
  };

  // ─────────────────────────────────────────────────────────────────────
  // Gestionnaire de choix utilisateur
  // ─────────────────────────────────────────────────────────────────────
  const handleChoice = (choice: string) => {
    // Masquer les boutons dès le clic
    setShowButtons(false);
    setIsWaitingForCountdown(true);
    
    // Propager le choix au parent
    onChoice(choice);
  };

  // ─────────────────────────────────────────────────────────────────────
  // Rendu
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
            {showButtons && !showDate && isImageLoaded && !isLevelPaused && (
              <OverlayChoiceButtonsA
                key={uniqueKey}
                onChoice={handleChoice}
                isLevelPaused={false}
                isWaitingForCountdown={false}
                transitioning={false}
              />
            )}
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