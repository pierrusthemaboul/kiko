import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import AnimatedEventCardA from './AnimatedEventCardA'; // Assure-toi que le chemin est correct
import OverlayChoiceButtonsA from './OverlayChoiceButtonsA'; // Assure-toi que le chemin est correct
import { Event } from '@/hooks/types'; // Assure-toi que le chemin et le type Event sont corrects

const { height } = Dimensions.get('window');
const ANIMATION_DURATION = 600;
const CARD_HEIGHT_PERCENT = 0.42;
const TOP_CARD_INITIAL_Y = 10;
const BOTTOM_CARD_INITIAL_Y = height * 0.45;
const MOVE_DISTANCE = -(height * CARD_HEIGHT_PERCENT);

interface EventLayoutAProps {
  previousEvent: Event | null;
  newEvent: Event | null;
  onImageLoad: () => void;
  onChoice: (choice: 'avant' | 'après') => void;
  showDate?: boolean;
  isCorrect?: boolean;
  isImageLoaded: boolean;
  streak: number;
  level: number;
  isLevelPaused: boolean;
  isInitialRender: boolean;
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
  isInitialRender,
}) => {
  const [transitioning, setTransitioning] = useState(false);
  const [currentTop, setCurrentTop] = useState(previousEvent);
  const [currentBottom, setCurrentBottom] = useState(newEvent);
  const topCardTranslateY = useRef(new Animated.Value(0)).current;
  const bottomCardTranslateY = useRef(new Animated.Value(0)).current;
  const topCardScale = useRef(new Animated.Value(1)).current;
  const prevNewEventIdRef = useRef<string | null>(newEvent?.id ?? null);

  useEffect(() => {
    if (!newEvent || isInitialRender) {
      if (isInitialRender) {
          topCardTranslateY.setValue(0);
          bottomCardTranslateY.setValue(0);
          topCardScale.setValue(1);
          setCurrentTop(previousEvent);
          setCurrentBottom(newEvent);
          prevNewEventIdRef.current = newEvent?.id ?? null;
      }
      return;
    }
    if (newEvent.id !== prevNewEventIdRef.current) {
      prevNewEventIdRef.current = newEvent.id;
      animateCards();
    }
  }, [newEvent, isInitialRender, previousEvent]); // Garder les dépendances

  const animateCards = () => {
    setTransitioning(true);
    topCardTranslateY.setValue(0);
    bottomCardTranslateY.setValue(0);
    topCardScale.setValue(1);

    Animated.parallel([
      Animated.timing(topCardTranslateY, {
        toValue: MOVE_DISTANCE,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(topCardScale, {
        toValue: 0.95,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(bottomCardTranslateY, {
        toValue: MOVE_DISTANCE,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setCurrentTop(currentBottom);
        setCurrentBottom(newEvent);
        topCardTranslateY.setValue(0);
        topCardScale.setValue(1);
        bottomCardTranslateY.setValue(0);
        setTransitioning(false);
      } else {
         setCurrentTop(currentBottom);
         setCurrentBottom(newEvent);
         topCardTranslateY.setValue(0);
         topCardScale.setValue(1);
         bottomCardTranslateY.setValue(0);
         setTransitioning(false);
      }
    });
  };

  const handleChoice = (choice: 'avant' | 'après') => {
    onChoice(choice);
  };

  const shouldRenderButtons = isImageLoaded && !showDate && !isLevelPaused && !transitioning;

  // --- GÉNÉRER LES CLÉS UNIQUES ---
  // Utilise l'ID de l'événement si disponible, sinon une chaîne statique mais différente
  const topCardKey = `event-card-top-${currentTop?.id ?? 'null'}`;
  const bottomCardKey = `event-card-bottom-${currentBottom?.id ?? 'null'}`;
  // --------------------------------

  return (
    <View style={styles.container}>
      {/* Carte du Haut */}
      <Animated.View
        // --- AJOUT DE LA CLÉ ICI ---
        key={topCardKey}
        // -------------------------
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

      {/* Carte du Bas */}
      <Animated.View
        // --- AJOUT DE LA CLÉ ICI ---
        key={bottomCardKey}
        // -------------------------
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
            isImageLoaded={isImageLoaded}
            streak={streak}
            level={level}
          />
          <View style={styles.buttonsContainer}>
            {shouldRenderButtons && (
              <OverlayChoiceButtonsA
                // La clé ici était probablement OK, mais on s'assure qu'elle est unique
                key={`buttons-${currentBottom?.id ?? 'no-event'}`}
                onChoice={handleChoice}
                isLevelPaused={isLevelPaused}
                isWaitingForCountdown={false}
                transitioning={transitioning}
              />
            )}
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

// --- Styles (INCHANGÉS) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cardContainer: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: height * CARD_HEIGHT_PERCENT,
  },
  topCard: {
    top: TOP_CARD_INITIAL_Y,
    zIndex: 1,
  },
  bottomCard: {
    top: BOTTOM_CARD_INITIAL_Y,
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
    bottom: 50 ,
    paddingHorizontal: 20,
    zIndex: 3,
    alignItems: 'center',
  },
});

export default EventLayoutA;