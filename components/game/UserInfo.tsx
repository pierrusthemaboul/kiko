import React, { forwardRef, useImperativeHandle, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/Colors';
import { MAX_LIVES, ActiveBonus, BonusType } from '@/hooks/types';

// Interface des props
interface UserInfoProps {
  name: string;
  points: number;
  lives: number;
  level: number;
  streak: number;
  activeBonus?: ActiveBonus[];
}

// Interface des méthodes exposées
export interface UserInfoHandle {
  getPointsPosition: () => Promise<{ x: number; y: number }>;
  getLifePosition: () => Promise<{ x: number; y: number }>;
}

// Composant UserInfo
const UserInfo = forwardRef<UserInfoHandle, UserInfoProps>(
  ({ name, points, lives, level, streak, activeBonus = [] }, ref) => {
    const pointsRef = useRef<View>(null);
    const livesRef = useRef<View>(null);
    const bounceAnim = useRef(new Animated.Value(1)).current;

    // State pour stocker les positions
    const [pointsPosition, setPointsPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [livesPosition, setLivesPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [positionsCalculated, setPositionsCalculated] = useState(false);

    // Animation des points
    useEffect(() => {
      Animated.sequence([
        Animated.spring(bounceAnim, {
          toValue: 1.1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(bounceAnim, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();
    }, [points, lives]);

    // Calcul des positions après le rendu
    useEffect(() => {
      const calculatePositions = () => {
        console.log('UserInfo: Calculating element positions');
        
        // Délai pour s'assurer que le composant est monté et mesuré
        setTimeout(() => {
          if (pointsRef.current) {
            pointsRef.current.measure((x, y, width, height, pageX, pageY) => {
              const position = { x: pageX + width / 2, y: pageY + height / 2 };
              console.log('Points position measured:', position);
              setPointsPosition(position);
            });
          }

          if (livesRef.current) {
            livesRef.current.measure((x, y, width, height, pageX, pageY) => {
              const position = { x: pageX + width / 2, y: pageY + height / 2 };
              console.log('Lives position measured:', position);
              setLivesPosition(position);
            });
          }
          
          setPositionsCalculated(true);
        }, 300);
      };

      calculatePositions();
    }, []);

    // Recalculer les positions si les points ou vies changent
    useEffect(() => {
      if (positionsCalculated) {
        setTimeout(() => {
          if (pointsRef.current) {
            pointsRef.current.measure((x, y, width, height, pageX, pageY) => {
              const position = { x: pageX + width / 2, y: pageY + height / 2 };
              setPointsPosition(position);
            });
          }

          if (livesRef.current) {
            livesRef.current.measure((x, y, width, height, pageX, pageY) => {
              const position = { x: pageX + width / 2, y: pageY + height / 2 };
              setLivesPosition(position);
            });
          }
        }, 100);
      }
    }, [points, lives, positionsCalculated]);

    // Exposition des méthodes pour obtenir les positions
    useImperativeHandle(ref, () => ({
      getPointsPosition: () => {
        return new Promise((resolve) => {
          if (!pointsRef.current) {
            console.log('Points ref not available');
            resolve({ x: 0, y: 0 });
            return;
          }
          
          // Si on a déjà calculé la position, on la retourne
          if (pointsPosition.x !== 0 || pointsPosition.y !== 0) {
            console.log('Returning cached points position:', pointsPosition);
            resolve(pointsPosition);
            return;
          }
          
          // Sinon on la calcule
          pointsRef.current.measure((x, y, width, height, pageX, pageY) => {
            const position = { x: pageX + width / 2, y: pageY + height / 2 };
            console.log('Getting points position on demand:', position);
            setPointsPosition(position);
            resolve(position);
          });
        });
      },
      getLifePosition: () => {
        return new Promise((resolve) => {
          if (!livesRef.current) {
            console.log('Lives ref not available');
            resolve({ x: 0, y: 0 });
            return;
          }
          
          // Si on a déjà calculé la position, on la retourne
          if (livesPosition.x !== 0 || livesPosition.y !== 0) {
            console.log('Returning cached lives position:', livesPosition);
            resolve(livesPosition);
            return;
          }
          
          // Sinon on la calcule
          livesRef.current.measure((x, y, width, height, pageX, pageY) => {
            const position = { x: pageX + width / 2, y: pageY + height / 2 };
            console.log('Getting lives position on demand:', position);
            setLivesPosition(position);
            resolve(position);
          });
        });
      },
    }), [pointsPosition, livesPosition]);

    // Fonctions utilitaires (getBonusColor, getBonusIcon)
    const getBonusColor = (type: BonusType) => {
      switch (type) {
        case BonusType.TIME:
          return colors.timerNormal;
        case BonusType.STREAK:
          return colors.warningYellow;
        case BonusType.PERIOD:
          return colors.primary;
        case BonusType.MASTERY:
          return colors.accent;
        case BonusType.COMBO:
          return colors.correctGreen;
        default:
          return colors.primary;
      }
    };

    const getBonusIcon = (type: BonusType): string => {
      switch (type) {
        case BonusType.TIME:
          return 'timer-outline';
        case BonusType.STREAK:
          return 'flame-outline';
        case BonusType.PERIOD:
          return 'calendar-outline';
        case BonusType.MASTERY:
          return 'star-outline';
        case BonusType.COMBO:
          return 'flash-outline';
        default:
          return 'star-outline';
      }
    };

    // Rendu des indicateurs de bonus
    const renderBonusIndicators = () => {
      const currentTime = Date.now();
      const activeMultipliers = activeBonus.filter(
        (bonus) => bonus.expiresAt > currentTime
      );

      if (activeMultipliers.length === 0) return null;

      return (
        <View style={styles.bonusContainer}>
          {activeMultipliers.map((bonus, index) => (
            <View key={index} style={styles.bonusItem}>
              <View style={styles.bonusIconContainer}>
                <Ionicons
                  name={getBonusIcon(bonus.type)}
                  size={16}
                  color={getBonusColor(bonus.type)}
                />
                <Text style={[styles.bonusMultiplier, { color: getBonusColor(bonus.type) }]}>
                  x{bonus.multiplier.toFixed(1)}
                </Text>
              </View>
              <View style={styles.bonusProgressContainer}>
                <View
                  style={[
                    styles.bonusProgress,
                    {
                      width: `${((bonus.expiresAt - currentTime) / bonus.duration) * 100}%`,
                      backgroundColor: getBonusColor(bonus.type),
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      );
    };

    // Rendu des vies
    const renderLives = () => (
      <View ref={livesRef} style={styles.livesContainer}>
        {Array(MAX_LIVES)
          .fill(0)
          .map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.heartContainer,
                i < lives && {
                  transform: [{ scale: bounceAnim }],
                },
              ]}
            >
              <Ionicons
                name={i < lives ? 'heart' : 'heart-outline'}
                size={20}
                color={i < lives ? colors.incorrectRed : colors.lightText}
                style={styles.heart}
              />
            </Animated.View>
          ))}
      </View>
    );

    // Rendu du streak
    const renderStreak = () => (
      <View style={styles.streakContainer}>
        <Text style={[
          styles.streakText,
          streak >= 20 ? styles.streakUltra :
          streak >= 15 ? styles.streakMaster : 
          streak >= 10 ? styles.streakExpert :
          streak >= 5 ? styles.streakPro : null
        ]}>
          {streak > 0 ? `×${streak}` : ''}
        </Text>
      </View>
    );

    // Gestion des couleurs de niveau
    const getLevelColor = (level: number): string => {
      if (level <= 5) return colors.primary;
      if (level <= 10) return colors.accent;
      if (level <= 15) return colors.warningYellow;
      return colors.incorrectRed;
    };

    // Rendu principal
    return (
      <View style={styles.container}>
        <View style={styles.mainSection}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{name || ''}</Text>
            <View ref={pointsRef} style={styles.scoreContainer}>
              <Text style={styles.score}>{points}</Text>
            </View>
          </View>
          <View style={styles.statsContainer}>
            {renderLives()}
            <View style={[styles.levelBadge, { backgroundColor: getLevelColor(level) }]}>
              <Text style={styles.levelText}>{level}</Text>
            </View>
            {renderStreak()}
            {renderBonusIndicators()}
          </View>
        </View>
      </View>
    );
  }
);

// Styles
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
    flex: 1,
  },
  mainSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.darkText,
    marginRight: 6,
  },
  scoreContainer: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  score: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
  },
  livesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heartContainer: {
    marginHorizontal: 1,
  },
  heart: {
    marginHorizontal: 1,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  streakContainer: {
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  streakText: {
    color: colors.darkText,
    fontSize: 14,
    fontWeight: 'bold',
  },
  streakPro: {
    color: colors.primary,
  },
  streakExpert: {
    color: colors.accent,
  },
  streakMaster: {
    color: colors.warningYellow,
  },
  streakUltra: {
    color: colors.incorrectRed,
  },
  bonusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10, // Espacement à gauche pour séparer des autres éléments
  },
  bonusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 5, // Espacement entre les bonus
  },
  bonusIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 2, // Espacement entre l'icône et le multiplicateur
  },
  bonusMultiplier: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  bonusProgressContainer: {
    height: 6, // Hauteur de la barre de progression
    width: 50, // Largeur de la barre de progression
    backgroundColor: colors.lightGrey, // Couleur de fond de la barre
    borderRadius: 3, // Bords arrondis pour la barre
    overflow: 'hidden', // Assure que la barre de progression ne dépasse pas les bords
  },
  bonusProgress: {
    height: '100%', // La barre de progression remplit la hauteur du conteneur
    borderRadius: 3, // Bords arrondis pour la barre
  },
});

export default UserInfo;