import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import AnimatedEventCardA from './AnimatedEventCardA';
import OverlayChoiceButtonsA from './OverlayChoiceButtonsA';
// Supposons que vous importiez analytics si vous en aviez besoin pour les logs
// import analytics from '@react-native-firebase/analytics';

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
  const [isWaitingForCountdown, setIsWaitingForCountdown] = useState(false); // Note: Cet état local ne semble pas utilisé pour contrôler les boutons directement.
  const [showButtons, setShowButtons] = useState(true); // Géré par les effets
  const [uniqueKey, setUniqueKey] = useState(`event-${Date.now()}`);

  // 2) Cartes actuelles
  const [currentTop, setCurrentTop] = useState(previousEvent);
  const [currentBottom, setCurrentBottom] = useState(newEvent);

  // 3) Animations
  const topCardTranslateY = useRef(new Animated.Value(0)).current;
  const bottomCardTranslateY = useRef(new Animated.Value(0)).current;
  const topCardScale = useRef(new Animated.Value(1)).current;

  // ─────────────────────────────────────────────────────────────────────
  // Effet pour suivre le changement d'événement actuel (newEvent prop)
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!newEvent) {
      return;
    }

    // Si c'est un nouvel événement (différent de celui affiché en bas), lancer l'animation
    if (!currentBottom || newEvent.id !== currentBottom.id) {
      // Masquer les boutons pendant la transition
      setShowButtons(false);
      // Déclencher l'animation
      animateCards();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newEvent?.id]); // Dépend uniquement de l'ID pour détecter le changement

  // ─────────────────────────────────────────────────────────────────────
  // Effet pour réafficher les boutons quand les conditions sont remplies
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isImageLoaded && !showDate && !isLevelPaused) {
      // Générer une nouvelle clé unique pour le remontage potentiel des boutons
      setUniqueKey(`buttons-${newEvent?.id || currentBottom?.id}-${Date.now()}`);

      // Afficher les boutons avec un léger délai pour éviter le flash pendant l'animation/chargement
      const timer = setTimeout(() => {
        setShowButtons(true);
      }, 100); // Garder un petit délai

      return () => {
        clearTimeout(timer);
      };
    }
    // Si les conditions ne sont pas remplies, ne rien faire explicitement ici pour cacher les boutons,
    // car d'autres effets (comme showDate) ou actions (comme handleChoice) s'en chargent.
  }, [isImageLoaded, showDate, isLevelPaused, newEvent?.id, currentBottom?.id]);

  // ─────────────────────────────────────────────────────────────────────
  // Effet pour masquer les boutons quand on montre la date (après réponse/timeout)
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
      // Swap cards: Le 'newEvent' devient le 'currentBottom' qui devient le 'currentTop'
      setCurrentTop(currentBottom); // L'ancien bas monte
      setCurrentBottom(newEvent);    // Le nouveau prop devient le bas

      // Reset animation values pour le prochain cycle
      topCardTranslateY.setValue(0);
      bottomCardTranslateY.setValue(0);
      topCardScale.setValue(1);

      // End transition state
      setTransitioning(false);
    });
  };

  // ─────────────────────────────────────────────────────────────────────
  // Gestionnaire de choix utilisateur
  // ─────────────────────────────────────────────────────────────────────
  const handleChoice = (choice: string) => {
    // Masquer les boutons dès le clic
    setShowButtons(false);
    //setIsWaitingForCountdown(true); // Si cet état devient utile, le décommenter

    // Exemple: Log Firebase Analytics pour le choix
    // analytics().logEvent('game_choice', {
    //   level: level,
    //   streak: streak,
    //   choice: choice,
    //   top_event_id: currentTop?.id,
    //   bottom_event_id: currentBottom?.id,
    // });

    // Propager le choix au parent
    onChoice(choice);
  };

  // ─────────────────────────────────────────────────────────────────────
  // Rendu
  // ─────────────────────────────────────────────────────────────────────
  // Calcul de la visibilité des boutons pour la condition de rendu
  const shouldRenderButtons = showButtons && !showDate && isImageLoaded && !isLevelPaused;

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
            {shouldRenderButtons && (
              <OverlayChoiceButtonsA
                key={uniqueKey}
                onChoice={handleChoice}
                isLevelPaused={isLevelPaused}
                isWaitingForCountdown={isWaitingForCountdown} // Peut-être inutile ici
                transitioning={transitioning} // Peut-être utile pour désactiver pendant l'anim des cartes
              />
            )}
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

// Styles (inchangés)
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
    zIndex: 3, // Assurer que les boutons sont au-dessus de la carte
  },
});

export default EventLayoutA;