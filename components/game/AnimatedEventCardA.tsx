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
import { View, Image, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
  
  // État pour adapter la taille du texte en fonction de la longueur du titre
  const [titleFontSize, setTitleFontSize] = useState(position === 'top' ? 24 : 22);
  
  // Animation pour la couleur du titre
  const titleColorAnim = useRef(new Animated.Value(0)).current;
  
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
  
  // Animation de variation de couleur pour le titre
  useEffect(() => {
    // Réinitialiser l'animation à chaque changement d'événement
    titleColorAnim.setValue(0);
    
    // Animation en boucle pour faire varier la couleur du titre
    Animated.loop(
      Animated.sequence([
        Animated.timing(titleColorAnim, {
          toValue: 1,
          duration: 20000,
          useNativeDriver: false
        }),
        Animated.timing(titleColorAnim, {
          toValue: 0,
          duration: 20000,
          useNativeDriver: false
        })
      ])
    ).start();
    
    // Nettoyer l'animation quand le composant est démonté ou l'événement change
    return () => {
      titleColorAnim.stopAnimation();
    };
  }, [event?.id]); // Ajouter event?.id comme dépendance

  // 1.E.3. Vérification et ajustement pour la longueur du titre
  useEffect(() => {
    if (event?.titre) {
      const titleLength = event.titre.length;
      const wordCount = event.titre.split(' ').length;
      
      // Déterminer si c'est un titre long
      setIsTitleLong(titleLength > 40 || wordCount > 4);
      
      // Ajuster la taille de police en fonction de la longueur et position
      if (position === 'top') {
        if (titleLength > 70 || wordCount > 8) {
          setTitleFontSize(18);
        } else if (titleLength > 50 || wordCount > 6) {
          setTitleFontSize(20);
        } else if (titleLength > 30 || wordCount > 4) {
          setTitleFontSize(22);
        } else {
          setTitleFontSize(24);
        }
      } else {
        // Pour la carte du bas
        if (titleLength > 70 || wordCount > 8) {
          setTitleFontSize(16);
        } else if (titleLength > 50 || wordCount > 6) {
          setTitleFontSize(18);
        } else if (titleLength > 30 || wordCount > 4) {
          setTitleFontSize(20);
        } else {
          setTitleFontSize(22);
        }
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

  // 1.E.5. Rendu du titre avec ou sans effet d'ombre
  const renderTitle = () => {
    // Création des couleurs interpolées pour le titre
    const textColor = titleColorAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: ['rgba(255, 255, 255, 1)', 'rgba(220, 240, 255, 1)', 'rgba(255, 255, 255, 1)']
    });
    
    const shadowColor = titleColorAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: ['rgba(0, 0, 0, 0.9)', 'rgba(0, 0, 0, 0.7)', 'rgba(0, 0, 0, 0.9)']
    });
    
    // Titre pour la carte du haut
    if (position === 'top') {
      return (
        <View style={[
          styles.titleContainer,
          styles.titleContainerTop,
          isTitleLong && styles.titleContainerLong,
          showDate && styles.titleContainerWithDate
        ]}>
          <Animated.Text 
            style={[
              styles.title,
              styles.titleTop,
              styles.textOutline,
              { 
                fontSize: titleFontSize,
                color: textColor,
                textShadowColor: shadowColor
              }
            ]} 
            numberOfLines={3}
          >
            {event?.titre}
          </Animated.Text>
        </View>
      );
    } 
    
    // Titre pour la carte du bas avec effet d'ombre amélioré
    return (
      <View style={styles.bottomTitleWrapper}>
        <Animated.Text 
          style={[
            styles.titleBottom,
            styles.textOutline,
            { 
              fontSize: titleFontSize,
              fontWeight: 'bold',
              textAlign: 'center',
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 3,
              color: textColor,
              textShadowColor: shadowColor
            }
          ]} 
          numberOfLines={3}
        >
          {event?.titre}
        </Animated.Text>
      </View>
    );
  };

  // 1.E.6. Rendu de l'overlay de date
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
      <Animated.View style={[dateOverlayStyle, { opacity: fadeAnim }]}>
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

  // 1.E.7. Rendu principal du composant
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
          
          {/* Dégradé pour améliorer la lisibilité du texte */}
          <LinearGradient
            colors={position === 'top' ? 
              ['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)'] : 
              ['transparent', 'transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.8)']
            }
            locations={position === 'top' ? [0.4, 0.7, 1] : [0, 0.6, 0.8, 1]}
            style={[
              styles.gradient,
              position === 'top' ? styles.gradientTop : styles.gradientBottom
            ]}
          >
            {position === 'top' && renderTitle()}
          </LinearGradient>
          
          {/* Titre pour la carte du bas (placé au-dessus du gradient pour un meilleur contrôle) */}
          {position === 'bottom' && renderTitle()}
          
          {/* Overlay de date */}
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
    borderColor: 'rgba(255, 255, 255, 0.3)', // un peu plus lumineux
    backgroundColor: 'rgba(0, 0, 0, 0.2)', // fond légèrement plus clair pour effet de lumière
    overflow: 'hidden',
    elevation: 12, // augmenté pour Android
    shadowColor: '#FFD700', // Couleur lumineuse or doux
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, // augmenté pour un glow visible
    shadowRadius: 10, // légèrement augmenté pour l'effet "glow"
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
    height: '60%', // Augmenté pour couvrir plus d'espace
  },
  gradientBottom: {
    bottom: 0,
    height: '50%', // Augmenté pour la carte du bas
  },
  
  // Styles pour le conteneur de titre
  titleContainer: {
    padding: 15,
    justifyContent: 'flex-end',
  },
  titleContainerTop: {
    paddingBottom: 20,
  },
  titleContainerLong: {
    paddingBottom: 20,
  },
  titleContainerWithDate: {
    paddingBottom: 80, // Plus grand quand la date est affichée
  },
  
  // Styles pour le titre
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  titleTop: {
    letterSpacing: 0.5,
  },
  
  // Styles pour le contour du texte et l'effet de glow
  textOutline: {
    // Effet de contour multiple avec des ombres dans différentes directions
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
    // Le style de base inclut déjà textShadowColor qui est animé
    
    // On ajoute un effet supplémentaire avec backgroundColor
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  
  // Styles pour le wrapper du titre du bas
  bottomTitleWrapper: {
    position: 'absolute',
    bottom: 90,
    left: 20,
    right: 20,
    zIndex: 100,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Styles pour le titre du bas
  titleBottom: {
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 0.3,
  },
  
  // Styles pour l'overlay de date
  dateOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  topDateOverlay: {
    height: 80,
  },
  bottomDateOverlay: {
    height: 80,
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
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  topDateText: {
    fontSize: 48,
  },
  bottomDateText: {
    fontSize: 42,
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