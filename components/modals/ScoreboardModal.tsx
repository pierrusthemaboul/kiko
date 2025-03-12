import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/Colors';
import type { LevelEventSummary } from '@/hooks/types';

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
  levelsHistory?: Array<{ level: number; events: LevelEventSummary[] }>;
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
  allTimeScores = [],
  levelsHistory = [],
}) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'allTime'>('daily');
  const scaleAnim = useRef(new Animated.Value(0)).current;

  // État pour savoir si on affiche la liste des événements
  const [showEvents, setShowEvents] = useState(false);
  // État pour gérer le niveau sélectionné
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  const isNewHighScore = currentScore > personalBest;

  // LOGS pour debug
  useEffect(() => {
    console.log('[ScoreboardModal] isVisible changed to:', isVisible);
  }, [isVisible]);

  useEffect(() => {
    console.log('[ScoreboardModal] levelsHistory:', levelsHistory);
    if (levelsHistory.length > 0) {
      levelsHistory.forEach((lh) => {
        console.log(`--> Niveau ${lh.level} : ${lh.events.length} événement(s)`);
      });
    }
  }, [levelsHistory]);

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
      setShowEvents(false);
      setSelectedLevel(null);
      setActiveTab('daily');
    }
  }, [isVisible]);

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

  // Rendu d'une ligne de score
  const renderScoreRow = (
    score: { name: string; score: number; rank: number },
    index: number
  ) => {
    const isCurrentPlayer = score.name === playerName;
    return (
      <View
        key={`${score.name}-${index}`}
        style={[styles.scoreRow, isCurrentPlayer && styles.currentPlayerRow]}
      >
        <View style={styles.rankContainer}>
          <Text style={styles.rankText}>#{score.rank || index + 1}</Text>
        </View>
        <Text style={[styles.playerName, isCurrentPlayer && styles.currentPlayerText]} numberOfLines={1}>
          {score.name}
        </Text>
        <Text style={[styles.scoreValue, isCurrentPlayer && styles.currentPlayerText]}>
          {score.score.toLocaleString()}
        </Text>
      </View>
    );
  };

  // Affichage principal (scores)
  const renderScoreboardContent = () => {
    const currentScores = getCurrentScores();
    return (
      <>
        <View style={styles.scoreContainer}>
          <Text style={styles.score}>{currentScore.toLocaleString()}</Text>
          {isNewHighScore && (
            <View style={styles.newHighScoreContainer}>
              <Ionicons name="trophy" size={24} color={colors.warningYellow} />
              <Text style={styles.newHighScoreText}>Nouveau record !</Text>
            </View>
          )}
        </View>

        {/* Onglets : Jour / Mois / Total */}
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
            <Text style={[styles.tabText, activeTab === 'daily' && styles.activeTabText]}>
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
            <Text style={[styles.tabText, activeTab === 'monthly' && styles.activeTabText]}>
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
            <Text style={[styles.tabText, activeTab === 'allTime' && styles.activeTabText]}>
              Total
            </Text>
          </TouchableOpacity>
        </View>

        {/* Liste des scores */}
        <View style={styles.scoresListContainer}>
          {currentScores.map((score, index) => renderScoreRow(score, index))}
          {currentScores.length === 0 && (
            <View style={styles.noScoresContainer}>
              <Text style={styles.noScoresText}>Aucun score disponible</Text>
            </View>
          )}
        </View>
      </>
    );
  };

  // Affichage de la liste des niveaux, ou des événements du niveau
  const renderEventsContent = () => {
    // Si pas de niveau sélectionné => liste des niveaux
    if (selectedLevel === null) {
      return (
        <View style={styles.eventsContainer}>
          <Text style={styles.eventsTitle}>Historique des niveaux</Text>
          <ScrollView contentContainerStyle={styles.levelButtonsContainer}>
            {levelsHistory.length > 0 ? (
              levelsHistory
                .sort((a, b) => a.level - b.level)
                .map((levelHistory) => (
                  <TouchableOpacity
                    key={levelHistory.level}
                    style={styles.levelButton}
                    onPress={() => setSelectedLevel(levelHistory.level)}
                  >
                    <Text style={styles.levelButtonText}>Niveau {levelHistory.level}</Text>
                  </TouchableOpacity>
                ))
            ) : (
              <Text style={styles.noScoresText}>Aucun événement enregistré</Text>
            )}
          </ScrollView>
        </View>
      );
    } else {
      // Sinon => liste des événements du niveau sélectionné
      const currentLevelData = levelsHistory.find((lh) => lh.level === selectedLevel);
      return (
        <View style={styles.eventsContainer}>
          <TouchableOpacity
            onPress={() => setSelectedLevel(null)}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
          <Text style={styles.eventsTitle}>Événements - Niveau {selectedLevel}</Text>
          <ScrollView contentContainerStyle={styles.eventsListContainer}>
            {currentLevelData && currentLevelData.events.length > 0 ? (
              currentLevelData.events.map((evt, index) => (
                <View key={`${evt.id}-${index}`} style={styles.eventItem}>
                  <Text style={styles.eventTitle}>{evt.titre}</Text>
                  <Text style={styles.eventDate}>{evt.date}</Text>
                  <Text style={styles.eventResult}>
                    {evt.wasCorrect ? 'Correct' : 'Incorrect'}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.noScoresText}>Aucun événement pour ce niveau</Text>
            )}
          </ScrollView>
        </View>
      );
    }
  };

  return (
    <Modal transparent visible={isVisible} animationType="none" statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.title}>Partie terminée !</Text>

          {!showEvents ? (
            <>
              {renderScoreboardContent()}

              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.button} onPress={onRestart}>
                  <Text style={styles.buttonText}>Rejouer</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.menuButton]}
                  onPress={onMenuPress}
                >
                  <Text style={styles.buttonText}>Menu</Text>
                </TouchableOpacity>
              </View>

              {/* Bouton "Voir les événements" en bas */}
              <View style={styles.eventsButtonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.eventsButton]}
                  onPress={() => setShowEvents(true)}
                >
                  <Text style={styles.buttonText}>Voir les événements</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {renderEventsContent()}

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.menuButton]}
                  onPress={() => {
                    setShowEvents(false);
                    setSelectedLevel(null);
                  }}
                >
                  <Text style={styles.buttonText}>Fermer</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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
    marginBottom: 10,
    maxHeight: 250,
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
    marginTop: 10,
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
  },
  eventsButtonContainer: {
    marginTop: 15,
  },
  eventsButton: {
    backgroundColor: colors.primary,
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    minWidth: 180,
  },
  // Événements
  eventsContainer: {
    width: '100%',
    marginBottom: 15,
    alignItems: 'center',
  },
  eventsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  levelButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  levelButton: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    margin: 5,
  },
  levelButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
    marginLeft: 5,
  },
  eventsListContainer: {
    paddingHorizontal: 10,
    width: '100%',
  },
  eventItem: {
    backgroundColor: colors.transparencies.light,
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  eventDate: {
    fontSize: 14,
    color: colors.text,
    marginTop: 4,
  },
  eventResult: {
    fontSize: 14,
    fontStyle: 'italic',
    color: colors.primary,
    marginTop: 2,
  },
});

export default ScoreboardModal;
