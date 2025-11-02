/************************************************************************************
 * LevelUpModalBis.tsx
 *
 * Modal de transition et présentation des niveaux avec récapitulatif des événements.
 ************************************************************************************/

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../constants/Colors'; 
import type { LevelEventSummary, SpecialRules } from '@/hooks/types'; 

const { width } = Dimensions.get('window');

interface LevelUpModalBisProps {
  visible: boolean;
  level: number;
  onStart: () => void;
  name: string;
  description: string;
  requiredEvents: number;
  specialRules?: SpecialRules[];
  previousLevel?: number;
  isNewLevel: boolean;
  eventsSummary: LevelEventSummary[] | undefined;
}

/**
 * Récupère l'année depuis l'événement.
 * On priorise le champ date_formatee puis date.
 * Si possible, on parse la date pour extraire l'année ; sinon, on tente un découpage.
 */
function getEventYear(event: LevelEventSummary): string {
  if (!event) return '';
  
  // On priorise la date formattée, sinon la date brute
  const rawDate = event.date_formatee || event.date;
  if (!rawDate) return '';

  const parsedDate = new Date(rawDate);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate.getFullYear().toString();
  }

  // Si le parsing échoue, on tente un découpage (ex: "01 October 2022")
  const parts = rawDate.split(' ');
  if (parts.length >= 2) {
    return parts[parts.length - 1];
  }
  return rawDate;
}

const LevelUpModalBis: React.FC<LevelUpModalBisProps> = ({
  visible,
  level,
  onStart,
  name,
  description,
  requiredEvents,
  specialRules,
  previousLevel,
  isNewLevel,
  eventsSummary
}) => {
  // Animations
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const backgroundOpacityAnim = useRef(new Animated.Value(0)).current;
  const levelNumberAnim = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(50)).current;

  // State pour le popup d'un événement en particulier
  const [selectedEvent, setSelectedEvent] = useState<LevelEventSummary | null>(null);

  // State pour stocker uniquement les événements du niveau actuel/précédent
  const [filteredEvents, setFilteredEvents] = useState<LevelEventSummary[]>([]);

  // Effect pour filtrer les événements spécifiques au niveau
  useEffect(() => {
    if (visible && eventsSummary && eventsSummary.length > 0) {
      console.log('[LEVEL_UP_MODAL] 🎯 Modal devenue visible, filtrage des événements:', {
        level,
        previousLevel,
        totalEventsSummary: eventsSummary.length,
        requiredEvents,
        isNewLevel,
      });
      // On filtre les événements pour n'afficher que ceux du niveau qui vient d'être terminé
      // Dans un level-up, previousLevel contient le niveau qui vient d'être terminé
      const targetLevel = previousLevel || (level > 1 ? level - 1 : level);

      // Limitons le nombre d'événements à afficher pour ce niveau
      // Une façon simple est de prendre seulement le nombre requis pour ce niveau
      const eventsLimit = Math.min(eventsSummary.length, requiredEvents);
      const recentEvents = eventsSummary.slice(-eventsLimit);
      console.log('[LEVEL_UP_MODAL] Événements filtrés:', {
        targetLevel,
        eventsLimit,
        filteredCount: recentEvents.length,
      });
      setFilteredEvents(recentEvents);
    } else {
      if (visible) {
        console.log('[LEVEL_UP_MODAL] Modal visible mais pas d\'événements à afficher');
      }
      setFilteredEvents([]);
    }
  }, [visible, eventsSummary, level, previousLevel, requiredEvents]);

  // Animation d'entrée
  useEffect(() => {
    if (visible) {
      // Reset des animations
      const resetAnimations = () => {
        scaleAnim.setValue(0.3);
        opacityAnim.setValue(0);
        backgroundOpacityAnim.setValue(0);
        levelNumberAnim.setValue(0);
        contentTranslateY.setValue(50);
        buttonScaleAnim.setValue(1);
      };

      resetAnimations();

      // Séquence d'animations
      Animated.sequence([
        Animated.timing(backgroundOpacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(contentTranslateY, {
            toValue: 0,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.spring(levelNumberAnim, {
            toValue: 1,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        startButtonAnimation();
      });
    }
  }, [visible, scaleAnim, opacityAnim, backgroundOpacityAnim, levelNumberAnim, contentTranslateY, buttonScaleAnim]);

  // Animation du bouton "GO!"
  const startButtonAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonScaleAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Rendu du bandeau de niveau
  const renderLevelUpBanner = () => {
    if (!previousLevel || !isNewLevel) return null;

    return (
      <Animated.View
        style={[
          styles.levelUpBanner,
          {
            transform: [
              { scale: levelNumberAnim },
              { translateY: contentTranslateY },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['#ff9966', '#ff5e62']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bannerGradient}
        >
          <Ionicons name="trophy" size={32} color="white" />
          <Text style={styles.levelUpText}>
            Bravo ! Niveau {previousLevel} terminé
          </Text>
        </LinearGradient>
      </Animated.View>
    );
  };

  // Rendu du récapitulatif des événements 
  const renderEventsSummary = () => {
    // Si pas d'événements, afficher un message explicite
    if (!filteredEvents || filteredEvents.length === 0) {
      return (
        <View style={styles.eventsSummaryContainer}>
          <Text style={styles.sectionTitle}>Événements du niveau</Text>
          <Text style={styles.noEventsText}>
            Aucun événement à afficher pour ce niveau.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.eventsSummaryContainer}>
        <Text style={styles.sectionTitle}>Événements du niveau</Text>

        {/* Texte d'indication pour toucher les événements */}
        <View style={styles.touchHintContainer}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={colors.primary}
          />
          <Text style={styles.touchHintText}>
            Touchez une carte pour plus de détails
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filteredEvents.map((event, index) => {
            // Créer une clé vraiment unique
            const eventKey = `event-level-${previousLevel || level}-id-${event.id || 'unknown'}-index-${index}`;
            
            return (
              <TouchableOpacity
                key={eventKey}
                onPress={() => setSelectedEvent(event)}
                activeOpacity={0.7}
                style={styles.eventCardTouchable}
              >
                <View style={styles.eventCard}>
                  <Image
                    source={{ uri: event.illustration_url }}
                    style={styles.eventImage}
                    resizeMode="cover"
                    // Fallback pour les images qui ne se chargent pas
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.eventGradient}
                  >
                    <Text style={styles.eventDate}>{getEventYear(event)}</Text>
                    <Text style={styles.eventTitle} numberOfLines={2}>
                      {event.titre}
                    </Text>
                    <View
                      style={[
                        styles.responseIndicator,
                        {
                          backgroundColor: event.wasCorrect
                            ? colors.correctGreen
                            : colors.incorrectRed,
                        },
                      ]}
                    >
                      <Ionicons
                        name={event.wasCorrect ? 'checkmark' : 'close'}
                        size={20}
                        color="white"
                      />
                    </View>
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // Rendu du modal de détails d'un événement
  const renderEventDetailsModal = () => {
    if (!selectedEvent) return null;

    return (
      <Modal
        transparent={true}
        visible={!!selectedEvent}
        onRequestClose={() => setSelectedEvent(null)}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.eventDetailsModal}>
            <View style={styles.eventDetailsHeader}>
              <Text style={styles.eventDetailsTitle}>
                {selectedEvent.titre}
              </Text>
              <Text style={styles.eventDetailsDate}>
                {getEventYear(selectedEvent)}
              </Text>
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

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View
        style={[styles.modalOverlay, { opacity: backgroundOpacityAnim }]}
      >
        <Animated.View
          style={[
            styles.modalContent,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }, { translateY: contentTranslateY }],
            },
          ]}
        >
          <ScrollView style={styles.scrollView}>
            {renderLevelUpBanner()}

            <Text style={styles.eventsInfo}>
              Niveau {level} : objectif {requiredEvents} événements
            </Text>

            {renderEventsSummary()}

            <Animated.View
              style={[
                styles.startButtonContainer,
                { transform: [{ scale: buttonScaleAnim }] },
              ]}
            >
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => {
                  console.log('[LEVEL_UP_MODAL] 👆 Bouton "Commencer" pressé, appel de handleLevelUp');
                  onStart();
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#ff9966', '#ff5e62']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Ionicons name="play" size={30} color="white" />
                  <Text style={styles.startButtonText}>GO !</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
          {renderEventDetailsModal()}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.85,
    maxHeight: '85%',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderWidth: 1,
    borderColor: '#ff5e62',
  },
  scrollView: {
    paddingHorizontal: 20,
  },
  levelUpBanner: {
    width: '100%',
    marginBottom: 20,
    borderRadius: 15,
    overflow: 'hidden',
    minHeight: 60,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  bannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    paddingHorizontal: 20,
    minHeight: 60,
  },
  levelUpText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginHorizontal: 10,
    textAlign: 'center',
    flexShrink: 1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  eventsInfo: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  touchHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(58, 123, 213, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 15,
  },
  touchHintText: {
    color: '#555',
    fontSize: 14,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  eventsSummaryContainer: {
    marginVertical: 20,
    width: '100%',
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
  startButtonContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  startButton: {
    width: '80%',
    maxWidth: 250,
    borderRadius: 30,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
  },
  startButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 10,
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
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
  // Style pour le message quand il n'y a pas d'événements
  noEventsText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
});

export default LevelUpModalBis;
