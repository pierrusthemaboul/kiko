import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import AnimatedEventCardA from './AnimatedEventCardA'; // Assure-toi que le chemin est correct
import OverlayChoiceButtonsA from './OverlayChoiceButtonsA'; // Assure-toi que le chemin est correct
import { Event } from '@/hooks/types'; // Assure-toi que le chemin et le type Event sont corrects

const { height } = Dimensions.get('window');
const ANIMATION_DURATION = 600; // Légèrement réduit pour plus de fluidité ? Ajuste si besoin.
const CARD_HEIGHT_PERCENT = 0.42; // Utiliser une constante pour la hauteur
const TOP_CARD_INITIAL_Y = 10;
const BOTTOM_CARD_INITIAL_Y = height * 0.45;
const MOVE_DISTANCE = -(height * CARD_HEIGHT_PERCENT); // Distance de déplacement vers le haut

interface EventLayoutAProps {
  previousEvent: Event | null; // Utiliser le type Event importé
  newEvent: Event | null; // Utiliser le type Event importé
  onImageLoad: () => void;
  onChoice: (choice: 'avant' | 'après') => void; // Préciser les choix possibles
  showDate?: boolean;
  isCorrect?: boolean;
  isImageLoaded: boolean;
  streak: number;
  level: number;
  isLevelPaused: boolean;
  // --- NOUVELLE PROP (Reçue de GameContentA) ---
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
  isInitialRender, // <-- Récupérer la nouvelle prop
}) => {
  // 1) État de transition
  const [transitioning, setTransitioning] = useState(false);

  // 2) État local pour les cartes affichées (synchronisé avec les props)
  //    On initialise directement avec les props pour le premier rendu.
  const [currentTop, setCurrentTop] = useState(previousEvent);
  const [currentBottom, setCurrentBottom] = useState(newEvent);

  // 3) Animations
  const topCardTranslateY = useRef(new Animated.Value(0)).current;
  const bottomCardTranslateY = useRef(new Animated.Value(0)).current;
  const topCardScale = useRef(new Animated.Value(1)).current;

  // 4) Ref pour stocker l'ID du newEvent précédent et détecter les vrais changements
  const prevNewEventIdRef = useRef<string | null>(newEvent?.id ?? null);

  // ─────────────────────────────────────────────────────────────────────
  // Effet pour gérer la transition LORSQUE newEvent CHANGE (et pas au rendu initial)
  // ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Ne rien faire si newEvent est null ou si c'est le rendu initial identifié par le parent
    if (!newEvent || isInitialRender) {
      // Si c'est le rendu initial, s'assurer que les positions sont bonnes
      if (isInitialRender) {
          topCardTranslateY.setValue(0);
          bottomCardTranslateY.setValue(0);
          topCardScale.setValue(1);
          // Synchroniser l'état local avec les props initiales au cas où
          setCurrentTop(previousEvent);
          setCurrentBottom(newEvent);
          prevNewEventIdRef.current = newEvent?.id ?? null; // Initialiser la ref aussi
      }
      return;
    }

    // Vérifier si l'ID de l'événement a réellement changé depuis le dernier effet
    if (newEvent.id !== prevNewEventIdRef.current) {
      prevNewEventIdRef.current = newEvent.id; // Mettre à jour la ref AVANT l'animation
      animateCards(); // Lancer l'animation seulement si l'ID a changé et ce n'est pas le rendu initial
    }
  }, [newEvent, isInitialRender, previousEvent]); // Ajouter previousEvent aux dépendances pour la synchro initiale

  // ─────────────────────────────────────────────────────────────────────
  // Animation des cartes (quand animateCards est appelé)
  // ─────────────────────────────────────────────────────────────────────
  const animateCards = () => {
    setTransitioning(true); // Indiquer qu'une animation est en cours

    // Réinitialiser les valeurs avant de démarrer (important si animation précédente interrompue)
    topCardTranslateY.setValue(0);
    bottomCardTranslateY.setValue(0);
    topCardScale.setValue(1);

    Animated.parallel([
      // Animer la carte du haut (qui contient l'ancien 'currentTop') vers le haut et la réduire
      Animated.timing(topCardTranslateY, {
        toValue: MOVE_DISTANCE,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(topCardScale, {
        toValue: 0.95, // Légère réduction pour effet de profondeur
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      // Animer la carte du bas (qui contient l'ancien 'currentBottom') vers la position haute
      Animated.timing(bottomCardTranslateY, {
        toValue: MOVE_DISTANCE,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      // Cette callback s'exécute APRÈS la fin de l'animation
      if (finished) {
        // Mettre à jour l'état local des cartes affichées :
        // L'ancien 'currentBottom' devient le nouveau 'currentTop'
        setCurrentTop(currentBottom);
        // Le 'newEvent' des props devient le nouveau 'currentBottom'
        setCurrentBottom(newEvent);

        // Réinitialiser les transformations pour le prochain cycle d'animation
        // La carte du haut est maintenant à sa position initiale (0)
        topCardTranslateY.setValue(0);
        topCardScale.setValue(1);
        // La carte du bas est maintenant à sa position initiale (0)
        bottomCardTranslateY.setValue(0);

        setTransitioning(false); // Fin de l'état de transition
      } else {
         // Si l'animation est interrompue, on pourrait vouloir forcer la réinitialisation
         // ou laisser l'état tel quel selon le comportement désiré.
         // Forcer la réinitialisation est plus sûr :
         setCurrentTop(currentBottom);
         setCurrentBottom(newEvent);
         topCardTranslateY.setValue(0);
         topCardScale.setValue(1);
         bottomCardTranslateY.setValue(0);
         setTransitioning(false);
      }
    });
  };

  // ─────────────────────────────────────────────────────────────────────
  // Gestionnaire de choix utilisateur (simplifié, on masque les boutons via showDate)
  // ─────────────────────────────────────────────────────────────────────
  const handleChoice = (choice: 'avant' | 'après') => {
    // Pas besoin de masquer les boutons ici si l'effet sur showDate le fait déjà
    // On propage juste le choix
    onChoice(choice);
  };

  // ─────────────────────────────────────────────────────────────────────
  // Rendu
  // ─────────────────────────────────────────────────────────────────────
  // Déterminer si les boutons doivent être visibles
  // Ils sont visibles si l'image est chargée, qu'on n'affiche pas la date/réponse,
  // que le jeu n'est pas en pause, et qu'aucune animation de carte n'est en cours.
  const shouldRenderButtons = isImageLoaded && !showDate && !isLevelPaused && !transitioning;

  return (
    <View style={styles.container}>
      {/* Carte du Haut (Contient l'événement de référence) */}
      {/* Utilise l'état local 'currentTop' */}
      <Animated.View
        style={[
          styles.cardContainer,
          styles.topCard,
          {
            transform: [
              { translateY: topCardTranslateY },
              { scale: topCardScale },
            ],
            // On pourrait ajouter une opacité pour le fade out si désiré
          },
        ]}
      >
        <AnimatedEventCardA
          // Passer l'événement de l'état local
          event={currentTop}
          position="top"
          showDate={true} // La carte du haut montre toujours la date/année
          streak={streak}
          level={level}
           // Pas besoin d'onImageLoad ou isCorrect pour la carte du haut
        />
      </Animated.View>

      {/* Carte du Bas (Contient l'événement à placer) */}
      {/* Utilise l'état local 'currentBottom' */}
      <Animated.View
        style={[
          styles.cardContainer,
          styles.bottomCard,
          { transform: [{ translateY: bottomCardTranslateY }] },
        ]}
      >
        <View style={styles.bottomCardContent}>
          <AnimatedEventCardA
             // Passer l'événement de l'état local
            event={currentBottom}
            position="bottom"
            onImageLoad={onImageLoad}
            showDate={showDate} // Contrôlé par le parent
            isCorrect={isCorrect} // Contrôlé par le parent
            isImageLoaded={isImageLoaded} // Contrôlé par le parent
            streak={streak}
            level={level}
          />

          {/* Conteneur pour les boutons, superposé */}
          <View style={styles.buttonsContainer}>
            {shouldRenderButtons && (
              <OverlayChoiceButtonsA
                // Utiliser une clé qui change quand les boutons doivent réapparaître
                // L'ID de l'événement du bas est un bon candidat
                key={`buttons-${currentBottom?.id}`}
                onChoice={handleChoice}
                // Ces props pourraient être utilisées pour désactiver les boutons
                isLevelPaused={isLevelPaused}
                isWaitingForCountdown={false} // Cet état local n'est plus géré ici
                transitioning={transitioning}
              />
            )}
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Le fond vient du parent (ImageBackground)
  },
  cardContainer: {
    position: 'absolute',
    left: 10, // Légère marge
    right: 10, // Légère marge
    height: height * CARD_HEIGHT_PERCENT, // Hauteur basée sur pourcentage écran
    // backgroundColor: 'transparent', // Pas nécessaire si EventCard a son fond
  },
  topCard: {
    top: TOP_CARD_INITIAL_Y, // Position initiale Y
    zIndex: 1, // La carte du haut est derrière pendant la transition
  },
  bottomCard: {
    top: BOTTOM_CARD_INITIAL_Y, // Position initiale Y
    zIndex: 2, // La carte du bas passe au-dessus
  },
  bottomCardContent: {
    flex: 1,
    position: 'relative', // Pour positionner les boutons
  },
  buttonsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    // Ajuster la position verticale des boutons si nécessaire
    bottom: 50 , // Un peu plus haut sur iOS ?
    paddingHorizontal: 20, // Espace sur les côtés
    zIndex: 3, // Boutons au-dessus de la carte du bas
    alignItems: 'center', // Centrer les boutons si leur conteneur est plus large
  },
});

export default EventLayoutA;