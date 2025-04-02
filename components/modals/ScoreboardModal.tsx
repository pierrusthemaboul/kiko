import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  // État pour l’onglet des scores (jour, mois, total)
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'allTime'>('daily');
  // État pour l’affichage du bloc "Voir les événements"
  const [showEvents, setShowEvents] = useState(false);
  // État pour le niveau sélectionné (si null => liste des niveaux)
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  // État pour l’événement sélectionné (sous-modal de détails)
  const [selectedEvent, setSelectedEvent] = useState<LevelEventSummary | null>(null);

  // Animation d’apparition du modal principal
  const scaleAnim = useRef(new Animated.Value(0)).current;

  // Indique si c’est un nouveau record
  const isNewHighScore = currentScore > personalBest;

  /**
   * Fonction utilitaire pour extraire l'année d'un événement.
   * On priorise `date_formatee`, sinon on tente de parser `date`.
   */
  function getEventYear(event: LevelEventSummary): string {
    const rawDate = (event.date_formatee || event.date) ?? '';
    if (!rawDate) return '';
    const parsedDate = new Date(rawDate);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.getFullYear().toString();
    }
    const parts = rawDate.split(' ');
    if (parts.length >= 2) {
      return parts[parts.length - 1];
    }
    return rawDate;
  }

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

  // Gère l’animation d’ouverture/fermeture du modal
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
      setSelectedEvent(null);
    }
  }, [isVisible]);

  // Sélectionne la liste de scores en fonction de l’onglet actif
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

  // Rendu d’une ligne du tableau de scores
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
        <Text
          style={[styles.playerName, isCurrentPlayer && styles.currentPlayerText]}
          numberOfLines={1}
        >
          {score.name}
        </Text>
        <Text style={[styles.scoreValue, isCurrentPlayer && styles.currentPlayerText]}>
          {score.score.toLocaleString()}
        </Text>
      </View>
    );
  };

  // Rendu du tableau des scores (score actuel + high score + top 5)
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

  // Rendu d’un sous-modal affichant les détails d’un événement
  const renderEventDetailsModal = () => {
    if (!selectedEvent) return null;
    return (
      <Modal
        transparent
        visible={!!selectedEvent}
        onRequestClose={() => setSelectedEvent(null)}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.eventDetailsModal}>
            <View style={styles.eventDetailsHeader}>
              <Text style={styles.eventDetailsTitle}>{selectedEvent.titre}</Text>
              <Text style={styles.eventDetailsDate}>{getEventYear(selectedEvent)}</Text>
            </View>

            <ScrollView style={styles.eventDetailsContent}>
              <Text style={styles.eventDetailsDescription}>
                {selectedEvent.description_detaillee
                  ? selectedEvent.description_detaillee
                  : "Aucune description détaillée disponible pour cet événement historique."}
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedEvent(null)}
            >
              <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Rendu du contenu "Voir les événements" (liste des niveaux ou événements d’un niveau)
  const renderEventsContent = () => {
    // Si aucun niveau sélectionné => liste des niveaux
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

          {/* Bouton pour fermer la vue des événements */}
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
        </View>
      );
    } else {
      // Sinon => affichage des cartes défilantes pour le niveau sélectionné
      const currentLevelData = levelsHistory.find((lh) => lh.level === selectedLevel);
      return (
        <View style={styles.eventsContainer}>
          <View style={styles.selectedLevelHeader}>
            <TouchableOpacity
              onPress={() => setSelectedLevel(null)}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
              <Text style={styles.backButtonText}>Retour</Text>
            </TouchableOpacity>
            <Text style={styles.eventsTitle}>Événements - Niveau {selectedLevel}</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.eventsCardsContainer}
          >
            {currentLevelData && currentLevelData.events.length > 0 ? (
              currentLevelData.events.map((evt, index) => (
                <TouchableOpacity
                  key={`${evt.id}-${index}`}
                  activeOpacity={0.7}
                  style={styles.eventCardTouchable}
                  onPress={() => setSelectedEvent(evt)}  // <-- On ouvre le sous-modal
                >
                  <View style={styles.eventCard}>
                    {evt.illustration_url ? (
                      <Image
                        source={{ uri: evt.illustration_url }}
                        style={styles.eventImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.eventImage, { backgroundColor: '#ccc' }]} />
                    )}
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.8)']}
                      style={styles.eventGradient}
                    >
                      <Text style={styles.eventDate}>{getEventYear(evt)}</Text>
                      <Text style={styles.eventTitle} numberOfLines={2}>
                        {evt.titre}
                      </Text>
                      <View
                        style={[
                          styles.responseIndicator,
                          {
                            backgroundColor: evt.wasCorrect
                              ? colors.correctGreen
                              : colors.incorrectRed,
                          },
                        ]}
                      >
                        <Ionicons
                          name={evt.wasCorrect ? 'checkmark' : 'close'}
                          size={20}
                          color="white"
                        />
                      </View>
                    </LinearGradient>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noScoresText}>Aucun événement pour ce niveau</Text>
            )}
          </ScrollView>

          {/* Bouton pour fermer la vue des événements */}
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

              {/* Bouton "Voir les événements" */}
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
            </>
          )}
        </Animated.View>

        {/* Sous-modal pour les détails d’un événement */}
        {renderEventDetailsModal()}
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
    backgroundColor: '#FF8C69',
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    minWidth: 180,
  },
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
    textAlign: 'center',
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
  selectedLevelHeader: {
    width: '100%',
    marginBottom: 10,
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
  eventsCardsContainer: {
    paddingHorizontal: 10,
  },
  eventCardTouchable: {
    transform: [{ scale: 1 }],
    marginRight: 10,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  eventCard: {
    width: 200,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  eventGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    height: '60%',
  },
  eventDate: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  eventTitle: {
    color: 'white',
    fontSize: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  responseIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },

  /* Sous-modal pour les détails d'un événement */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventDetailsModal: {
    backgroundColor: 'white',
    borderRadius: 15,
    width: '85%',
    maxWidth: 400,
    maxHeight: '75%',
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  eventDetailsHeader: {
    padding: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#f9f9f9',
  },
  eventDetailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  eventDetailsDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff5e62',
  },
  eventDetailsContent: {
    padding: 20,
    maxHeight: '60%',
  },
  eventDetailsDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: '#444',
  },
  closeButton: {
    backgroundColor: '#ff5e62',
    padding: 12,
    alignItems: 'center',
    marginTop: 5,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ScoreboardModal;
