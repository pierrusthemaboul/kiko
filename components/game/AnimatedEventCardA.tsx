/************************************************************************************
 * 1. COMPOSANT : AnimatedEventCardA
 *
 * 1.A. Description
 *     Composant React Native affichant une carte d'événement animée avec des
 *     fonctionnalités spécifiques selon sa position (haut ou bas).
 *
 * 1.B. Props
 *     @interface AnimatedEventCardAProps
 *     @property {any} event - Données de l'événement à afficher.
 *     @property {'top' | 'bottom'} position - Position de la carte (haut ou bas).
 *     @property {() => void} [onImageLoad] - Callback appelé lorsque l'image est chargée.
 *     @property {boolean} [showDate] - Indique si la date doit être affichée.
 *     @property {boolean} [isCorrect] - Indique si la réponse est correcte.
 *     @property {number} [streak] - Nombre de bonnes réponses consécutives.
 *     @property {number} [level] - Niveau actuel du jeu.
 ************************************************************************************/

// 1.C. Imports
import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../styles/colors';

// Obtenir les dimensions de l'écran pour les calculs de style adaptatif
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/************************************************************************************
 * 1.D. Interface des Props
 ************************************************************************************/
interface AnimatedEventCardAProps {
  event: any;
  position: 'top' | 'bottom';
  onImageLoad?: () => void;
  showDate?: boolean;
  isCorrect?: boolean;
  streak?: number;
  level?: number;
}

/************************************************************************************
 * 1.E. Composant Fonctionnel
 ************************************************************************************/
const AnimatedEventCardA: React.FC<AnimatedEventCardAProps> = ({
  event,
  position,
  onImageLoad,
  showDate = false,
  isCorrect,
  streak,
  level
}) => {
  // 1.E.1. Animations et états
  const dateScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isTitleLong, setIsTitleLong] = useState(false);
  
  // Nouvel état pour la taille adaptative du texte (uniquement pour la carte du bas)
  const [titleFontSize, setTitleFontSize] = useState(position === 'bottom' ? 24 : 24);
  
  // 1.E.2. Effet pour l'animation de la date
  useEffect(() => {
    if (showDate) {
      // Animation de pulsation pour la date
      Animated.sequence([
        Animated.timing(dateScale, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(dateScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
      
      // Animation de fondu pour l'ensemble
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Reset de l'animation quand la date est cachée
      fadeAnim.setValue(position === 'top' ? 1 : 0);
    }
  }, [showDate, position]);

  // Animation initiale au chargement pour la carte supérieure
  useEffect(() => {
    if (position === 'top') {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [position]);

  // 1.E.3. Vérification de la longueur du titre
  useEffect(() => {
    if (event?.titre) {
      // Un titre est considéré long s'il dépasse 40 caractères ou contient plus de 4 mots
      setIsTitleLong(
        event.titre.length > 40 || 
        event.titre.split(' ').length > 4
      );
      
      // Ajustement dynamique de la taille de police pour la carte du bas
      if (position === 'bottom') {
        const titleLength = event.titre.length;
        const wordCount = event.titre.split(' ').length;
        
        let newSize = 24; // Taille de base pour le bas
        
        if (titleLength > 30 || wordCount > 4) {
          newSize = 22;
        }
        
        if (titleLength > 50 || wordCount > 6) {
          newSize = 20;
        }
        
        if (titleLength > 70 || wordCount > 8) {
          newSize = 18;
        }
        
        setTitleFontSize(newSize);
      }
    }
  }, [event?.titre, position]);

  // 1.E.4. Fonction pour extraire l'année d'une date
  const getYearFromDate = (dateString: string): string => {
    try {
      // Si c'est déjà une année à 4 chiffres, on la retourne directement
      if (/^\d{4}$/.test(dateString)) return dateString;
      
      // Si c'est une date formatée "YYYY-MM-DD", on extrait l'année
      if (dateString.includes('-')) return dateString.split('-')[0];
      
      // Si c'est une date formatée localisée, on tente d'extraire l'année
      if (event.date_formatee) {
        const parts = event.date_formatee.split(' ');
        for (const part of parts) {
          if (/^\d{4}$/.test(part)) return part;
        }
      }
      
      // Fallback: retour de la chaîne originale
      return dateString;
    } catch (error) {
      console.error('Error extracting year from date:', error);
      return dateString;
    }
  };

  // 1.E.5. Rendu de la date
  const renderDate = () => {
    if (!showDate || !event?.date) return null;

    const dateOverlayStyle = [
      styles.dateOverlay,
      position === 'top' ? styles.topDateOverlay : styles.bottomDateOverlay,
      position === 'bottom' && isCorrect !== undefined && (
        isCorrect ? styles.correctOverlay : styles.incorrectOverlay
      )
    ];

    return (
      <Animated.View 
        style={[
          dateOverlayStyle,
          { 
            opacity: fadeAnim,
          }
        ]}
      >
        {position === 'top' && (
          <View style={styles.separator} />
        )}
        <Animated.Text 
          style={[
            styles.dateText,
            position === 'top' ? styles.topDateText : styles.bottomDateText,
            { transform: [{ scale: dateScale }] }
          ]}
        >
          {getYearFromDate(event.date)}
        </Animated.Text>
      </Animated.View>
    );
  };

  // 1.E.6. Rendu principal du composant
  return (
    <View style={styles.container}>
      <View style={styles.cardFrame}>
        <View style={styles.cardContent}>
          {/* Image d'arrière-plan */}
          <Image
            source={{ uri: event?.illustration_url }}
            style={styles.image}
            onLoad={onImageLoad}
            resizeMode="cover"
          />
          
          {/* Dégradé pour le texte */}
          <LinearGradient
            colors={position === 'bottom' ? 
              ['transparent', 'transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.7)'] : 
              ['transparent', 'rgba(0,0,0,0.9)']}
            locations={position === 'bottom' ? [0, 0.6, 0.8, 1] : [0.5, 1]}
            style={[
              styles.gradient,
              position === 'bottom' ? styles.gradientBottom : styles.gradientTop,
              isTitleLong && styles.gradientLong
            ]}
          >
            {position === 'top' && (
              <View style={[
                styles.titleContainer,
                styles.titleContainerTop,
                isTitleLong && styles.titleContainerLong,
                showDate && styles.titleContainerWithDate
              ]}>
                <Text style={[
                  styles.title,
                  styles.titleTop,
                  isTitleLong && styles.titleTopLong
                ]} numberOfLines={3}>
                  {event?.titre}
                </Text>
              </View>
            )}
          </LinearGradient>

          {/* Titre pour l'événement du bas - AMÉLIORÉ */}
          {position === 'bottom' && (
            <View style={styles.bottomTitleWrapper}>
              <View style={styles.textOutlineContainer}>
                {/* Effet de contour pour le titre du bas - AJUSTÉ POUR TOUS LES TITRES */}
                <Text style={[styles.titleOutline, { top: -0.3, left: -0.3, fontSize: titleFontSize }]} numberOfLines={3}>{event?.titre}</Text>
                <Text style={[styles.titleOutline, { top: -0.3, left: 0.3, fontSize: titleFontSize }]} numberOfLines={3}>{event?.titre}</Text>
                <Text style={[styles.titleOutline, { top: 0.3, left: -0.3, fontSize: titleFontSize }]} numberOfLines={3}>{event?.titre}</Text>
                <Text style={[styles.titleOutline, { top: 0.3, left: 0.3, fontSize: titleFontSize }]} numberOfLines={3}>{event?.titre}</Text>
                
                {/* Texte principal */}
                <Text style={[
                  styles.title,
                  styles.titleBottom,
                  { fontSize: titleFontSize }
                ]} numberOfLines={3}>
                  {event?.titre}
                </Text>
              </View>
            </View>
          )}

          {/* Rendu de la date */}
          {renderDate()}
        </View>
      </View>
    </View>
  );
};

/************************************************************************************
 * 1.F. Styles
 ************************************************************************************/
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 8,
  },
  cardFrame: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  cardContent: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  
  // Styles pour le dégradé
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
  },
  gradientTop: {
    bottom: 0,
    height: '50%',
  },
  gradientBottom: {
    bottom: 0,
    height: '40%', // Limité à la partie basse pour les boutons
  },
  gradientLong: {
    height: '45%', // Un peu plus haut pour les titres longs
  },
  
  // Styles pour le conteneur de titre
  titleContainer: {
    padding: 10,
    justifyContent: 'flex-end',
  },
  titleContainerTop: {
    paddingBottom: 15,
  },
  titleContainerBottom: {
    paddingBottom: 80, // Augmenté pour éviter le chevauchement avec les boutons
    paddingTop: 5,     // Réduit le padding en haut pour garder plus de visibilité sur l'image
  },
  titleContainerLong: {
    paddingBottom: 20,
  },
  titleContainerWithDate: {
    paddingBottom: 80, // Augmenté pour éviter le chevauchement avec la date
  },
  
  // Wrapper pour le titre du bas - position juste au-dessus des boutons
  bottomTitleWrapper: {
    position: 'absolute',
    bottom: 90,         // Augmenté pour plus d'espace entre le titre et les boutons
    left: 0,
    right: 0,
    padding: 10,
    zIndex: 100,        // Pour être au-dessus de tout
  },
  
  // Container pour l'effet d'outline du texte
  textOutlineContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Texte pour l'effet de contour
  titleOutline: {
    position: 'absolute',
    fontWeight: 'bold',
    color: 'rgba(30, 30, 30, 0.9)',
    textAlign: 'center',
    width: '100%',
  },
  
  // Styles pour le titre
  title: {
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  titleTop: {
    fontSize: 24,
    letterSpacing: 0.5,
  },
  titleBottom: {
    fontSize: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0.6, height: 0.6 },
    textShadowRadius: 3.5,
    letterSpacing: 0.3,
  },
  titleTopLong: {
    fontSize: 20, // Taille réduite pour les titres longs
  },
  titleBottomLong: {
    fontSize: 18, // Taille encore plus réduite pour les titres longs sur la carte du bas
  },
  
  // Styles pour l'overlay de date
  dateOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  topDateOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Renforcé pour meilleure lisibilité
    height: 80, // Un peu plus de hauteur pour l'événement du haut aussi
  },
  bottomDateOverlay: {
    height: 80, // Plus haut pour la carte du bas
  },
  correctOverlay: {
    backgroundColor: 'rgba(39, 174, 96, 0.8)',
  },
  incorrectOverlay: {
    backgroundColor: 'rgba(231, 76, 60, 0.8)',
  },
  
  // Styles pour le texte de date
  dateText: {
    color: 'white',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  topDateText: {
    fontSize: 48,
  },
  bottomDateText: {
    fontSize: 42, // Légèrement plus petit pour la carte du bas
  },
  // Séparateur visuel
  separator: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: '80%',
    alignSelf: 'center',
    marginBottom: 10
  }
});

export default AnimatedEventCardA;