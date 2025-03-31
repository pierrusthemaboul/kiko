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

// Thème harmonisé avec LevelUpModalBis et ScoreboardModal
const THEME = {
  primary: '#3a7bd5', // Bleu principal plus vif
  secondary: '#344955', // Bleu gris pour les éléments secondaires
  accent: '#ff5e62', // Rouge-orangé pour les accents
  gold: '#FFD700',    // Or pour les badges et titres
  text: '#FFFFFF',    // Texte clair
  dark: '#1A1A2E',    // Fond très sombre
  background: {
    dark: '#0f1a34',   // Dégradé fond - début (bleu nuit très foncé)
    medium: '#152a4a', // Dégradé fond - milieu (bleu nuit moins foncé)
    light: '#224777',  // Dégradé fond - fin (bleu marine)
  },
  button: {
    primary: ['#3a7bd5', '#2c5282'], // Bleu principal → sombre
    secondary: ['#ff5e62', '#ff9966'], // Dégradé rouge-orange
    tertiary: ['#3C6382', '#0a3d62'], // Bleu alternatif
  },
  scoreColors: {
    gold: '#FFD700',
    silver: '#C0C0C0',
    bronze: '#CD7F32',
    highlight: '#3a7bd5',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'rgba(255, 255, 255, 0.2)',
  }
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
          <Ionicons name="flag" size={24} color={THEME.gold} />
        </View>
        <Text style={styles.eventText}>Événement de référence</Text>
      </Animated.View>
      <Animated.View style={[styles.eventContainer, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.choiceButtons}>
          <TouchableOpacity style={styles.choiceButton}>
            <Ionicons name="arrow-back" size={20} color={THEME.gold} />
            <Text style={styles.choiceText}>AVANT</Text>
          </TouchableOpacity>
          <View style={styles.eventIcon}>
            <Ionicons name="help" size={24} color={THEME.gold} />
          </View>
          <TouchableOpacity style={styles.choiceButton}>
            <Text style={styles.choiceText}>APRÈS</Text>
            <Ionicons name="arrow-forward" size={20} color={THEME.gold} />
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
          {icon && <Ionicons name={icon} size={24} color={THEME.text} style={styles.buttonIcon} />}
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

  // État pour stocker le nom du joueur et ses scores
  const [playerName, setPlayerName] = useState<string>('Voyageur');
  // Scores et rangs pour chaque catégorie
  const [dailyBestScore, setDailyBestScore] = useState<number | null>(null);
  const [dailyRank, setDailyRank] = useState<number | null>(null);
  const [monthlyBestScore, setMonthlyBestScore] = useState<number | null>(null);
  const [monthlyRank, setMonthlyRank] = useState<number | null>(null);
  const [allTimeBestScore, setAllTimeBestScore] = useState<number | null>(null);
  const [allTimeRank, setAllTimeRank] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState<{daily: number, monthly: number, allTime: number}>({
    daily: 0,
    monthly: 0,
    allTime: 0
  });
  const [dailyScores, setDailyScores] = useState<Array<any>>([]);
  const [monthlyScores, setMonthlyScores] = useState<Array<any>>([]);
  const [allTimeScores, setAllTimeScores] = useState<Array<any>>([]);
  
  // État pour l'onglet actif du tableau des scores
  const [activeScoreTab, setActiveScoreTab] = useState<'daily' | 'monthly' | 'allTime'>('allTime');

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
            setAllTimeBestScore(profile.high_score || 0);
          }

          // 3. Récupérer les scores quotidiens
          const today = new Date().toISOString().split('T')[0];
          const { data: dailyData, count: dailyCount } = await supabase
            .from('game_scores')
            .select('display_name, score, user_id', { count: 'exact' })
            .gte('created_at', today)
            .order('score', { ascending: false });

          if (dailyData) {
            // Stocker les scores du top 5
            const topDailyScores = dailyData.slice(0, 5).map((item, index) => ({
              name: item.display_name,
              score: item.score,
              rank: index + 1,
              isCurrentUser: item.user_id === authUser.id
            }));
            setDailyScores(topDailyScores);
            
            // Mettre à jour le nombre total de joueurs aujourd'hui
            setTotalPlayers(prev => ({ ...prev, daily: dailyCount || 0 }));
            
            // Trouver le meilleur score du joueur actuel pour aujourd'hui
            const userDailyScore = dailyData.find(item => item.user_id === authUser.id);
            if (userDailyScore) {
              setDailyBestScore(userDailyScore.score);
              // Trouver le rang du joueur (position dans la liste triée)
              const userRank = dailyData.findIndex(item => item.user_id === authUser.id) + 1;
              setDailyRank(userRank);
            }
          }

          // 4. Récupérer les scores mensuels
          const firstDayOfMonth = `${today.substring(0, 7)}-01`;
          const { data: monthlyData, count: monthlyCount } = await supabase
            .from('game_scores')
            .select('display_name, score, user_id', { count: 'exact' })
            .gte('created_at', firstDayOfMonth)
            .order('score', { ascending: false });

          if (monthlyData) {
            // Stocker les scores du top 5
            const topMonthlyScores = monthlyData.slice(0, 5).map((item, index) => ({
              name: item.display_name,
              score: item.score,
              rank: index + 1,
              isCurrentUser: item.user_id === authUser.id
            }));
            setMonthlyScores(topMonthlyScores);
            
            // Mettre à jour le nombre total de joueurs ce mois
            setTotalPlayers(prev => ({ ...prev, monthly: monthlyCount || 0 }));
            
            // Trouver le meilleur score du joueur actuel pour ce mois
            const userMonthlyScore = monthlyData.find(item => item.user_id === authUser.id);
            if (userMonthlyScore) {
              setMonthlyBestScore(userMonthlyScore.score);
              // Trouver le rang du joueur (position dans la liste triée)
              const userRank = monthlyData.findIndex(item => item.user_id === authUser.id) + 1;
              setMonthlyRank(userRank);
            }
          }

          // 5. Récupérer les meilleurs scores de tous les temps
          const { data: allTimeData, count: allTimeCount } = await supabase
            .from('profiles')
            .select('id, display_name, high_score', { count: 'exact' })
            .gt('high_score', 0) // seulement les profils avec un score > 0
            .order('high_score', { ascending: false });

          if (allTimeData) {
            // Stocker les scores du top 5
            const topAllTimeScores = allTimeData.slice(0, 5).map((item, index) => ({
              name: item.display_name,
              score: item.high_score || 0,
              rank: index + 1,
              isCurrentUser: item.id === authUser.id
            }));
            setAllTimeScores(topAllTimeScores);
            
            // Mettre à jour le nombre total de joueurs ayant un score
            setTotalPlayers(prev => ({ ...prev, allTime: allTimeCount || 0 }));
            
            // Trouver le rang du joueur actuel (si score > 0)
            if (profile?.high_score && profile.high_score > 0) {
              const userRank = allTimeData.findIndex(item => item.id === authUser.id) + 1;
              if (userRank > 0) setAllTimeRank(userRank);
            }
          }
        }
      } catch (err) {
        console.error('Erreur lors de la récupération des données:', err);
      }
    };

    fetchUserData();
  }, []);

  // Sélection des scores à afficher en fonction de l'onglet actif
  const getScoresToDisplay = () => {
    switch (activeScoreTab) {
      case 'daily':
        return dailyScores;
      case 'monthly':
        return monthlyScores;
      case 'allTime':
        return allTimeScores;
      default:
        return [];
    }
  };

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
          <LinearGradient
            colors={['#243B55', '#141E30']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.modalHeader}
          >
            <Text style={styles.disclaimerMainTitle}>Informations</Text>
          </LinearGradient>
          
          <ScrollView contentContainerStyle={styles.disclaimerContent}>
            <View style={styles.disclaimerSection}>
              <View style={styles.disclaimerTitleContainer}>
                <Ionicons name="alert-circle-outline" size={20} color={THEME.accent} />
                <Text style={styles.disclaimerTitle}>Avertissement</Text>
              </View>
              <Text style={styles.disclaimerText}>
                Malgré une grande attention portée à la vérification des dates, il est possible que quelques approximations ou erreurs subsistent. Ce jeu a vocation ludique et pédagogique.
              </Text>
            </View>

            <View style={styles.disclaimerDivider} />

            <View style={styles.disclaimerSection}>
              <View style={styles.disclaimerTitleContainer}>
                <Ionicons name="image-outline" size={20} color={THEME.accent} />
                <Text style={styles.disclaimerTitle}>Illustrations générées par DALL·E</Text>
              </View>
              <Text style={styles.disclaimerText}>
                Les images du jeu sont générées par DALL·E, ce qui peut entraîner des anachronismes ou des incohérences visuelles.
              </Text>
            </View>

            <View style={styles.disclaimerDivider} />

            <View style={styles.disclaimerSection}>
              <View style={styles.disclaimerTitleContainer}>
                <Ionicons name="timer-outline" size={20} color={THEME.accent} />
                <Text style={styles.disclaimerTitle}>Compte à rebours</Text>
              </View>
              <Text style={styles.disclaimerText}>
                Pour chaque question, un compte à rebours de 20 secondes se déclenche afin de stimuler votre réactivité.
              </Text>
            </View>
          </ScrollView>
          
          <TouchableOpacity 
            style={styles.closeModalButton} 
            onPress={() => setShowDisclaimer(false)}
          >
            <LinearGradient
              colors={THEME.button.secondary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modalButtonGradient}
            >
              <Text style={styles.closeModalText}>Fermer</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Rendu du modal du tableau des scores
  const renderScoreboardModal = () => {
    const currentScores = getScoresToDisplay();
    
    return (
      <Modal
        transparent
        visible={showScoreboard}
        animationType="fade"
        onRequestClose={() => setShowScoreboard(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.scoreboardModal}>
            <LinearGradient
              colors={['#243B55', '#141E30']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.modalHeader}
            >
              <Text style={styles.scoreboardTitle}>Classement</Text>
            </LinearGradient>
            
            {/* Affichage du meilleur score du joueur avec son rang, selon l'onglet actif */}
            <View style={styles.playerScoreContainer}>
              {activeScoreTab === 'daily' ? (
                dailyBestScore ? (
                  <>
                    <Text style={styles.scoreLabel}>Votre meilleur score aujourd'hui</Text>
                    <Text style={styles.playerScoreValue}>{dailyBestScore.toLocaleString()}</Text>
                    {dailyRank && (
                      <View style={styles.playerRankBadge}>
                        <Text style={styles.playerRankText}>
                          Rang #{dailyRank} sur {totalPlayers.daily}
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={styles.noScoreYet}>Aucun score aujourd'hui</Text>
                )
              ) : activeScoreTab === 'monthly' ? (
                monthlyBestScore ? (
                  <>
                    <Text style={styles.scoreLabel}>Votre meilleur score du mois</Text>
                    <Text style={styles.playerScoreValue}>{monthlyBestScore.toLocaleString()}</Text>
                    {monthlyRank && (
                      <View style={styles.playerRankBadge}>
                        <Text style={styles.playerRankText}>
                          Rang #{monthlyRank} sur {totalPlayers.monthly}
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={styles.noScoreYet}>Aucun score ce mois-ci</Text>
                )
              ) : (
                allTimeBestScore ? (
                  <>
                    <Text style={styles.scoreLabel}>Votre meilleur score</Text>
                    <Text style={styles.playerScoreValue}>{allTimeBestScore.toLocaleString()}</Text>
                    {allTimeRank && (
                      <View style={styles.playerRankBadge}>
                        <Text style={styles.playerRankText}>
                          Rang #{allTimeRank} sur {totalPlayers.allTime}
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={styles.noScoreYet}>Aucun score enregistré</Text>
                )
              )}
            </View>
            
            {/* Onglets: Jour / Mois / Total */}
            <View style={styles.tabsContainer}>
              <TouchableOpacity 
                style={[styles.tab, activeScoreTab === 'daily' && styles.activeTab]}
                onPress={() => setActiveScoreTab('daily')}
              >
                <Ionicons 
                  name="calendar-outline" 
                  size={22} 
                  color={activeScoreTab === 'daily' ? THEME.gold : THEME.text} 
                />
                <Text style={[styles.tabText, activeScoreTab === 'daily' && styles.activeTabText]}>
                  Jour
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.tab, activeScoreTab === 'monthly' && styles.activeTab]}
                onPress={() => setActiveScoreTab('monthly')}
              >
                <Ionicons 
                  name="calendar" 
                  size={22} 
                  color={activeScoreTab === 'monthly' ? THEME.gold : THEME.text} 
                />
                <Text style={[styles.tabText, activeScoreTab === 'monthly' && styles.activeTabText]}>
                  Mois
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.tab, activeScoreTab === 'allTime' && styles.activeTab]}
                onPress={() => setActiveScoreTab('allTime')}
              >
                <Ionicons 
                  name="trophy" 
                  size={22} 
                  color={activeScoreTab === 'allTime' ? THEME.gold : THEME.text} 
                />
                <Text style={[styles.tabText, activeScoreTab === 'allTime' && styles.activeTabText]}>
                  Total
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Liste des scores */}
            <ScrollView style={styles.scoresListContainer}>
              {currentScores.length > 0 ? (
                currentScores.map((score, index) => {
                  const isCurrentPlayer = score.name === playerName;
                  
                  // Couleur de rang selon la position
                  let rankColor = THEME.text;
                  if (score.rank === 1) rankColor = THEME.scoreColors.gold;
                  else if (score.rank === 2) rankColor = THEME.scoreColors.silver;
                  else if (score.rank === 3) rankColor = THEME.scoreColors.bronze;
                  else if (isCurrentPlayer) rankColor = THEME.scoreColors.highlight;
                  
                  return (
                    <View 
                      key={index} 
                      style={[
                        styles.scoreRow,
                        isCurrentPlayer && styles.currentPlayerScoreRow
                      ]}
                    >
                      <View style={styles.rankContainer}>
                        <Text style={[styles.rankText, { color: rankColor }]}>
                          #{score.rank}
                        </Text>
                      </View>
                      <Text 
                        style={[
                          styles.playerNameScore, 
                          isCurrentPlayer && styles.currentPlayerNameText
                        ]} 
                        numberOfLines={1}
                      >
                        {score.name}
                      </Text>
                      <Text 
                        style={[
                          styles.scoreValue,
                          isCurrentPlayer && styles.currentPlayerScoreText
                        ]}
                      >
                        {score.score.toLocaleString()}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.noScoresText}>Aucun score disponible</Text>
              )}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowScoreboard(false)}
            >
              <LinearGradient
                colors={THEME.button.secondary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modalButtonGradient}
              >
                <Text style={styles.closeModalText}>Fermer</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

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
          <Animated.View 
            style={[
              styles.content, 
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.titleCard}
            >
              <Text style={styles.title}>Comment jouer ?</Text>
              
              {/* Compteur et info */}
              <View style={styles.countdownInfo}>
                <Ionicons name="time-outline" size={18} color="#FFF" />
                <Text style={styles.countdownText}>
                  Compte à rebours de 20 secondes par question
                </Text>
              </View>
            </LinearGradient>

            <AnimatedTimeline />

            {/* Section avec le nom du joueur et les boutons d'action */}
            <LinearGradient
              colors={['rgba(58, 123, 213, 0.2)', 'rgba(58, 123, 213, 0.05)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.actionsContainer}
            >
              {/* Nom du joueur */}
              <View style={styles.playerContainer}>
                <Ionicons name="person" size={18} color={THEME.gold} />
                <Text style={styles.playerName}>Bienvenue, {truncatedName}</Text>
              </View>
              
              {/* Conteneur pour highscore */}
              {allTimeBestScore && allTimeBestScore > 0 && (
                <View style={styles.bestScoreContainer}>
                  <Ionicons name="ribbon-outline" size={18} color={THEME.gold} />
                  <Text style={styles.bestScoreText}>
                    Meilleur score: {allTimeBestScore.toLocaleString()}
                  </Text>
                </View>
              )}
              
              {/* Boutons d'action */}
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => setShowScoreboard(true)}
                >
                  <LinearGradient
                    colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)']}
                    style={styles.actionButtonGradient}
                  >
                    <Ionicons name="trophy-outline" size={24} color={THEME.gold} />
                    <Text style={styles.actionButtonText}>Scores</Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => setShowDisclaimer(true)}
                >
                  <LinearGradient
                    colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)']}
                    style={styles.actionButtonGradient}
                  >
                    <Ionicons name="information-circle-outline" size={24} color={THEME.gold} />
                    <Text style={styles.actionButtonText}>Info</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Bouton COMMENCER */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => router.push('/game/page')}
            >
              <LinearGradient
                colors={THEME.button.secondary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.startButtonGradient}
              >
                <Text style={styles.startButtonText}>COMMENCER</Text>
                <Ionicons name="play" size={24} color={THEME.text} />
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
  titleCard: {
    borderRadius: 15,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  title: {
    fontSize: 32,
    fontFamily: 'Montserrat-Bold',
    color: THEME.gold,
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  countdownInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  countdownText: {
    color: THEME.text,
    fontSize: 14,
    marginLeft: 8,
    fontFamily: 'Montserrat-Regular',
  },
  timelineContainer: {
    width: '100%',
    paddingVertical: 25,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    top: '50%',
    left: 40,
    right: 40,
    height: 2,
    backgroundColor: THEME.gold,
    opacity: 0.4,
  },
  eventContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  eventIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1d3557', // Bleu foncé différent du fond
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.gold,
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
    backgroundColor: '#1d3557',  // Bleu foncé légèrement différent du fond
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.gold,
  },
  choiceText: {
    color: THEME.text,
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
    marginHorizontal: 5,
  },
  
  // Conteneur pour le nom du joueur et les boutons d'action
  actionsContainer: {
    borderRadius: 15,
    marginTop: 5,
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  
  // Section pour le nom du joueur
  playerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)'
  },
  playerName: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 16,
    color: THEME.text,
    marginLeft: 8,
  },
  
  // Conteneur pour le meilleur score
  bestScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)'
  },
  bestScoreText: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 15,
    color: THEME.gold,
    marginLeft: 8,
  },
  
  // Section pour les boutons d'action (Scores et Info)
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  actionButton: {
    flex: 1,
    maxWidth: '45%',
    marginHorizontal: 5,
  },
  actionButtonGradient: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)', // Bordure légèrement dorée
  },
  actionButtonText: {
    color: THEME.text,
    fontSize: 14,
    fontFamily: 'Montserrat-Medium',
    marginTop: 6,
  },

  footer: {
    marginTop: 10,
  },
  startButton: {
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
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
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    color: THEME.text,
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
  
  // Styles communs pour les modals
  modalHeader: {
    width: '100%',
    padding: 15,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Styles pour le modal disclaimer
  disclaimerModal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: THEME.background.medium,
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    maxHeight: '80%',
  },
  disclaimerMainTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
    color: THEME.text,
    textAlign: 'center',
  },
  disclaimerContent: {
    padding: 20,
  },
  disclaimerSection: {
    marginBottom: 10,
  },
  disclaimerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  disclaimerTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 16,
    color: THEME.accent,
    marginLeft: 8,
  },
  disclaimerText: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    color: THEME.text,
    marginBottom: 5,
    lineHeight: 20,
  },
  disclaimerDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 10,
  },
  
  // Modal du tableau des scores
  scoreboardModal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: THEME.background.medium,
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    maxHeight: '80%',
  },
  scoreboardTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
    color: THEME.text,
    textAlign: 'center',
  },
  playerScoreContainer: {
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  scoreLabel: {
    fontSize: 14,
    color: THEME.text,
    marginBottom: 5,
    fontFamily: 'Montserrat-Regular',
  },
  playerScoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: THEME.gold,
    marginBottom: 5,
  },
  playerRankBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)', // Or semi-transparent
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginTop: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  playerRankText: {
    color: THEME.text,
    fontSize: 14,
    fontFamily: 'Montserrat-Medium',
  },
  noScoreYet: {
    color: THEME.text,
    fontSize: 16,
    fontFamily: 'Montserrat-Medium',
    textAlign: 'center',
    padding: 10,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: 4,
    margin: 15,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 6,
  },
  activeTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabText: {
    fontSize: 14,
    color: THEME.text,
    fontFamily: 'Montserrat-Medium',
  },
  activeTabText: {
    color: THEME.gold,
    fontFamily: 'Montserrat-Bold',
  },
  scoresListContainer: {
    maxHeight: 250,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    marginBottom: 6,
  },
  currentPlayerScoreRow: {
    backgroundColor: 'rgba(58, 123, 213, 0.3)',
    borderWidth: 1,
    borderColor: THEME.gold,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  playerNameScore: {
    flex: 1,
    fontSize: 15,
    color: THEME.text,
    marginLeft: 10,
  },
  currentPlayerNameText: {
    color: THEME.gold,
    fontWeight: 'bold',
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.gold,
    marginLeft: 10,
  },
  currentPlayerScoreText: {
    color: THEME.gold,
    fontWeight: 'bold',
  },
  noScoresText: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 20,
    fontFamily: 'Montserrat-Regular',
  },
  
  // Bouton de fermeture pour les modals
  closeModalButton: {
    margin: 15,
    borderRadius: 10,
    overflow: 'hidden',
  },
  closeModalText: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 16,
    color: THEME.text,
  },
});