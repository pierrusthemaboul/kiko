import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  LayoutChangeEvent
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/Colors';
import { ActiveBonus, BonusType } from '@/hooks/types';

// Définition locale de MAX_LIVES au cas où l'import ne fonctionne pas
const MAX_LIVES = 3;

interface UserInfoProps {
  name: string;
  points: number;
  lives: number;
  level: number;
  streak: number;
  activeBonus?: ActiveBonus[];
  currentQuestion?: number;
  totalQuestions?: number;
}

export interface UserInfoHandle {
  getPointsPosition: () => Promise<{ x: number; y: number }>;
  getLifePosition: () => Promise<{ x: number; y: number }>;
}

const UserInfo = forwardRef<UserInfoHandle, UserInfoProps>(
  (
    { name, points, lives, level, streak, activeBonus = [], currentQuestion, totalQuestions },
    ref
  ) => {
    // Références sur les conteneurs pour les mesures
    const pointsRef = useRef<View>(null);
    const livesRef = useRef<View>(null);

    // Animation "bounce" lors du changement de points ou de vies
    const bounceAnim = useRef(new Animated.Value(1)).current;

    // Positions mesurées (centre de chaque conteneur)
    const [pointsPosition, setPointsPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [livesPosition, setLivesPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    // Animation "bounce" quand points ou vies changent
    React.useEffect(() => {
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

    // Handler onLayout pour mettre à jour la position du conteneur des points
    const handlePointsLayout = () => {
      if (pointsRef.current) {
        pointsRef.current.measureInWindow((x, y, width, height) => {
          setPointsPosition({
            x: x + width / 2,
            y: y + height / 2
          });
        });
      }
    };

    // Handler onLayout pour mettre à jour la position du conteneur des vies
    const handleLivesLayout = () => {
      if (livesRef.current) {
        livesRef.current.measureInWindow((x, y, width, height) => {
          setLivesPosition({
            x: x + width / 2,
            y: y + height / 2
          });
        });
      }
    };

    // Exposition des méthodes pour récupérer les positions
    useImperativeHandle(ref, () => ({
      getPointsPosition: () =>
        new Promise((resolve) => {
          if (pointsPosition.x !== 0 || pointsPosition.y !== 0) {
            resolve(pointsPosition);
          } else {
            if (pointsRef.current) {
              pointsRef.current.measureInWindow((x, y, width, height) => {
                const pos = { x: x + width / 2, y: y + height / 2 };
                setPointsPosition(pos);
                resolve(pos);
              });
            } else {
              resolve({ x: 0, y: 0 });
            }
          }
        }),
      getLifePosition: () =>
        new Promise((resolve) => {
          if (livesPosition.x !== 0 || livesPosition.y !== 0) {
            resolve(livesPosition);
          } else {
            if (livesRef.current) {
              livesRef.current.measureInWindow((x, y, width, height) => {
                const pos = { x: x + width / 2, y: y + height / 2 };
                setLivesPosition(pos);
                resolve(pos);
              });
            } else {
              resolve({ x: 0, y: 0 });
            }
          }
        })
    }), [pointsPosition, livesPosition]);

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

    const renderLives = () => (
      <View ref={livesRef} style={styles.livesContainer} onLayout={handleLivesLayout}>
        {Array(MAX_LIVES)
          .fill(0)
          .map((_, i) => (
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

    const renderStreak = () => (
      <View style={styles.streakContainer}>
        <Text style={styles.streakText}>
          {streak > 0 ? `Série : ${streak}` : ''}
        </Text>
      </View>
    );

    const getLevelColor = (lvl: number): string => {
      if (lvl <= 5) return colors.primary;
      if (lvl <= 10) return colors.accent;
      if (lvl <= 15) return colors.warningYellow;
      return colors.incorrectRed;
    };

    return (
      <View style={styles.container}>
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
    flex: 1,
    zIndex: 1200
  },
  mainSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8
  },
  userName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.darkText,
    marginRight: 6
  },
  scoreContainer: {
    paddingHorizontal: 6,
    paddingVertical: 3
  },
  score: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600'
  },
  questionIndicator: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 5,
    marginHorizontal: 8
  },
  questionText: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '600'
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 8
  },
  livesContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  heartContainer: {
    marginHorizontal: 1
  },
  heart: {
    marginHorizontal: 1
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },
  levelText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold'
  },
  streakContainer: {
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4
  },
  streakText: {
    color: colors.darkText,
    fontSize: 14,
    fontWeight: 'bold'
  },
  bonusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10
  },
  bonusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 5
  },
  bonusIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 2
  },
  bonusMultiplier: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 2
  },
  bonusProgressContainer: {
    height: 6,
    width: 50,
    backgroundColor: colors.lightGrey,
    borderRadius: 3,
    overflow: 'hidden'
  },
  bonusProgress: {
    height: '100%',
    borderRadius: 3
  }
});

export default UserInfo;
