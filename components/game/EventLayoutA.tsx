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
  const [isWaitingForCountdown, setIsWaitingForCountdown] = useState(false); // Note: Cet état local ne semble pas utilisé pour contrôler les boutons directement.
  const [showButtons, setShowButtons] = useState(true); // Devrait être false initialement après un changement d'event? Ou true? À vérifier.
  const [uniqueKey, setUniqueKey] = useState(`event-${Date.now()}`);

  // 2) Cartes actuelles
  const [currentTop, setCurrentTop] = useState(previousEvent);
  const [currentBottom, setCurrentBottom] = useState(newEvent);

  // 3) Animations
  const topCardTranslateY = useRef(new Animated.Value(0)).current;
  const bottomCardTranslateY = useRef(new Animated.Value(0)).current;
  const topCardScale = useRef(new Animated.Value(1)).current;

  // Log pour voir les props reçues à chaque rendu (peut être verbeux)
  console.log(`[EventLayoutA] Render - Props Check: isImageLoaded=${isImageLoaded}, showDate=${showDate}, isLevelPaused=${isLevelPaused}, newEventId=${newEvent?.id}, currentBottomId=${currentBottom?.id}`);

  // ─────────────────────────────────────────────────────────────────────
  // Effet pour suivre le changement d'événement actuel (newEvent prop)
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!newEvent) {
      console.log('[EventLayoutA] Effect [newEvent.id]: newEvent is null, returning.');
      return;
    }

    // Si c'est un nouvel événement (différent de celui affiché en bas), lancer l'animation
    if (!currentBottom || newEvent.id !== currentBottom.id) {
      console.log(`[EventLayoutA] Effect [newEvent.id]: New event detected (ID: ${newEvent.id}). Previous bottom was (ID: ${currentBottom?.id}). Starting transition.`);
      // Masquer les boutons pendant la transition
      console.log('[EventLayoutA] Effect [newEvent.id]: Setting showButtons = false (start animation)');
      setShowButtons(false);

      // Déclencher l'animation
      animateCards();
    } else {
       console.log(`[EventLayoutA] Effect [newEvent.id]: newEvent.id (${newEvent.id}) is the same as currentBottom.id (${currentBottom?.id}). No transition needed.`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newEvent?.id]); // Dépend uniquement de l'ID pour détecter le changement

  // ─────────────────────────────────────────────────────────────────────
  // Effet pour réafficher les boutons quand les conditions sont remplies
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    console.log(`[EventLayoutA] Effect [isImageLoaded, showDate, isLevelPaused]: Checking conditions - isImageLoaded=${isImageLoaded}, showDate=${showDate}, isLevelPaused=${isLevelPaused}`);
    if (isImageLoaded && !showDate && !isLevelPaused) {
      console.log('[EventLayoutA] Effect [isImageLoaded...]: Conditions MET. Scheduling setShowButtons(true).');
      // Générer une nouvelle clé unique pour le remontage potentiel des boutons
      setUniqueKey(`buttons-${newEvent?.id || currentBottom?.id}-${Date.now()}`);

      // Afficher les boutons avec un léger délai pour éviter le flash pendant l'animation/chargement
      const timer = setTimeout(() => {
        console.log('[EventLayoutA] Effect [isImageLoaded...] -> setTimeout: Calling setShowButtons(true)');
        setShowButtons(true);
      }, 100); // Garder un petit délai

      return () => {
        console.log('[EventLayoutA] Effect [isImageLoaded...] Cleanup: Clearing timeout.');
        clearTimeout(timer);
      };
    } else {
      console.log('[EventLayoutA] Effect [isImageLoaded...]: Conditions NOT MET for showing buttons.');
      // Important : Assurez-vous qu'il n'y a pas un setShowButtons(false) ici par erreur.
      // Si les conditions ne sont pas remplies, on ne fait rien (on ne cache pas forcément les boutons ici,
      // d'autres effets ou actions peuvent le faire).
    }
  }, [isImageLoaded, showDate, isLevelPaused, newEvent?.id, currentBottom?.id]); // Les dépendances semblent correctes

  // ─────────────────────────────────────────────────────────────────────
  // Effet pour masquer les boutons quand on montre la date (après réponse/timeout)
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (showDate) {
      console.log('[EventLayoutA] Effect [showDate]: showDate is true, calling setShowButtons(false)');
      setShowButtons(false);
    }
    // Note: On ne remet pas showButtons à true ici quand showDate redevient false,
    // l'effet précédent basé sur isImageLoaded s'en charge.
  }, [showDate]);

  // ─────────────────────────────────────────────────────────────────────
  // Animation des cartes
  // ─────────────────────────────────────────────────────────────────────
  const animateCards = () => {
    console.log('[EventLayoutA] animateCards: Starting animation.');
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
      console.log('[EventLayoutA] animateCards: Animation completed. Swapping cards and resetting animation values.');
      // Swap cards: Le 'newEvent' devient le 'currentBottom' qui devient le 'currentTop'
      setCurrentTop(currentBottom); // L'ancien bas monte
      setCurrentBottom(newEvent);    // Le nouveau prop devient le bas

      // Reset animation values pour le prochain cycle
      topCardTranslateY.setValue(0);
      bottomCardTranslateY.setValue(0); // Important de reset celui-ci aussi
      topCardScale.setValue(1);

      // End transition state
      setTransitioning(false);
      console.log(`[EventLayoutA] animateCards: Transition finished. currentTop=${currentTop?.id}, currentBottom=${currentBottom?.id}`); // Log l'état après swap
    });
  };

  // ─────────────────────────────────────────────────────────────────────
  // Gestionnaire de choix utilisateur
  // ─────────────────────────────────────────────────────────────────────
  const handleChoice = (choice: string) => {
    console.log(`[EventLayoutA] handleChoice: User chose '${choice}'. Setting showButtons=false.`);
    // Masquer les boutons dès le clic
    setShowButtons(false);
    // setIsWaitingForCountdown(true); // Cet état local n'est pas utilisé pour la logique des boutons

    // Propager le choix au parent
    onChoice(choice);
  };

  // ─────────────────────────────────────────────────────────────────────
  // Rendu
  // ─────────────────────────────────────────────────────────────────────
  // Log final avant le rendu des boutons
  const shouldRenderButtons = showButtons && !showDate && isImageLoaded && !isLevelPaused;
  console.log(`[EventLayoutA] Render - Button Visibility Decision: showButtons=${showButtons}, !showDate=${!showDate}, isImageLoaded=${isImageLoaded}, !isLevelPaused=${!isLevelPaused} => Should Render: ${shouldRenderButtons}`);

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
          // Utiliser l'état local pour la carte du haut
          event={currentTop}
          position="top"
          // La date est toujours affichée sur la carte du haut (la référence)
          showDate={true}
          streak={streak} // Passer streak/level si nécessaire pour l'affichage
          level={level}
          // Pas besoin de onImageLoad ici
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
            // Utiliser l'état local pour la carte du bas
            event={currentBottom}
            position="bottom"
            // Passer les props pour le chargement et l'affichage de la date/correction
            onImageLoad={onImageLoad}
            showDate={showDate}
            isCorrect={isCorrect}
            streak={streak}
            level={level}
          />

          <View style={styles.buttonsContainer}>
            {/* Utiliser la variable calculée pour la condition */}
            {shouldRenderButtons && (
              <OverlayChoiceButtonsA
                key={uniqueKey} // La clé unique force le remontage si nécessaire
                onChoice={handleChoice}
                // Passer les états pertinents si OverlayChoiceButtonsA en a besoin
                isLevelPaused={isLevelPaused} // Passé false ici, est-ce correct ? Doit venir de la prop
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