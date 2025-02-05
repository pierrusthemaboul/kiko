import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';

interface ScoreboardModalProps {
  isVisible: boolean;
  currentScore: number;
  personalBest: number;
  onRestart: () => void;
  onMenuPress: () => void;
  playerName: string;
  dailyScores?: Array<{ name: string; score: number; rank: number }>;
  monthlyScores?: Array<{ name: string; score: number; rank: number }>;
  allTimeScores?: Array<{ name: string; score: number; rank: number }>;
}

const ScoreboardModal: React.FC<ScoreboardModalProps> = ({
  isVisible,
  currentScore,
  personalBest,
  onRestart,
  onMenuPress,
  playerName,
  dailyScores = [],
  monthlyScores = [],
  allTimeScores = []
}) => {
  // États et animations
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'allTime'>('daily');
  const scaleAnim = useRef(new Animated.Value(0)).current;
  
  // État dérivé pour nouveau record
  const isNewHighScore = currentScore > personalBest;

  // Animation d'entrée
  useEffect(() => {
    if (isVisible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [isVisible]);

  // Rendu d'une ligne de score
  const renderScore = (score: { name: string; score: number; rank: number }, index: number) => {
    const isCurrentPlayer = score.name === playerName;
    
    return (
      <View 
        key={`${score.name}-${index}`} 
        style={[
          styles.scoreRow,
          isCurrentPlayer && styles.currentPlayerRow
        ]}
      >
        <View style={styles.rankContainer}>
          <Text style={styles.rankText}>#{score.rank || index + 1}</Text>
        </View>
        <Text 
          style={[
            styles.playerName,
            isCurrentPlayer && styles.currentPlayerText
          ]} 
          numberOfLines={1}
        >
          {score.name}
        </Text>
        <Text 
          style={[
            styles.scoreValue,
            isCurrentPlayer && styles.currentPlayerText
          ]}
        >
          {score.score.toLocaleString()}
        </Text>
      </View>
    );
  };

  // Sélection des scores selon l'onglet actif
  const getCurrentScores = () => {
    switch (activeTab) {
      case 'daily':
        return dailyScores.slice(0, 5);
      case 'monthly':
        return monthlyScores.slice(0, 5);
      case 'allTime':
        return allTimeScores.slice(0, 5);
      default:
        return [];
    }
  };

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <Text style={styles.title}>Partie terminée !</Text>

          <View style={styles.scoreContainer}>
            <Text style={styles.score}>{currentScore.toLocaleString()}</Text>
            {isNewHighScore && (
              <View style={styles.newHighScoreContainer}>
                <Ionicons name="trophy" size={24} color={colors.warningYellow} />
                <Text style={styles.newHighScoreText}>Nouveau record !</Text>
              </View>
            )}
          </View>

          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'daily' && styles.activeTab]}
              onPress={() => setActiveTab('daily')}
            >
              <Ionicons 
                name="today" 
                size={24} 
                color={activeTab === 'daily' ? colors.primary : colors.text} 
              />
              <Text 
                style={[
                  styles.tabText,
                  activeTab === 'daily' && styles.activeTabText
                ]}
              >
                Jour
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'monthly' && styles.activeTab]}
              onPress={() => setActiveTab('monthly')}
            >
              <Ionicons 
                name="calendar" 
                size={24} 
                color={activeTab === 'monthly' ? colors.primary : colors.text}
              />
              <Text 
                style={[
                  styles.tabText,
                  activeTab === 'monthly' && styles.activeTabText
                ]}
              >
                Mois
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'allTime' && styles.activeTab]}
              onPress={() => setActiveTab('allTime')}
            >
              <Ionicons 
                name="trophy" 
                size={24} 
                color={activeTab === 'allTime' ? colors.primary : colors.text}
              />
              <Text 
                style={[
                  styles.tabText,
                  activeTab === 'allTime' && styles.activeTabText
                ]}
              >
                Total
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.scoresListContainer}>
            {getCurrentScores().map((score, index) => renderScore(score, index))}
            {getCurrentScores().length === 0 && (
              <View style={styles.noScoresContainer}>
                <Text style={styles.noScoresText}>
                  Aucun score disponible
                </Text>
              </View>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.button}
              onPress={onRestart}
            >
              <Text style={styles.buttonText}>Rejouer</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.menuButton]}
              onPress={onMenuPress}
            >
              <Text style={styles.buttonText}>Menu</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  score: {
    fontSize: 40,
    fontWeight: 'bold',
    color: colors.primary,
  },
  newHighScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: colors.transparencies.light,
    padding: 10,
    borderRadius: 12,
  },
  newHighScoreText: {
    color: colors.warningYellow,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.transparencies.light,
    padding: 4,
    borderRadius: 15,
    marginBottom: 15,
    width: '100%',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
  },
  activeTab: {
    backgroundColor: 'white',
  },
  tabText: {
    fontSize: 14,
    color: colors.text,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  scoresListContainer: {
    width: '100%',
    marginBottom: 20,
    maxHeight: 300,
  },
  noScoresContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noScoresText: {
    color: colors.lightText,
    fontSize: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: colors.transparencies.light,
    marginBottom: 8,
  },
  currentPlayerRow: {
    backgroundColor: `${colors.primary}20`,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  playerName: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    marginLeft: 10,
  },
  currentPlayerText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.accent,
    marginLeft: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
  },
  menuButton: {
    backgroundColor: colors.accent,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default ScoreboardModal;