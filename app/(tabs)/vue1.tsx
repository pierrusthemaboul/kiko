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

  // États pour les modals
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showScoreboard, setShowScoreboard] = useState(false);

  // État pour stocker le nom du joueur et son meilleur score
  const [playerName, setPlayerName] = useState<string>('Voyageur');
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [dailyScores, setDailyScores] = useState<Array<any>>([]);
  const [monthlyScores, setMonthlyScores] = useState<Array<any>>([]);
  const [allTimeScores, setAllTimeScores] = useState<Array<any>>([]);

  // Chargement des polices et animation
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

  // Récupération des infos du joueur et des scores
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // 1. Récupérer l'utilisateur connecté
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser?.id) {
          // 2. Récupérer le profil du joueur
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, high_score')
            .eq('id', authUser.id)
            .single();

          if (profile) {
            setPlayerName(profile.display_name || 'Joueur');
            setBestScore(profile.high_score || 0);
          }

          // 3. Récupérer les scores quotidiens
          const today = new Date().toISOString().split('T')[0];
          const { data: dailyData } = await supabase
            .from('game_scores')
            .select('display_name, score')
            .gte('created_at', today)
            .order('score', { ascending: false })
            .limit(5);

          if (dailyData) {
            setDailyScores(dailyData.map((item, index) => ({
              name: item.display_name,
              score: item.score,
              rank: index + 1
            })));
          }

          // 4. Récupérer les scores mensuels
          const firstDayOfMonth = `${today.substring(0, 7)}-01`;
          const { data: monthlyData } = await supabase
            .from('game_scores')
            .select('display_name, score')
            .gte('created_at', firstDayOfMonth)
            .order('score', { ascending: false })
            .limit(5);

          if (monthlyData) {
            setMonthlyScores(monthlyData.map((item, index) => ({
              name: item.display_name,
              score: item.score,
              rank: index + 1
            })));
          }

          // 5. Récupérer les meilleurs scores de tous les temps
          const { data: allTimeData } = await supabase
            .from('profiles')
            .select('display_name, high_score')
            .order('high_score', { ascending: false })
            .limit(5);

          if (allTimeData) {
            setAllTimeScores(allTimeData.map((item, index) => ({
              name: item.display_name,
              score: item.high_score || 0,
              rank: index + 1
            })));
          }
        }
      } catch (err) {
        console.error('Erreur lors de la récupération des données:', err);
      }
    };

    fetchUserData();
  }, []);

  // Rendu du modal des disclaimers
  const renderDisclaimerModal = () => (
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
              Malgré une grande attention portée à la vérification des dates, il est possible que quelques approximations ou erreurs subsistent. Ce jeu a vocation ludique et pédagogique.
            </Text>

            <Text style={styles.disclaimerTitle}>Illustrations générées par DALL·E</Text>
            <Text style={styles.disclaimerText}>
              Les images du jeu sont générées par DALL·E, ce qui peut entraîner des anachronismes ou des incohérences visuelles.
            </Text>

            <Text style={styles.disclaimerTitle}>Compte à rebours</Text>
            <Text style={styles.disclaimerText}>
              Pour chaque question, un compte à rebours de 20 secondes se déclenche afin de stimuler votre réactivité.
            </Text>
          </ScrollView>
          <TouchableOpacity style={styles.closeModalButton} onPress={() => setShowDisclaimer(false)}>
            <Text style={styles.closeModalText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Rendu du modal du tableau des scores
  const renderScoreboardModal = () => (
    <Modal
      transparent
      visible={showScoreboard}
      animationType="fade"
      onRequestClose={() => setShowScoreboard(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.scoreboardModal}>
          <Text style={styles.scoreboardTitle}>Tableau des scores</Text>
          
          {/* Onglets (simplifiés, juste pour montrer la structure) */}
          <View style={styles.tabsContainer}>
            <Text style={[styles.tabText, styles.activeTabText]}>Meilleurs scores</Text>
          </View>
          
          {/* Liste des scores */}
          <ScrollView style={styles.scoresListContainer}>
            {allTimeScores.length > 0 ? 
              allTimeScores.map((score, index) => (
                <View key={index} style={styles.scoreRow}>
                  <View style={styles.rankContainer}>
                    <Text style={styles.rankText}>#{score.rank}</Text>
                  </View>
                  <Text style={styles.playerNameScore} numberOfLines={1}>
                    {score.name}
                  </Text>
                  <Text style={styles.scoreValue}>{score.score.toLocaleString()}</Text>
                </View>
              )) : 
              <Text style={styles.noScoresText}>Aucun score disponible</Text>
            }
          </ScrollView>
          
          <TouchableOpacity style={styles.closeModalButton} onPress={() => setShowScoreboard(false)}>
            <Text style={styles.closeModalText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (!fontsLoaded) {
    return null;
  }

  // Tronquer le nom du joueur si nécessaire
  const truncatedName = playerName.length > 15 
    ? playerName.substring(0, 12) + '...' 
    : playerName;

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
            
            {/* Compteur et info */}
            <View style={styles.countdownInfo}>
              <Ionicons name="time-outline" size={20} color={THEME.accent} />
              <Text style={styles.countdownText}>
                Compte à rebours de 20 secondes par question
              </Text>
            </View>

            <AnimatedTimeline />

            {/* Section avec le nom du joueur et les boutons d'action */}
            <View style={styles.actionsContainer}>
              {/* Nom du joueur */}
              <View style={styles.playerContainer}>
                <Ionicons name="person" size={20} color={THEME.accent} />
                <Text style={styles.playerName}>Bonjour, {truncatedName}</Text>
              </View>
              
              {/* Boutons d'action */}
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => setShowScoreboard(true)}
                >
                  <Ionicons name="trophy-outline" size={24} color={THEME.accent} />
                  <Text style={styles.actionButtonText}>Scores</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => setShowDisclaimer(true)}
                >
                  <Ionicons name="information-circle-outline" size={24} color={THEME.accent} />
                  <Text style={styles.actionButtonText}>Info</Text>
                </TouchableOpacity>
              </View>
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

      {/* Modals */}
      {renderDisclaimerModal()}
      {renderScoreboardModal()}
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
    paddingBottom: 20,
    flexGrow: 1,
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
  countdownInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: `${THEME.accent}15`,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 15,
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
  
  // Conteneur pour le nom du joueur et les boutons d'action
  actionsContainer: {
    marginTop: 10,
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: `${THEME.accent}10`,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: `${THEME.accent}30`,
  },
  
  // Section pour le nom du joueur
  playerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: `${THEME.accent}20`
  },
  playerName: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 16,
    color: THEME.text,
    marginLeft: 8,
  },
  
  // Section pour les boutons d'action (Scores et Info)
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 6,
  },
  actionButtonText: {
    color: THEME.text,
    fontSize: 12,
    fontFamily: 'Montserrat-Medium',
    marginTop: 4,
  },

  footer: {
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
  
  // Styles pour les modals (disclaimer et scoreboard)
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
    maxHeight: '80%',
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
  
  // Modal du tableau des scores
  scoreboardModal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: THEME.background.medium,
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.accent,
    maxHeight: '80%',
  },
  scoreboardTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
    color: THEME.accent,
    marginBottom: 15,
    textAlign: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 15,
  },
  tabText: {
    fontSize: 14,
    color: THEME.text,
    fontFamily: 'Montserrat-Medium',
  },
  activeTabText: {
    color: THEME.accent,
    fontFamily: 'Montserrat-Bold',
  },
  scoresListContainer: {
    maxHeight: 300,
    marginBottom: 15,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 8,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.accent,
  },
  playerNameScore: {
    flex: 1,
    fontSize: 16,
    color: THEME.text,
    marginLeft: 10,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.accent,
    marginLeft: 10,
  },
  noScoresText: {
    color: THEME.text,
    textAlign: 'center',
    marginTop: 20,
    fontFamily: 'Montserrat-Regular',
  },
  
  // Bouton de fermeture pour les modals
  closeModalButton: {
    backgroundColor: THEME.accent,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 5,
  },
  closeModalText: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 16,
    color: THEME.background.dark,
  },
});