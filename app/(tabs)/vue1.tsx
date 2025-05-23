// /home/pierre/sword/kiko/app/(tabs)/vue1.tsx

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
  Modal,
  Image, // Keep Image if needed elsewhere, but not used in the provided snippet directly
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Import Supabase (chemin actuel)
import { supabase } from '../../lib/supabase/supabaseClients';

// Import Firebase Analytics utility
import { FirebaseAnalytics } from '../../lib/firebase'; // <-- AJOUTÉ

import useAdminStatus from '@/hooks/useAdminStatus';
import { useFonts } from '@/hooks/useFonts';

const { width, height } = Dimensions.get('window');

/*-------------------------------------------------------------
  Nouveau thème Saumon et tons neutres doux
---------------------------------------------------------------*/
const SALMON_THEME = {
  background: "#F6F5F3", // Gris très clair, légèrement texturé/chaud
  cardBackground: "#FFFFFF", // Blanc pur pour les cartes
  textPrimary: "#4A4A4A",    // Gris anthracite foncé (bon contraste avec saumon)
  textSecondary: "#888888", // Gris moyen pour textes secondaires
  textLight: "#FFFFFF",      // Texte blanc
  primaryAccent: "#FA8072", // Saumon (couleur principale)
  secondaryAccent: "#68C3AF",// Teal doux (pour contraste subtil ou infos)
  border: "#EAEAEA",       // Bordure gris très clair
  shadow: "rgba(74, 74, 74, 0.1)", // Ombre douce basée sur textPrimary
  success: "#58D68D",       // Vert doux
  warning: "#F5B041",       // Orange doux
  error: "#E57373",         // Rouge doux
  gold: "#E1AD01",          // Or légèrement mat
  silver: "#BDBDBD",        // Argent mat
  bronze: "#D39C7E",        // Bronze/Cuivre doux
};


/*-------------------------------------------------------------
  Composant de démonstration animé (avec boutons style jeu)
---------------------------------------------------------------*/
const DemoAnimation = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
      { iterations: -1 }
    ).start();
  }, [pulseAnim]);

  return (
    <View style={styles.demoContainer}>
      {/* Événement A */}
      <Animated.View style={[styles.demoCard, { transform: [{ scale: pulseAnim }] }]}>
        <View style={[styles.demoIconWrapper, { backgroundColor: SALMON_THEME.primaryAccent + '30', }]}>
          <Ionicons name="flag-outline" size={24} color={SALMON_THEME.primaryAccent} />
        </View>
        <Text style={styles.demoLabel}>Événement A (référence)</Text>
      </Animated.View>

       <View style={styles.demoSeparator} />

      {/* Événement B et Choix */}
      <View style={styles.demoCard}>
         <Text style={styles.demoLabel}>Événement B (à classer)</Text>
         {/* Utilisation du nouveau style de boutons */}
         <View style={styles.demoChoiceButtons}>
           <TouchableOpacity style={styles.demoChoiceButton}>
             <Ionicons name="arrow-back" size={20} color={SALMON_THEME.textLight} />
             <Text style={styles.demoChoiceText}>AVANT</Text>
           </TouchableOpacity>
           {/* Garder l'icône d'aide centrale distincte */}
           <View style={[styles.demoIconWrapper, { width: 40, height: 40, borderRadius: 20, backgroundColor: SALMON_THEME.warning + '30' }]}>
             <Ionicons name="help-circle-outline" size={24} color={SALMON_THEME.warning} />
           </View>
           <TouchableOpacity style={styles.demoChoiceButton}>
             <Text style={styles.demoChoiceText}>APRÈS</Text>
             <Ionicons name="arrow-forward" size={20} color={SALMON_THEME.textLight} />
           </TouchableOpacity>
         </View>
      </View>

      <Text style={styles.explanationText}>
        Devinez si l’Événement B est arrivé avant ou après l’Événement A.
      </Text>
    </View>
  );
};

/*-------------------------------------------------------------
  Composant principal : Vue d'explication ("Comment jouer ?")
---------------------------------------------------------------*/
export default function Vue1() {
  const router = useRouter();
  const { isAdmin } = useAdminStatus();
  const fontsLoaded = useFonts();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showScoreboard, setShowScoreboard] = useState(false);

  const [playerName, setPlayerName] = useState<string>('Voyageur');
  const [dailyBestScore, setDailyBestScore] = useState<number | null>(null);
  const [dailyRank, setDailyRank] = useState<number | null>(null);
  const [monthlyBestScore, setMonthlyBestScore] = useState<number | null>(null);
  const [monthlyRank, setMonthlyRank] = useState<number | null>(null);
  const [allTimeBestScore, setAllTimeBestScore] = useState<number | null>(null);
  const [allTimeRank, setAllTimeRank] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState<{ daily: number, monthly: number, allTime: number }>({
    daily: 0,
    monthly: 0,
    allTime: 0
  });
  const [dailyScores, setDailyScores] = useState<Array<any>>([]);
  const [monthlyScores, setMonthlyScores] = useState<Array<any>>([]);
  const [allTimeScores, setAllTimeScores] = useState<Array<any>>([]);
  const [activeScoreTab, setActiveScoreTab] = useState<'daily' | 'monthly' | 'allTime'>('allTime');

  useEffect(() => {
    if (fontsLoaded) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
      // Suivre la vue de l'écran une fois les polices chargées et l'animation démarrée
      FirebaseAnalytics.screen('HowToPlay', 'Vue1'); // <-- AJOUTÉ: Suivi de l'écran
    }
  }, [fontsLoaded, fadeAnim]); // fadeAnim ajouté aux dépendances pour lier le tracking à l'animation

   useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (authUser?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, high_score')
            .eq('id', authUser.id)
            .single();

          if (profile) {
            setPlayerName(profile.display_name || 'Joueur');
            setAllTimeBestScore(profile.high_score || 0);
          } else {
            setPlayerName('Joueur'); // Default name if profile not found
            setAllTimeBestScore(0);
          }


          // Fetch Daily Scores
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const { data: dailyData, count: dailyCount } = await supabase
            .from('game_scores')
            .select('display_name, score, user_id', { count: 'exact' })
            .gte('created_at', todayStart.toISOString())
            .order('score', { ascending: false })
            .limit(100);

          if (dailyData) {
            const userDailyEntry = dailyData.find(item => item.user_id === authUser.id);
            setDailyBestScore(userDailyEntry?.score || null);
            setDailyRank(userDailyEntry ? dailyData.findIndex(item => item.user_id === authUser.id) + 1 : null);
            setDailyScores(dailyData.slice(0, 10).map((item, index) => ({
              name: item.display_name, score: item.score, rank: index + 1, isCurrentUser: item.user_id === authUser.id
            })));
            setTotalPlayers(prev => ({ ...prev, daily: dailyCount || 0 }));
          } else {
              setDailyScores([]);
              setDailyBestScore(null);
              setDailyRank(null);
              setTotalPlayers(prev => ({ ...prev, daily: 0 }));
          }

          // Fetch Monthly Scores
          const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
          const { data: monthlyData, count: monthlyCount } = await supabase
            .from('game_scores')
            .select('display_name, score, user_id', { count: 'exact' })
            .gte('created_at', monthStart.toISOString())
            .order('score', { ascending: false })
            .limit(100);

          if (monthlyData) {
             const userMonthlyEntry = monthlyData.find(item => item.user_id === authUser.id);
             setMonthlyBestScore(userMonthlyEntry?.score || null);
             setMonthlyRank(userMonthlyEntry ? monthlyData.findIndex(item => item.user_id === authUser.id) + 1 : null);
             setMonthlyScores(monthlyData.slice(0, 10).map((item, index) => ({
               name: item.display_name, score: item.score, rank: index + 1, isCurrentUser: item.user_id === authUser.id
             })));
             setTotalPlayers(prev => ({ ...prev, monthly: monthlyCount || 0 }));
          } else {
              setMonthlyScores([]);
              setMonthlyBestScore(null);
              setMonthlyRank(null);
              setTotalPlayers(prev => ({ ...prev, monthly: 0 }));
          }

          // Fetch All-Time Scores (from profiles)
          const { data: allTimeData, count: allTimeCount } = await supabase
            .from('profiles')
            .select('id, display_name, high_score', { count: 'exact' })
            .not('high_score', 'is', null)
            .gt('high_score', 0)
            .order('high_score', { ascending: false })
            .limit(100);

          if (allTimeData) {
            // Find rank based on fetched ordered data
            const currentUserAllTimeRank = allTimeData.findIndex(item => item.id === authUser.id) + 1;
            setAllTimeRank(currentUserAllTimeRank > 0 ? currentUserAllTimeRank : null);
            // Use the high_score from the profile table, already fetched
            // setAllTimeBestScore is already set from profile data

            setAllTimeScores(allTimeData.slice(0, 10).map((item, index) => ({
              name: item.display_name, score: item.high_score, rank: index + 1, isCurrentUser: item.id === authUser.id
            })));
            setTotalPlayers(prev => ({ ...prev, allTime: allTimeCount || 0 }));
          } else {
              setAllTimeScores([]);
              // Keep allTimeBestScore from profile if exists, otherwise it's 0
              setAllTimeRank(null);
              setTotalPlayers(prev => ({ ...prev, allTime: 0 }));
          }
        } else {
           // Handle case where user is not logged in
           setPlayerName('Voyageur');
           setAllTimeBestScore(null);
           setDailyBestScore(null);
           setMonthlyBestScore(null);
           setDailyRank(null);
           setMonthlyRank(null);
           setAllTimeRank(null);
           setDailyScores([]);
           setMonthlyScores([]);
           setAllTimeScores([]);
           setTotalPlayers({ daily: 0, monthly: 0, allTime: 0 });
        }
      } catch (err) {
        console.error('Erreur lors de la récupération des données:', err);
        // Log error to Firebase
        FirebaseAnalytics.error('fetch_user_data_vue1', err instanceof Error ? err.message : 'Unknown error', 'Vue1'); // <-- AJOUTÉ: Suivi d'erreur
        // Reset state or show error message
           setPlayerName('Voyageur');
           setAllTimeBestScore(null); // Indicate error or loading state?
           // Reset other scores as well
           setDailyScores([]); setMonthlyScores([]); setAllTimeScores([]);
           setTotalPlayers({ daily: 0, monthly: 0, allTime: 0 });
      }
    };

    if (fontsLoaded) {
       fetchUserData();
    }
  }, [fontsLoaded]);


  const getScoresToDisplay = () => {
    switch (activeScoreTab) {
      case 'daily': return dailyScores;
      case 'monthly': return monthlyScores;
      case 'allTime': return allTimeScores;
      default: return [];
    }
  };

  // Updated renderRank function to add space
  const renderRank = (rank: number, isCurrentUser: boolean) => {
     let color = SALMON_THEME.textSecondary;
     if (rank === 1) color = SALMON_THEME.gold;
     else if (rank === 2) color = SALMON_THEME.silver;
     else if (rank === 3) color = SALMON_THEME.bronze;
     else if (isCurrentUser) color = SALMON_THEME.primaryAccent; // Highlight current user rank

     // Added space after #
     return <Text style={[styles.rankText, { color }]}># {rank}</Text>;
  }

  /*-------------------------------------------------------------
    Modals : Disclaimer & Scoreboard (Restylées)
  ---------------------------------------------------------------*/
  const renderDisclaimerModal = () => (
    <Modal
      transparent
      visible={showDisclaimer}
      animationType="fade"
      onRequestClose={() => setShowDisclaimer(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
             <Text style={styles.modalTitle}>Informations</Text>
             <TouchableOpacity onPress={() => setShowDisclaimer(false)} style={styles.modalCloseButton}>
                <Ionicons name="close-circle" size={28} color={SALMON_THEME.textSecondary} />
             </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.disclaimerSection}>
              <View style={styles.disclaimerTitleContainer}>
                <Ionicons name="alert-circle-outline" size={22} color={SALMON_THEME.warning} />
                <Text style={[styles.disclaimerTitle, {color: SALMON_THEME.warning}]}>Avertissement Dates</Text>
              </View>
              <Text style={styles.modalText}>
                Malgré une attention particulière à la vérification des dates, quelques approximations ou erreurs peuvent subsister. Ce jeu est avant tout ludique et pédagogique.
              </Text>
            </View>
            <View style={styles.modalDivider} />
            <View style={styles.disclaimerSection}>
              <View style={styles.disclaimerTitleContainer}>
                <Ionicons name="image-outline" size={22} color={SALMON_THEME.secondaryAccent} />
                <Text style={[styles.disclaimerTitle, {color: SALMON_THEME.secondaryAccent}]}>Illustrations DALL·E</Text>
              </View>
              <Text style={styles.modalText}>
                Les images du jeu sont générées par DALL·E, ce qui peut entraîner quelques incohérences visuelles.
              </Text>
            </View>
             <View style={styles.modalDivider} />
            <View style={styles.disclaimerSection}>
              <View style={styles.disclaimerTitleContainer}>
                <Ionicons name="timer-outline" size={22} color={SALMON_THEME.primaryAccent} />
                <Text style={[styles.disclaimerTitle, {color: SALMON_THEME.primaryAccent}]}>Compte à rebours</Text>
              </View>
              <Text style={styles.modalText}>
                Pour chaque question, un compte à rebours de 20 secondes se déclenche pour stimuler votre réactivité.
              </Text>
            </View>
          </ScrollView>
           <TouchableOpacity
              style={[styles.modalActionButton, {backgroundColor: SALMON_THEME.primaryAccent}]}
              onPress={() => setShowDisclaimer(false)}
            >
              <Text style={styles.modalActionButtonText}>Compris</Text>
            </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderScoreboardModal = () => {
    const currentScores = getScoresToDisplay();
    const userScore = activeScoreTab === 'daily' ? dailyBestScore : activeScoreTab === 'monthly' ? monthlyBestScore : allTimeBestScore;
    const userRank = activeScoreTab === 'daily' ? dailyRank : activeScoreTab === 'monthly' ? monthlyRank : allTimeRank;
    const total = activeScoreTab === 'daily' ? totalPlayers.daily : activeScoreTab === 'monthly' ? totalPlayers.monthly : totalPlayers.allTime;
    const scoreLabel = activeScoreTab === 'daily' ? "Votre meilleur score du jour" : activeScoreTab === 'monthly' ? "Votre meilleur score du mois" : "Votre meilleur score total";

    return (
      <Modal
        transparent
        visible={showScoreboard}
        animationType="fade"
        onRequestClose={() => setShowScoreboard(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Classement</Text>
               <TouchableOpacity onPress={() => setShowScoreboard(false)} style={styles.modalCloseButton}>
                 <Ionicons name="close-circle" size={28} color={SALMON_THEME.textSecondary} />
               </TouchableOpacity>
             </View>

            {/* User's score summary */}
            <View style={styles.playerScoreContainer}>
              {userScore !== null && userScore >= 0 ? ( // Check includes 0
                <>
                  <Text style={styles.scoreLabel}>{scoreLabel}</Text>
                  <Text style={styles.playerScoreValue}>{userScore.toLocaleString()}</Text>
                  {userRank !== null && userRank > 0 && total > 0 && (
                    <View style={styles.playerRankBadge}>
                      <Text style={styles.playerRankText}>
                        Rang # {userRank} / {total} {/* Added space here too */}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.noScoreYet}>Aucun score enregistré pour cette période.</Text>
              )}
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
              {['daily', 'monthly', 'allTime'].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, activeScoreTab === tab && styles.activeTab]}
                  onPress={() => {
                    const newTab = tab as 'daily' | 'monthly' | 'allTime';
                    // Seulement tracker si l'onglet change VRAIMENT
                    if (newTab !== activeScoreTab) {
                      FirebaseAnalytics.leaderboard(newTab); // <-- AJOUTÉ: Suivi du changement d'onglet
                    }
                    setActiveScoreTab(newTab);
                  }}
                >
                  <Ionicons
                    name={tab === 'daily' ? "today-outline" : tab === 'monthly' ? "calendar-outline" : "trophy-outline"}
                    size={20}
                    color={activeScoreTab === tab ? SALMON_THEME.primaryAccent : SALMON_THEME.textSecondary}
                  />
                  <Text style={[styles.tabText, activeScoreTab === tab && styles.activeTabText]}>
                    {tab === 'daily' ? 'Jour' : tab === 'monthly' ? 'Mois' : 'Total'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Scores List */}
            <ScrollView style={styles.scoresListContainer}>
              {currentScores.length > 0 ? (
                currentScores.map((score) => (
                  <View
                    key={`${score.rank}-${score.name}-${score.score}`} // More unique key
                    style={[
                      styles.scoreRow,
                      score.isCurrentUser && styles.currentPlayerScoreRow
                    ]}
                  >
                    <View style={styles.rankContainer}>
                       {/* renderRank now adds the space */}
                       {renderRank(score.rank, score.isCurrentUser)}
                    </View>
                    <Text
                      style={[styles.playerNameScore, score.isCurrentUser && styles.currentPlayerNameText]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {score.name}
                    </Text>
                    <Text style={[styles.scoreValue, score.isCurrentUser && styles.currentPlayerScoreText]}>
                      {score.score.toLocaleString()}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noScoresText}>Aucun classement disponible.</Text>
              )}
            </ScrollView>
             <TouchableOpacity
              style={[styles.modalActionButton, {backgroundColor: SALMON_THEME.primaryAccent}]}
              onPress={() => setShowScoreboard(false)}
            >
              <Text style={styles.modalActionButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  /*-------------------------------------------------------------
    Rendu principal (Restructuré pour éviter le scroll/overlap)
  ---------------------------------------------------------------*/
  const truncatedName = playerName && playerName.length > 15
    ? playerName.substring(0, 12) + '...'
    : playerName;

  if (!fontsLoaded) {
     return null; // Or loading indicator
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

         {/* Section Header (Admin buttons - optional) */}
         {isAdmin && (
          <View style={styles.header}>
             <TouchableOpacity style={styles.adminButton} onPress={() => router.push('/vue4')}>
                 <Ionicons name="images-outline" size={20} color={SALMON_THEME.secondaryAccent} />
                 <Text style={styles.adminButtonText}>Images</Text>
             </TouchableOpacity>
             <TouchableOpacity style={styles.adminButton} onPress={() => router.push('/vue5')}>
                 <Ionicons name="settings-outline" size={20} color={SALMON_THEME.secondaryAccent} />
                 <Text style={styles.adminButtonText}>Admin</Text>
             </TouchableOpacity>
          </View>
         )}

        {/* Section Contenu Principal */}
        <ScrollView contentContainerStyle={styles.contentScrollView} showsVerticalScrollIndicator={false}>
            {/* Carte Titre */}
            <View style={styles.titleCard}>
              <Text style={styles.title}>Comment jouer ?</Text>
              <View style={styles.countdownInfo}>
                <Ionicons name="time-outline" size={16} color={SALMON_THEME.primaryAccent} />
                <Text style={styles.countdownText}>
                  20 secondes par question
                </Text>
              </View>
            </View>

            {/* Démo */}
            <DemoAnimation />

            {/* Carte Infos Joueur & Actions */}
            <View style={styles.actionsCard}>
              <View style={styles.playerInfoContainer}>
                  <Ionicons name="person-circle-outline" size={24} color={SALMON_THEME.primaryAccent} />
                  <Text style={styles.playerName}>Bienvenue, {truncatedName || 'Joueur'}</Text>
              </View>
              {allTimeBestScore !== null && allTimeBestScore >= 0 && ( // Allow 0 score display
                <View style={styles.bestScoreContainer}>
                  <Ionicons name="ribbon-outline" size={20} color={SALMON_THEME.primaryAccent} />
                  <Text style={styles.bestScoreText}>
                    Meilleur score : {allTimeBestScore.toLocaleString()}
                  </Text>
                </View>
              )}
               <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                        // Tracker la vue initiale du classement (qui est 'allTime' par défaut)
                        FirebaseAnalytics.leaderboard('allTime'); // <-- AJOUTÉ: Suivi ouverture classement
                        setShowScoreboard(true);
                    }}
                  >
                    <Ionicons name="trophy-outline" size={22} color={SALMON_THEME.secondaryAccent} />
                    <Text style={styles.actionButtonText}>Scores</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                        FirebaseAnalytics.disclaimer(); // <-- AJOUTÉ: Suivi vue disclaimer
                        setShowDisclaimer(true);
                    }}
                  >
                    <Ionicons name="information-circle-outline" size={22} color={SALMON_THEME.secondaryAccent} />
                    <Text style={styles.actionButtonText}>Infos</Text>
                  </TouchableOpacity>
               </View>
            </View>
         </ScrollView>


        {/* Section Footer (toujours en bas) */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => {
                const isGuestPlayer = !playerName || playerName === 'Voyageur' || playerName.startsWith('Voyageur-'); // Vérif si invité
                const nameToSend = playerName || 'Anonymous';
                FirebaseAnalytics.gameStarted(nameToSend, isGuestPlayer, 1); // <-- AJOUTÉ: Suivi début de partie (niv 1)
                router.push('/game/page'); // Assurez-vous que la route est correcte
            }}
          >
            <Text style={styles.startButtonText}>COMMENCER</Text>
            <Ionicons name="play-circle-outline" size={24} color={SALMON_THEME.textLight} />
          </TouchableOpacity>
        </View>

      </Animated.View>

      {/* Modals */}
      {renderDisclaimerModal()}
      {renderScoreboardModal()}
    </SafeAreaView>
  );
}


/*-------------------------------------------------------------
  Styles (Refonte complète - Thème Saumon - Boutons jeu démo)
---------------------------------------------------------------*/
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SALMON_THEME.background,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 50,
    paddingHorizontal: 15,
    paddingBottom: 15,
    backgroundColor: SALMON_THEME.background,
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'android' ? StatusBar.currentHeight + 5 : 45,
    right: 15,
    flexDirection: 'row',
    zIndex: 10,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SALMON_THEME.cardBackground + 'E6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: SALMON_THEME.border,
  },
  adminButtonText: {
    marginLeft: 5,
    fontSize: 14,
    color: SALMON_THEME.secondaryAccent,
    fontFamily: 'Montserrat-Medium',
  },
  contentScrollView: {
     paddingBottom: 20,
  },

  /* --- Cartes Principales --- */
  titleCard: {
    backgroundColor: SALMON_THEME.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SALMON_THEME.border,
    shadowColor: SALMON_THEME.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Montserrat-Bold',
    color: SALMON_THEME.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  countdownInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SALMON_THEME.primaryAccent + '1A',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
  },
  countdownText: {
    color: SALMON_THEME.primaryAccent,
    fontSize: 14,
    marginLeft: 8,
    fontFamily: 'Montserrat-Medium',
  },

  /* --- Démo Mécanisme --- */
  demoContainer: {
    backgroundColor: SALMON_THEME.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SALMON_THEME.border,
    shadowColor: SALMON_THEME.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  demoCard: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
    // Last card in demo might not need margin bottom if separator is enough
    // &:last-child { marginBottom: 0 } // CSS concept, adjust manually if needed
  },
   demoIconWrapper: {
     width: 50,
     height: 50,
     borderRadius: 25,
     justifyContent: 'center',
     alignItems: 'center',
     marginBottom: 10,
     backgroundColor: SALMON_THEME.primaryAccent + '20',
   },
   demoLabel: {
     color: SALMON_THEME.textPrimary,
     fontSize: 16,
     fontFamily: 'Montserrat-SemiBold',
     textAlign: 'center',
     marginBottom: 10,
   },
  demoSeparator: {
     width: '60%',
     height: 1,
     backgroundColor: SALMON_THEME.border,
     marginVertical: 15,
  },
  demoChoiceButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around', // Space between buttons and central icon
    width: '90%', // Limit width slightly
    marginTop: 10,

  },
  // Style pour les boutons AVANT/APRES dans la démo (inspiré du jeu)
  demoChoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)', // Fond sombre semi-transparent
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25, // Arrondi important
    minWidth: 100, // Assure une largeur minimale
    justifyContent: 'center', // Centre le contenu
  },
  demoChoiceText: {
    color: SALMON_THEME.textLight, // Texte blanc
    fontSize: 14,
    fontFamily: 'Montserrat-Bold',
    marginHorizontal: 6, // Espace entre icône et texte
  },
  explanationText: {
    fontSize: 14,
    fontFamily: 'Montserrat-Regular',
    color: SALMON_THEME.textSecondary,
    textAlign: 'center',
    marginTop: 15,
    paddingHorizontal: 10,
  },

  /* --- Carte Actions/Infos Joueur --- */
  actionsCard: {
    backgroundColor: SALMON_THEME.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SALMON_THEME.border,
    shadowColor: SALMON_THEME.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
   playerInfoContainer: {
     flexDirection: 'row',
     alignItems: 'center',
     marginBottom: 10,
   },
   playerName: {
     fontFamily: 'Montserrat-SemiBold',
     fontSize: 18,
     color: SALMON_THEME.textPrimary,
     marginLeft: 8,
   },
   bestScoreContainer: {
     flexDirection: 'row',
     alignItems: 'center',
     marginBottom: 15,
     backgroundColor: SALMON_THEME.primaryAccent + '1A',
     paddingVertical: 6,
     paddingHorizontal: 12,
     borderRadius: 15,
   },
   bestScoreText: {
     fontFamily: 'Montserrat-Medium',
     fontSize: 14,
     color: SALMON_THEME.primaryAccent,
     marginLeft: 8,
   },
   actionButtonsRow: {
     flexDirection: 'row',
     justifyContent: 'space-around',
     width: '100%',
     marginTop: 10,
   },
   actionButton: {
     alignItems: 'center',
     backgroundColor: SALMON_THEME.cardBackground,
     paddingVertical: 10,
     paddingHorizontal: 15,
     borderRadius: 8,
     borderWidth: 1,
     borderColor: SALMON_THEME.border,
     flex: 1,
     marginHorizontal: 5,
   },
   actionButtonText: {
     color: SALMON_THEME.secondaryAccent,
     fontSize: 14,
     fontFamily: 'Montserrat-SemiBold',
     marginTop: 5,
   },

  /* --- Footer --- */
  footer: {
    paddingTop: 10,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: SALMON_THEME.primaryAccent,
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '60%',
    elevation: 4,
    shadowColor: SALMON_THEME.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  startButtonText: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    color: SALMON_THEME.textLight,
    marginRight: 10,
  },

  /*==================== Modals (Style Saumon) ====================*/
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(74, 74, 74, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    backgroundColor: SALMON_THEME.cardBackground,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: SALMON_THEME.border,
    backgroundColor: SALMON_THEME.background,
  },
  modalTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 20,
    color: SALMON_THEME.textPrimary,
  },
   modalCloseButton: {
     padding: 5,
   },
   modalContent: {
      paddingHorizontal: 20,
      paddingTop: 15,
      paddingBottom: 10,
   },
   modalText: {
     fontFamily: 'Montserrat-Regular',
     fontSize: 15,
     color: SALMON_THEME.textSecondary,
     lineHeight: 22,
   },
   modalDivider: {
     height: 1,
     backgroundColor: SALMON_THEME.border,
     marginVertical: 15,
   },
   modalActionButton: {
      margin: 20,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      backgroundColor: SALMON_THEME.primaryAccent,
   },
   modalActionButtonText: {
      color: SALMON_THEME.textLight,
      fontSize: 16,
      fontFamily: 'Montserrat-Bold',
   },

   /* Disclaimer Specific */
   disclaimerSection: {
     marginBottom: 10,
   },
   disclaimerTitleContainer: {
     flexDirection: 'row',
     alignItems: 'center',
     marginBottom: 8,
   },
   disclaimerTitle: {
     fontFamily: 'Montserrat-SemiBold',
     fontSize: 16,
     marginLeft: 10,
     // Couleur définie dans le composant pour correspondre à l'icône
   },

   /* Scoreboard Specific */
   playerScoreContainer: {
     alignItems: 'center',
     paddingVertical: 15,
     paddingHorizontal: 20,
     borderBottomWidth: 1,
     borderBottomColor: SALMON_THEME.border,
   },
   scoreLabel: {
     fontSize: 14,
     color: SALMON_THEME.textSecondary,
     marginBottom: 5,
     fontFamily: 'Montserrat-Regular',
   },
   playerScoreValue: {
     fontSize: 32,
     fontFamily: 'Montserrat-Bold',
     color: SALMON_THEME.primaryAccent,
     marginBottom: 5,
   },
   playerRankBadge: {
     backgroundColor: SALMON_THEME.primaryAccent + '1A',
     paddingVertical: 4,
     paddingHorizontal: 10,
     borderRadius: 12,
     marginTop: 5,
   },
   playerRankText: {
     color: SALMON_THEME.primaryAccent,
     fontSize: 13,
     fontFamily: 'Montserrat-SemiBold',
   },
   noScoreYet: {
     fontFamily: 'Montserrat-Regular',
     fontSize: 14,
     color: SALMON_THEME.textSecondary,
     paddingVertical: 20,
   },
   noScoresText: {
     color: SALMON_THEME.textSecondary,
     textAlign: 'center',
     marginTop: 20,
     marginBottom: 20,
     fontFamily: 'Montserrat-Regular',
     fontSize: 14,
   },
   tabsContainer: {
     flexDirection: 'row',
     borderBottomWidth: 1,
     borderBottomColor: SALMON_THEME.border,
     backgroundColor: SALMON_THEME.background,
   },
   tab: {
     flex: 1,
     alignItems: 'center',
     justifyContent: 'center',
     paddingVertical: 12,
     borderBottomWidth: 3,
     borderBottomColor: 'transparent',
   },
   activeTab: {
     borderBottomColor: SALMON_THEME.primaryAccent,
   },
   tabText: {
     fontSize: 14,
     fontFamily: 'Montserrat-Medium',
     color: SALMON_THEME.textSecondary,
     marginTop: 4,
   },
   activeTabText: {
     color: SALMON_THEME.primaryAccent,
     fontFamily: 'Montserrat-SemiBold',
   },
   scoresListContainer: {
     maxHeight: height * 0.35,
   },
   scoreRow: {
     flexDirection: 'row',
     alignItems: 'center',
     paddingVertical: 12,
     borderBottomWidth: 1,
     borderBottomColor: SALMON_THEME.border + '80',
   },
   currentPlayerScoreRow: {
     backgroundColor: SALMON_THEME.primaryAccent + '10',
   },
   rankContainer: {
     width: 45, // Ensure enough space for "# XX"
     alignItems: 'flex-start',
   },
   // Style pour le texte du rang (# X)
   rankText: {
     fontSize: 14,
     paddingLeft: 5,
     fontFamily: 'Montserrat-SemiBold',
     textAlign: 'left', // Aligner à gauche dans son conteneur
     // La couleur est définie dynamiquement dans renderRank
   },
   playerNameScore: {
     flex: 1,
     fontSize: 15,
     fontFamily: 'Montserrat-Regular',
     color: SALMON_THEME.textPrimary,
     marginHorizontal: 10,
   },
   currentPlayerNameText: {
     fontFamily: 'Montserrat-SemiBold',
     color: SALMON_THEME.primaryAccent,
   },
   scoreValue: {
     fontSize: 15,
     fontFamily: 'Montserrat-Medium',
     color: SALMON_THEME.textPrimary,
     minWidth: 70,
     paddingRight: 5,
     textAlign: 'right',
   },
   currentPlayerScoreText: {
     fontFamily: 'Montserrat-SemiBold',
     color: SALMON_THEME.primaryAccent,
   },
});