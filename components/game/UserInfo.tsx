import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/Colors';
import { ActiveBonus, BonusType } from '@/hooks/types';

// Obtenir les dimensions de l'écran
const { width, height } = Dimensions.get('window');

interface UserInfoProps {
  name: string;
  points: number;
  lives: number;
  level: number;
  streak: number;
  activeBonus?: ActiveBonus[];
  currentQuestion?: number;
  totalQuestions?: number;
  // Ajout des propriétés pour tracking des événements du niveau
  eventsCompletedInLevel?: number;
  eventsNeededForLevel?: number;
  maxLives?: number;
}

export interface UserInfoHandle {
  getPointsPosition: () => Promise<{ x: number; y: number }>;
  getLifePosition: () => Promise<{ x: number; y: number }>;
}

const UserInfo = forwardRef<UserInfoHandle, UserInfoProps>(
  (
    {
      name,
      points,
      lives,
      level,
      streak,
      activeBonus = [],
      currentQuestion,
      totalQuestions,
      eventsCompletedInLevel = 0,  // Valeur par défaut
      eventsNeededForLevel = 5,    // Valeur par défaut
      maxLives = 3
    },
    ref
  ) => {
    // Références sur le conteneur des points
    const pointsRef = useRef<View>(null);
    // Référence pour le conteneur des vies
    const livesRef = useRef<View>(null);

    // Animation "bounce" lors du changement de points ou de vies
    const bounceAnim = useRef(new Animated.Value(1)).current;

    // Position du conteneur principal (pour calculer l'offset Y)
    const [containerPosition, setContainerPosition] = useState({ x: 0, y: 0 });
    const containerRef = useRef<View>(null);

    // Position mesurée pour les points
    const [pointsPosition, setPointsPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    // Position mesurée pour les vies
    const [livesPosition, setLivesPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    // Animation de bounce quand les points ou vies changent
    useEffect(() => {
      Animated.sequence([
        Animated.spring(bounceAnim, {
          toValue: 1.1,
          friction: 3,
          tension: 40,
          useNativeDriver: true
        }),
        Animated.spring(bounceAnim, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true
        })
      ]).start();
    }, [points, lives]);

    // Mesurer la position du conteneur principal
    const handleContainerLayout = () => {
      if (containerRef.current) {
        containerRef.current.measureInWindow((x, y, width, height) => {
          setContainerPosition({ x, y });
          // console.log('Container position measured:', { x, y }); // Log supprimé
        });
      }
    };

    // Fonction pour mesurer la position des points
    const handlePointsLayout = () => {
      if (pointsRef.current) {
        pointsRef.current.measureInWindow((x, y, width, height) => {
          const measuredPos = { x: x + width / 2, y: y + height / 2 };
          setPointsPosition(measuredPos);
          // console.log('Points position measured:', measuredPos);
        });
      }
    };

    // Fonction pour mesurer la position des vies
    const handleLivesLayout = () => {
      if (livesRef.current) {
        livesRef.current.measureInWindow((x, y, width, height) => {
          const measuredPos = { x: x + width / 2, y: y + height / 2 };
          setLivesPosition(measuredPos);
          // console.log('Lives position measured:', measuredPos);
        });
      }
    };

    // Remesurer quand les points ou vies changent
    useEffect(() => {
      handlePointsLayout();
      handleLivesLayout();
    }, [points, lives]);

    // Mesurer après le premier rendu
    useEffect(() => {
      handleContainerLayout();
      handlePointsLayout();
      handleLivesLayout();
    }, []);

    // Exposition des méthodes pour récupérer les positions (pour l'animation de récompense)
    useImperativeHandle(ref, () => ({
      getPointsPosition: () =>
        new Promise((resolve) => {
          // if (pointsPosition.x !== 0 || pointsPosition.y !== 0) {
          //   console.log('[UserInfo] Using cached points position:', pointsPosition);
          //   resolve(pointsPosition);
          // } else 
          if (pointsRef.current) {
            pointsRef.current.measureInWindow((x, y, width, height) => {
              const pos = { x: x + width / 2, y: y + height / 2 };
              // console.log('[UserInfo] Measured points position:', pos);
              setPointsPosition(pos);
              resolve(pos);
            });
          } else {
            // console.log('[UserInfo] Fallback points position used');
            const fallbackPos = { x: width * 0.25, y: 40 };
            resolve(fallbackPos);
          }
        }),
      getLifePosition: () =>
        new Promise((resolve) => {
          // if (livesPosition.x !== 0 || livesPosition.y !== 0) {
          //   console.log('[UserInfo] Using cached lives position:', livesPosition);
          //   resolve(livesPosition);
          // } else 
          if (livesRef.current) {
            livesRef.current.measureInWindow((x, y, width, height) => {
              const pos = { x: x + width / 2, y: y + height / 2 };
              // console.log('[UserInfo] Measured lives position:', pos);
              setLivesPosition(pos);
              resolve(pos);
            });
          } else if (containerRef.current) {
            // Utiliser measureInWindow pour obtenir la position absolue
            containerRef.current.measureInWindow((x, y, containerWidth, containerHeight) => {
              // Position calculée: 80% de la largeur de l'écran pour être au niveau des coeurs
              // et même hauteur que le conteneur principal + offset
              const lifeX = width * 0.80; // 80% de la largeur de l'écran
              // Ajouter un offset Y pour cibler le centre des coeurs
              const lifeY = y + (containerHeight / 2);

              // console.log('[UserInfo] Calculated life position:', { x: lifeX, y: lifeY });
              resolve({ x: lifeX, y: lifeY });
            });
          } else {
            // Fallback si aucune référence n'est disponible
            // console.log('[UserInfo] Fallback lives position used');
            const fallbackPos = { x: width * 0.80, y: 40 };
            resolve(fallbackPos);
          }
        })
    }), [pointsPosition, livesPosition, containerPosition]);

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
                      backgroundColor: getBonusColor(bonus.type)
                    }
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
      <View ref={livesRef} style={styles.livesContainer} onLayout={handleLivesLayout}>
        {Array.from({ length: Math.max(1, maxLives) }, (_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.heartContainer,
              i < lives && { transform: [{ scale: bounceAnim }] }
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

    // Modifié: Utilisation d'une icône pour la série au lieu du texte "Série : "
    const renderStreak = () => (
      <View style={styles.streakContainer}>
        {streak > 0 && (
          <View style={styles.streakWrapper}>
            <Ionicons name="flame" size={14} color={colors.warningYellow} style={styles.streakIcon} />
            <Text style={styles.streakText}>{streak}</Text>
          </View>
        )}
      </View>
    );

    const getLevelColor = (lvl: number): string => {
      if (lvl <= 5) return colors.primary;
      if (lvl <= 10) return colors.accent;
      if (lvl <= 15) return colors.warningYellow;
      return colors.incorrectRed;
    };

    return (
      <View
        ref={containerRef}
        style={styles.container}
        onLayout={handleContainerLayout}
      >
        <View style={styles.mainSection}>
          {/* Nom du joueur + score */}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{name || ''}</Text>
            <View ref={pointsRef} style={styles.scoreContainer} onLayout={handlePointsLayout}>
              <Text style={styles.score}>{points}</Text>
            </View>
          </View>
          {/* Indicateur de progression (questions) */}
          {typeof currentQuestion === 'number' && typeof totalQuestions === 'number' && (
            <View style={styles.questionIndicator}>
              <Text style={styles.questionText}>
                {currentQuestion}/{totalQuestions}
              </Text>
            </View>
          )}
          {/* Vies, niveau, streak et bonus */}
          <View style={styles.statsContainer}>
            {renderLives()}
            <View style={styles.levelBadgeContainer}>
              <View style={[styles.levelBadge, { backgroundColor: getLevelColor(level) }]}>
                <Text style={styles.levelText}>{level}</Text>
              </View>
              {/* Affichage du compteur de progression x/y sans le texte "niveau" */}
              <Text style={styles.levelProgress}>{eventsCompletedInLevel}/{eventsNeededForLevel}</Text>
            </View>
            {renderStreak()}
            {renderBonusIndicators()}
          </View>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
    flex: 1,
    zIndex: 1200,
  },
  mainSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  questionIndicator: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 5,
    marginHorizontal: 8,
  },
  questionText: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 8,
  },
  livesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heartContainer: {
    marginHorizontal: 1,
    padding: 2,
  },
  heart: {
    marginHorizontal: 1,
  },
  // Conteneur pour le badge de niveau et son étiquette
  levelBadgeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  levelProgress: {
    color: 'white',
    fontSize: 7,
    textAlign: 'center',
    marginTop: 1,
  },
  streakContainer: {
    minWidth: 30, // Réduit de 60 à 30 pour économiser l'espace
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2, // Réduit de 4 à 2
  },
  streakWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.15)', // Fond léger pour la série
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  streakIcon: {
    marginRight: 2,
  },
  streakText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bonusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  bonusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 5,
  },
  bonusIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 2,
  },
  bonusMultiplier: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  bonusProgressContainer: {
    height: 6,
    width: 50,
    backgroundColor: colors.lightGrey,
    borderRadius: 3,
    overflow: 'hidden',
  },
  bonusProgress: {
    height: '100%',
    borderRadius: 3,
  },
});

export default UserInfo;
