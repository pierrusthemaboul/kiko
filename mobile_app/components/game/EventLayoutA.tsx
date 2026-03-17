import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import AnimatedEventCardA from './AnimatedEventCardA'; // Assure-toi que le chemin est correct
import OverlayChoiceButtonsA from './OverlayChoiceButtonsA'; // Assure-toi que le chemin est correct
import { Event } from '@/hooks/types'; // Assure-toi que le chemin et le type Event sont corrects

const { height } = Dimensions.get('window');
const ANIMATION_DURATION = 600; // Durée normale
const ANIMATION_DURATION_LEVEL_END = 600; // Durée spéciale pour la fin de niveau (ajusté à 600ms)
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
  isLastEventOfLevel?: boolean; // Nouvelle prop pour identifier le dernier événement
  triggerLevelEndAnim?: boolean; // Nouvelle prop pour déclencher l'animation de fin
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
  isLastEventOfLevel = false,
  triggerLevelEndAnim = false,
}) => {
  const [transitioning, setTransitioning] = useState(false);
  const [currentTop, setCurrentTop] = useState(previousEvent);
  const [currentBottom, setCurrentBottom] = useState(newEvent);
  const topCardTranslateY = useRef(new Animated.Value(0)).current;
  const bottomCardTranslateY = useRef(new Animated.Value(0)).current;
  const bottomCardScale = useRef(new Animated.Value(1)).current;
  const topCardScale = useRef(new Animated.Value(1)).current;
  const topCardOpacity = useRef(new Animated.Value(1)).current;
  const bottomCardOpacity = useRef(new Animated.Value(1)).current;
  const prevNewEventIdRef = useRef<string | null>(newEvent?.id ?? null);
  const wasLevelPausedRef = useRef<boolean>(isLevelPaused);

  useEffect(() => {


    if (!newEvent || isInitialRender) {
      if (isInitialRender) {
        topCardTranslateY.setValue(0);
        bottomCardTranslateY.setValue(0);
        topCardScale.setValue(1);
        topCardOpacity.setValue(1);
        bottomCardOpacity.setValue(1);
        setCurrentTop(previousEvent);
        setCurrentBottom(newEvent);
        prevNewEventIdRef.current = newEvent?.id ?? null;
        wasLevelPausedRef.current = isLevelPaused;
      }
      return;
    }

    // Détecter un VRAI changement de niveau:
    // Le niveau était en pause (modal de niveau affiché) et vient d'être dépausé (GO pressé)
    if (wasLevelPausedRef.current && !isLevelPaused) {

      wasLevelPausedRef.current = isLevelPaused;

      // Mettre à jour les événements
      setCurrentTop(previousEvent);
      setCurrentBottom(newEvent);
      prevNewEventIdRef.current = newEvent?.id ?? null;

      // Réinitialiser les positions et commencer invisible
      topCardTranslateY.setValue(0);
      bottomCardTranslateY.setValue(0);
      topCardScale.setValue(1);
      topCardOpacity.setValue(0);
      bottomCardOpacity.setValue(0);

      // Animation d'apparition progressive (fade in)
      // On force d'abord à 0 pour être sûr, puis on anime vers 1
      topCardOpacity.setValue(1);
      bottomCardOpacity.setValue(1);



      return;
    }

    // Mettre à jour la ref pour le prochain useEffect
    wasLevelPausedRef.current = isLevelPaused;

    // Animation normale lors de la progression dans le même niveau
    // NE PAS déclencher si le niveau est en pause
    if (newEvent.id !== prevNewEventIdRef.current && !isLevelPaused) {
      prevNewEventIdRef.current = newEvent.id;
      animateCards();
    } else if (isLevelPaused && newEvent.id !== prevNewEventIdRef.current) {
      prevNewEventIdRef.current = newEvent.id;
    } else if (triggerLevelEndAnim && !transitioning) {
      // Animation de validation pour la fin de niveau

      Animated.sequence([
        Animated.timing(bottomCardScale, {
          toValue: 1.1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(bottomCardScale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [newEvent, isInitialRender, previousEvent, isLevelPaused, triggerLevelEndAnim]); // Utiliser isLevelPaused au lieu de level

  const animateCards = () => {
    setTransitioning(true);
    topCardTranslateY.setValue(0);
    bottomCardTranslateY.setValue(0);
    topCardScale.setValue(1);
    topCardOpacity.setValue(1);
    bottomCardOpacity.setValue(1);

    // Utiliser la durée longue si c'est l'animation de fin de niveau
    const duration = triggerLevelEndAnim ? ANIMATION_DURATION_LEVEL_END : ANIMATION_DURATION;

    Animated.parallel([
      Animated.timing(topCardTranslateY, {
        toValue: MOVE_DISTANCE,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(topCardScale, {
        toValue: 0.95,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(bottomCardTranslateY, {
        toValue: MOVE_DISTANCE,
        duration,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      // NE PAS mettre à jour les cartes si c'est l'animation de fin de niveau
      // Cela évite que les deux cartes deviennent similaires pendant la transition
      if (!triggerLevelEndAnim) {
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
      } else {
        // Fin de niveau - juste réinitialiser l'état de transition

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
            opacity: topCardOpacity,
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
          {
            transform: [
              { translateY: bottomCardTranslateY },
              { scale: bottomCardScale }
            ],
            opacity: bottomCardOpacity,
          },
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
    bottom: 50,
    paddingHorizontal: 20,
    zIndex: 3,
    alignItems: 'center',
  },
});

export default EventLayoutA;