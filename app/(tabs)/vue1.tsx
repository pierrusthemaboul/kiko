import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Import Supabase (chemin actuel)
import { supabase } from '../../lib/supabase/supabaseClients';

import useAdminStatus from '@/hooks/useAdminStatus';
import { useFonts } from '@/hooks/useFonts';

const { width } = Dimensions.get('window');

// Thème pour cette vue (identique au design principal)
const THEME = {
  primary: '#050B1F',
  secondary: '#0A173D',
  accent: '#FFCC00',
  text: '#FFFFFF',
  background: {
    dark: '#020817',
    medium: '#050B1F',
    light: '#0A173D',
  },
  button: {
    primary: ['#1D5F9E', '#0A173D'],
    secondary: ['#FFBF00', '#CC9900'],
    tertiary: ['#0A173D', '#1D5F9E'],
  },
};

// Composant du timeline animé
const AnimatedTimeline = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.timelineContainer, { opacity: opacityAnim }]}>
      <View style={styles.timelineLine} />
      <Animated.View style={[styles.eventContainer, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.eventIcon}>
          <Ionicons name="flag" size={24} color={THEME.accent} />
        </View>
        <Text style={styles.eventText}>Événement de référence</Text>
      </Animated.View>
      <Animated.View style={[styles.eventContainer, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.choiceButtons}>
          <TouchableOpacity style={styles.choiceButton}>
            <Ionicons name="arrow-back" size={20} color={THEME.accent} />
            <Text style={styles.choiceText}>AVANT</Text>
          </TouchableOpacity>
          <View style={styles.eventIcon}>
            <Ionicons name="help" size={24} color={THEME.accent} />
          </View>
          <TouchableOpacity style={styles.choiceButton}>
            <Text style={styles.choiceText}>APRÈS</Text>
            <Ionicons name="arrow-forward" size={20} color={THEME.accent} />
          </TouchableOpacity>
        </View>
        <Text style={styles.eventText}>Nouvel événement</Text>
      </Animated.View>
    </Animated.View>
  );
};

// Composant du bouton animé
const AnimatedButton = ({
  onPress,
  label,
  icon,
  variant = 'primary',
  disabled = false,
}: {
  onPress: () => void;
  label: string;
  icon?: string;
  variant?: string;
  disabled?: boolean;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const getGradientColors = () => {
    switch (variant) {
      case 'secondary':
        return THEME.button.secondary;
      case 'tertiary':
        return THEME.button.tertiary;
      default:
        return THEME.button.primary;
    }
  };

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      style={styles.buttonWrapper}
    >
      <Animated.View style={[styles.buttonContainer, { transform: [{ scale }] }]}>
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.buttonGradient}
        >
          {icon && <Ionicons name={icon} size={24} color={THEME.accent} style={styles.buttonIcon} />}
          <Text style={styles.buttonText}>{label}</Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function Vue1() {
  const router = useRouter();
  const { isAdmin } = useAdminStatus();
  const fontsLoaded = useFonts();

  // Animation d'apparition
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // État pour afficher le modal des disclaimers
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  // État local pour stocker le meilleur score du joueur
  const [bestScore, setBestScore] = useState<number | null>(null);

  // Chargement des polices
  useEffect(() => {
    if (fontsLoaded) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [fontsLoaded]);

  // Récupération du meilleur score du joueur (filtré par user_id)
  useEffect(() => {
    const fetchBestScore = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.id) {
          const { data, error } = await supabase
            .from('game_scores')
            .select('score')
            .eq('user_id', authUser.id)
            .order('score', { ascending: false })
            .limit(1)
            .single();

          if (!error && data) {
            setBestScore(data.score);
          }
        }
      } catch (err) {
        // En cas d'erreur, bestScore reste null
      }
    };
    fetchBestScore();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <LinearGradient
        colors={[THEME.background.dark, THEME.background.medium, THEME.background.light]}
        style={styles.container}
      >
        {isAdmin && (
          <View style={styles.header}>
            <AnimatedButton
              icon="images-outline"
              label="Images"
              onPress={() => router.push('/vue4')}
              variant="tertiary"
            />
            <AnimatedButton
              icon="settings-outline"
              label="Admin"
              onPress={() => router.push('/vue5')}
              variant="tertiary"
            />
          </View>
        )}

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.title}>Comment jouer ?</Text>
            <Text style={styles.subtitle}>
              Testez vos connaissances historiques en replaçant les événements dans leur contexte temporel.
            </Text>

            {/* Indication du compte à rebours */}
            <View style={styles.countdownInfo}>
              <Ionicons name="time-outline" size={20} color={THEME.accent} />
              <Text style={styles.countdownText}>
                Attention, un compte à rebours de 20 secondes se déclenche pour chaque question !
              </Text>
            </View>

            <AnimatedTimeline />

            {/* Section pour afficher le meilleur score du joueur au-dessus de l'icône d'info */}
            <View style={styles.infoContainer}>
              {bestScore !== null && (
                <Text style={styles.bestScoreText}>Votre meilleur score: {bestScore}</Text>
              )}
              <TouchableOpacity onPress={() => setShowDisclaimer(true)} style={styles.infoButton}>
                <Ionicons name="information-circle-outline" size={28} color={THEME.accent} />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Bouton COMMENCER */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => router.push('/game/page')}
            >
              <LinearGradient
                colors={THEME.button.secondary}
                style={styles.startButtonGradient}
              >
                <Text style={styles.startButtonText}>COMMENCER</Text>
                <Ionicons name="arrow-forward" size={24} color={THEME.text} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>

      {/* Modal Disclaimers */}
      <Modal
        transparent
        visible={showDisclaimer}
        animationType="fade"
        onRequestClose={() => setShowDisclaimer(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.disclaimerModal}>
            <ScrollView contentContainerStyle={styles.disclaimerContent}>
              <Text style={styles.disclaimerTitle}>Avertissement</Text>
              <Text style={styles.disclaimerText}>
                Malgré une grande attention portée à la vérification des dates, il est possible que quelques approximations ou erreurs subsistent. Ce jeu a vocation ludique et pédagogique et ne doit pas être considéré comme une source officielle d’informations historiques.
              </Text>

              <Text style={styles.disclaimerTitle}>Illustrations générées par DALL·E</Text>
              <Text style={styles.disclaimerText}>
                Les images du jeu sont générées par DALL·E, ce qui peut entraîner des anachronismes ou des incohérences visuelles. Nous remercions DALL·E pour cette technologie innovante.
              </Text>

              <Text style={styles.disclaimerTitle}>Compte à rebours</Text>
              <Text style={styles.disclaimerText}>
                Pour chaque question, un compte à rebours de 20 secondes se déclenche afin de stimuler votre réactivité. Veillez à répondre dans les délais pour maximiser votre score.
              </Text>
            </ScrollView>
            <TouchableOpacity style={styles.closeDisclaimerButton} onPress={() => setShowDisclaimer(false)}>
              <Text style={styles.closeDisclaimerText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.background.dark,
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    // Réduction du paddingBottom pour que le bouton apparaisse un peu plus haut
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 10,
  },
  content: {
    width: '100%',
    marginTop: 30,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Montserrat-Bold',
    color: THEME.accent,
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: `${THEME.accent}40`,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Montserrat-Regular',
    color: THEME.text,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  countdownInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  countdownText: {
    color: THEME.text,
    fontSize: 14,
    marginLeft: 8,
    fontFamily: 'Montserrat-Regular',
  },
  timelineContainer: {
    width: '100%',
    paddingVertical: 40,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    top: '50%',
    left: 40,
    right: 40,
    height: 2,
    backgroundColor: THEME.accent,
    opacity: 0.3,
  },
  eventContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  eventIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: `${THEME.accent}20`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${THEME.accent}50`,
    marginBottom: 10,
  },
  eventText: {
    color: THEME.text,
    fontSize: 16,
    fontFamily: 'Montserrat-Medium',
    textAlign: 'center',
  },
  choiceButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  choiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${THEME.accent}10`,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${THEME.accent}30`,
  },
  choiceText: {
    color: THEME.accent,
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
    marginHorizontal: 5,
  },

  // Zone info: meilleur score du joueur affiché au-dessus de l'icône d'info
  infoContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    // On réduit un peu le marginTop global et on conserve un marginBottom
    marginTop: 10,
    marginBottom: 20,
  },
  // On augmente l'espace entre le texte du score et l'icône d'info
  bestScoreText: {
    marginBottom: 15,
    fontFamily: 'Montserrat-Bold',
    color: THEME.accent,
    fontSize: 16,
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },

  footer: {
    // On diminue la marge top pour remonter le bouton
    marginTop: 10,
  },
  startButton: {
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: THEME.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    alignSelf: 'center',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 25,
    gap: 10,
  },
  startButtonText: {
    color: THEME.text,
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
  },
  buttonWrapper: {
    marginVertical: 10,
  },
  buttonContainer: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 25,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: THEME.text,
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  disclaimerModal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: THEME.background.medium,
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.accent,
  },
  disclaimerContent: {
    paddingBottom: 20,
  },
  disclaimerTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 16,
    color: THEME.accent,
    marginBottom: 5,
  },
  disclaimerText: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    color: THEME.text,
    marginBottom: 15,
    lineHeight: 20,
  },
  closeDisclaimerButton: {
    backgroundColor: THEME.button.secondary[0],
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeDisclaimerText: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 16,
    color: THEME.text,
  },
});
