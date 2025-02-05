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
import React, { useEffect, useRef } from 'react';
import { View, Image, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/colors';

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
  // 1.E.1. Référence pour l'animation de la date
  const dateScale = useRef(new Animated.Value(1)).current;

  // 1.E.2. Effet d'animation pour la date
  useEffect(() => {
    if (position === 'bottom' && showDate) {
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
    }
  }, [showDate, position]);

  // 1.E.3. Fonction pour extraire l'année d'une date
  const getYearFromDate = (dateString: string): string => {
    try {
      if (/^\d{4}$/.test(dateString)) return dateString;
      if (dateString.includes('-')) return dateString.split('-')[0];
      return dateString;
    } catch (error) {
      console.error('Error extracting year from date:', error);
      return dateString;
    }
  };

  // 1.E.4. Fonction pour rendre la date avec overlay
  const renderDate = () => {
    if ((position === 'top' || showDate) && event?.date) {
      const overlayStyle = [
        styles.dateOverlay,
        position === 'top' ? styles.topOverlay : null,
        position === 'bottom' && isCorrect !== undefined && (
          isCorrect ? styles.correctOverlay : styles.incorrectOverlay
        )
      ];

      return (
        <Animated.View style={overlayStyle}>
          <Animated.Text 
            style={[
              styles.date,
              { transform: [{ scale: dateScale }] }
            ]}
          >
            {getYearFromDate(event.date)}
          </Animated.Text>
        </Animated.View>
      );
    }
    return null;
  };

  // 1.E.5. Rendu principal du composant
  return (
    <View style={styles.container}>
      <View style={styles.cardFrame}>
        <View style={styles.cardContent}>
          <Image
            source={{ uri: event?.illustration_url }}
            style={styles.image}
            onLoad={onImageLoad}
            resizeMode="cover"
          />
          
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.9)']}
            style={[
              styles.gradient,
              position === 'bottom' && styles.gradientBottom
            ]}
          >
            <View style={[
              styles.titleContainer,
              position === 'bottom' && styles.titleContainerBottom
            ]}>
              <Text style={[
                styles.title,
                position === 'top' ? styles.titleTop : styles.titleBottom
              ]} numberOfLines={2}>
                {event?.titre}
              </Text>
            </View>
          </LinearGradient>

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
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    justifyContent: 'flex-end',
  },
  gradientBottom: {
    height: '65%',
  },
  titleContainer: {
    padding: 16,
  },
  titleContainerBottom: {
    paddingBottom: 90,
  },
  title: {
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
  },
  titleTop: {
    fontSize: 24,
    letterSpacing: 0.5,
    textShadowColor: '#000',
    textShadowOffset: { width: -1, height: -1 },
    textShadowRadius: 0,
  },
  titleBottom: {
    fontSize: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  dateOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  correctOverlay: {
    backgroundColor: `${colors.correctGreen}cc`,
  },
  incorrectOverlay: {
    backgroundColor: `${colors.incorrectRed}cc`,
  },
  date: {
    color: colors.white,
    fontSize: 48,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  }
});

export default AnimatedEventCardA;