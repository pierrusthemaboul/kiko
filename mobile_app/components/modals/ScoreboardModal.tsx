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
  Alert,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../constants/Colors';
import { supabase } from '@/lib/supabase/supabaseClients';
import type { LevelEventSummary } from '@/hooks/types';
import { ShareScoreButton } from '../ShareScoreButton';
import { ShareData } from '../../types/sharing';

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
  gameMode?: 'classic' | 'precision' | 'chrono' | 'relax';
  userStats?: {
    totalGames: number;
    bestScore: number;
    averageScore: number;
  };
  onShareReward?: () => void;
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
  gameMode = 'classic',
  userStats,
  onShareReward,
}) => {
  // État pour l’onglet des scores (jour, mois, total)
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'allTime'>('daily');
  // État pour l’affichage du bloc "Voir les événements"
  const [showEvents, setShowEvents] = useState(false);
  // État pour le niveau sélectionné (si null => liste des niveaux)
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  // État pour l’événement sélectionné (sous-modal de détails)
  const [selectedEvent, setSelectedEvent] = useState<LevelEventSummary | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  const isValidUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  // --- Logique de signalement ---
  const handleReport = (event: LevelEventSummary) => {
    if (!event || !event.id) return;

    Alert.alert(
      "Historien, une erreur ?",
      `Voulez-vous signaler un problème sur "${event.titre}" ?`,
      [
        { text: "📅 Date fausse", onPress: () => sendReport(event, "DATE_FAUSSE") },
        { text: "✍️ Titre / Texte", onPress: () => sendReport(event, "DESCRIPTION_FAUSSE") },
        { text: "🖼️ Image", onPress: () => sendReport(event, "IMAGE_INCOHERENTE") },
        { text: "❌ Autre / Doublon", onPress: () => sendReport(event, "AUTRE") },
        { text: "Annuler", style: "cancel" }
      ]
    );
  };

  const sendReport = async (event: LevelEventSummary, type: string) => {
    const eventId = event.id;

    if (!isValidUuid(eventId)) {
      Alert.alert("Signalement impossible", "Identifiant d'événement invalide.");
      return;
    }

    setIsReporting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const reportPayload = {
        evenement_id: eventId,
        user_id: user?.id || null,
        type_erreur: type,
      };

      const { error } = await (supabase.from('evenements_signalements') as any).insert(reportPayload);

      if (!error) {
        Alert.alert("Merci !", "Signalement reçu. Nos historiens vont vérifier !");
        setSelectedEvent(null);
        return;
      }

      const isMissingTable = error?.code === 'PGRST205';
      if (isMissingTable) {
        const fallbackPayload = {
          user_id: user?.id || null,
          level: 'warn',
          category: 'event_report',
          message: `Report ${type} on ${eventId}`,
          data: {
            event_id: eventId,
            title: event.titre,
            reported_issue: type,
            event_year: getEventYear(event),
            source: 'scoreboard_modal',
          },
          platform: 'mobile',
        };

        const { error: fallbackError } = await (supabase.from('remote_debug_logs') as any).insert(
          fallbackPayload
        );

        if (!fallbackError) {
          Alert.alert(
            'Merci !',
            'Signalement reçu. Il a été enregistré temporairement côté maintenance.'
          );
          setSelectedEvent(null);
          return;
        }
      }

      throw error;
    } catch (err: any) {
      console.error('[SCOREBOARD REPORT ERROR]', err);
      Alert.alert("Erreur", "Impossible d'envoyer le signalement.");
    } finally {
      setIsReporting(false);
    }
  };
  // -----------------------------

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

    // Cas DD/MM/YYYY ou formats textuels contenant une année explicite
    const anyYearMatch = rawDate.match(/-?\d{4,6}/);
    if (anyYearMatch) {
      return parseInt(anyYearMatch[0], 10).toString();
    }

    // Extraction propre de l'année pour les formats YYYY-MM-DD (même négatifs)
    const match = rawDate.match(/^(-?\d+)-/);
    if (match) {
      return parseInt(match[1], 10).toString();
    }

    // Si c'est déjà une année simple "1926"
    if (/^-?\d+$/.test(rawDate)) {
      return parseInt(rawDate, 10).toString();
    }

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
            <View style={styles.eventDetailsImageContainer}>
              {selectedEvent.illustration_url ? (
                <Image
                  source={{ uri: selectedEvent.illustration_url }}
                  style={styles.eventDetailsImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.eventDetailsImage, styles.eventDetailsImageFallback]}>
                  <Ionicons name="image-outline" size={32} color="#6b7280" />
                  <Text style={styles.eventDetailsImageFallbackText}>Illustration indisponible</Text>
                </View>
              )}

              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.eventDetailsImageGradient}
              >
                <Text style={styles.eventDetailsDate}>{getEventYear(selectedEvent)}</Text>
                <Text style={styles.eventDetailsTitle}>{selectedEvent.titre}</Text>
              </LinearGradient>
            </View>

            <ScrollView style={styles.eventDetailsContent} contentContainerStyle={styles.eventDetailsContentInner}>
              <Text style={styles.eventDetailsDescription}>
                {selectedEvent.description_detaillee
                  ? selectedEvent.description_detaillee
                  : "Aucune description détaillée disponible pour cet événement historique."}
              </Text>
            </ScrollView>

            <View style={styles.eventDetailsFooter}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedEvent(null)}
              >
                <Text style={styles.closeButtonText}>Fermer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.reportSmallButton, isReporting && styles.reportSmallButtonDisabled]}
                onPress={() => handleReport(selectedEvent)}
                disabled={isReporting}
              >
                <Ionicons name="flag-outline" size={16} color="#b91c1c" />
                <Text style={styles.reportSmallText}>
                  {isReporting ? 'Envoi...' : 'Signaler une erreur'}
                </Text>
              </TouchableOpacity>
            </View>
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

              {/* Share Score Button */}
              <View style={styles.shareButtonContainer}>
                <ShareScoreButton
                  scoreData={{
                    score: currentScore,
                    mode: gameMode === 'precision' ? 'precision' : 'classique',
                    streak: currentScore, // For classic mode, score represents streak
                    timestamp: new Date(),
                    userStats,
                    bestStreak: personalBest,
                  }}
                  onShareComplete={(success, platform) => {
                    console.log('[SCOREBOARD] Share completed', {
                      success,
                      platform,
                      mode: gameMode,
                      score: currentScore,
                    });
                    if (success && onShareReward && !rewardClaimed) {
                        setRewardClaimed(true);
                        onShareReward();
                    }
                  }}
                />
              </View>

              <View style={styles.shareRewardTip}>
                <Ionicons name="gift" size={16} color={colors.accent} />
                <Text style={styles.shareRewardText}>Partage pour gagner +1 partie !</Text>
              </View>

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
    backgroundColor: '#ffffff',
    borderRadius: 18,
    width: '85%',
    maxWidth: 430,
    maxHeight: '75%',
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  eventDetailsImageContainer: {
    width: '100%',
    height: 210,
    backgroundColor: '#e5e7eb',
  },
  eventDetailsImage: {
    width: '100%',
    height: '100%',
  },
  eventDetailsImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  eventDetailsImageFallbackText: {
    fontSize: 13,
    color: '#4b5563',
    fontWeight: '600',
  },
  eventDetailsImageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  eventDetailsDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fbbf24',
    marginBottom: 4,
  },
  eventDetailsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  eventDetailsContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    maxHeight: '60%',
  },
  eventDetailsContentInner: {
    paddingBottom: 6,
  },
  eventDetailsDescription: {
    fontSize: 15,
    lineHeight: 23,
    color: '#444',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
  },
  closeButton: {
    backgroundColor: colors.primary,
    paddingVertical: 11,
    paddingHorizontal: 18,
    alignItems: 'center',
    borderRadius: 999,
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
  /* Styles partage */
  shareButtonContainer: {
    marginVertical: 10,
    paddingHorizontal: 20,
    width: '100%',
  },
  shareRewardTip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  shareRewardText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600',
  },
  
  /* Footer détails événement avec bouton de report discret */
  eventDetailsFooter: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'stretch',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  reportSmallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    gap: 6,
  },
  reportSmallButtonDisabled: {
    opacity: 0.6,
  },
  reportSmallText: {
    fontSize: 13,
    color: '#9f1239',
    fontWeight: '700',
  },
});

export default ScoreboardModal;
