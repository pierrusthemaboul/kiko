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
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../constants/Colors';
import type { LevelEventSummary, SpecialRules } from '@/hooks/types';
import { useImmersiveMode } from '@/hooks/useImmersiveMode';
import { supabase } from '@/lib/supabase/supabaseClients';

const { width } = Dimensions.get('window');

interface LevelUpModalBisProps {
  visible: boolean;
  level: number;
  onStart: () => void;
  onReturnToMenu?: () => void;
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

  // Si le parsing échoue, on tente un découpage (ex: "01 October 2022")
  const parts = rawDate.split(' ');
  if (parts.length >= 2) {
    return parts[parts.length - 1];
  }
  return rawDate;
}

export default function LevelUpModalBis({
  visible,
  level,
  onStart,
  onReturnToMenu,
  name,
  description,
  requiredEvents,
  specialRules,
  previousLevel,
  isNewLevel,
  eventsSummary,
}: LevelUpModalBisProps) {
  const { height, width } = useWindowDimensions();
  const isSmallScreen = width < 375 || height < 700;
  const { width: screenWidth } = Dimensions.get('window');

  // Activer le mode immersif quand la modale est visible
  useImmersiveMode(visible);

  // Animations
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const backgroundOpacityAnim = useRef(new Animated.Value(0)).current;
  const levelNumberAnim = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(50)).current;

  // State pour le popup d'un événement en particulier
  const [selectedEvent, setSelectedEvent] = useState<LevelEventSummary | null>(null);
  const [isReporting, setIsReporting] = useState(false);

  // State pour stocker uniquement les événements du niveau actuel/précédent
  const [filteredEvents, setFilteredEvents] = useState<LevelEventSummary[]>([]);

  const isValidUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  const sendReport = async (event: LevelEventSummary, type: string) => {
    const eventId = event.id;

    if (!isValidUuid(eventId)) {
      Alert.alert('Signalement impossible', "Identifiant d'événement invalide.");
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
        Alert.alert('Merci !', 'Signalement reçu. Nos historiens vont vérifier !');
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
            source: 'levelup_modal',
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
      console.error('[LEVELUP REPORT ERROR]', err);
      Alert.alert('Erreur', "Impossible d'envoyer le signalement.");
    } finally {
      setIsReporting(false);
    }
  };

  const handleReport = (event: LevelEventSummary) => {
    if (!event || !event.id) return;

    Alert.alert(
      'Historien, une erreur ?',
      `Voulez-vous signaler un problème sur "${event.titre}" ?`,
      [
        { text: '📅 Date fausse', onPress: () => sendReport(event, 'DATE_FAUSSE') },
        { text: '✍️ Titre / Texte', onPress: () => sendReport(event, 'DESCRIPTION_FAUSSE') },
        { text: '🖼️ Image', onPress: () => sendReport(event, 'IMAGE_INCOHERENTE') },
        { text: '❌ Autre / Doublon', onPress: () => sendReport(event, 'AUTRE') },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  // Fonction pour gérer le retour au menu avec confirmation
  const handleReturnToMenu = () => {
    Alert.alert(
      'Retour au menu',
      'Êtes-vous sûr de vouloir retourner au menu ? Votre partie en cours sera perdue.',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Retour au menu',
          style: 'destructive',
          onPress: () => {
            if (onReturnToMenu) {
              onReturnToMenu();
            }
          },
        },
      ]
    );
  };

  // Effect pour filtrer les événements spécifiques au niveau
  useEffect(() => {
    if (visible && eventsSummary && eventsSummary.length > 0) {

      // On filtre les événements pour n'afficher que ceux du niveau qui vient d'être terminé
      // Dans un level-up, previousLevel contient le niveau qui vient d'être terminé
      const targetLevel = previousLevel || (level > 1 ? level - 1 : level);

      // Limitons le nombre d'événements à afficher pour ce niveau
      // Une façon simple est de prendre seulement le nombre requis pour ce niveau
      const eventsLimit = Math.min(eventsSummary.length, requiredEvents);
      const recentEvents = eventsSummary.slice(-eventsLimit);

      setFilteredEvents(recentEvents);
    } else {
      if (visible) {

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
                  {event.illustration_url ? (
                    <Image
                      source={{ uri: event.illustration_url }}
                      style={styles.eventImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.eventImage, styles.eventImageFallback]}>
                      <Ionicons name="image-outline" size={24} color="#6b7280" />
                    </View>
                  )}
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
            {/* Bouton croix en haut à droite */}
            <TouchableOpacity
              style={styles.closeButtonX}
              onPress={() => setSelectedEvent(null)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>

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

            <ScrollView style={styles.eventDetailsContent}>
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
            isSmallScreen && styles.modalContentSmall,
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

            {/* Bouton retour au menu */}
            {onReturnToMenu && (
              <TouchableOpacity
                style={styles.menuButton}
                onPress={handleReturnToMenu}
                activeOpacity={0.7}
              >
                <Ionicons name="home-outline" size={20} color="#666" />
                <Text style={styles.menuButtonText}>Retour au menu</Text>
              </TouchableOpacity>
            )}
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
    width: '90%',
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  modalContentSmall: {
    width: '95%',
    padding: 16,
    maxHeight: '90%',
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
  eventImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
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
  closeButtonX: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
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
  eventDetailsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  eventDetailsDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fbbf24',
    marginBottom: 4,
  },
  eventDetailsContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    flexShrink: 1,
  },
  eventDetailsDescription: {
    fontSize: 15,
    lineHeight: 23,
    color: '#444',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
  },
  eventDetailsFooter: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'stretch',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
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
  // Style pour le message quand il n'y a pas d'événements
  noEventsText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  // Styles pour le bouton retour au menu
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 5,
    borderRadius: 10,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  menuButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

