import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Animated,
  StyleSheet,
  Platform,
  StatusBar,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Components
import UserInfo, { UserInfoHandle } from './UserInfo';
import Countdown from './Countdown';
import EventLayoutA from './EventLayoutA'; // Assurez-vous que ce chemin est correct
import LevelUpModalBis from '../modals/LevelUpModalBis';
import ScoreboardModal from '../modals/ScoreboardModal';
import RewardAnimation from './RewardAnimation';

// Types & Constants
import { colors } from '@/constants/Colors';
import type {
  User,
  Event,
  ExtendedLevelConfig,
  RewardType,
  LevelEventSummary,
} from '@/hooks/types'; // Assurez-vous que ce chemin est correct

// Interface pour l'historique des niveaux (si non définie ailleurs)
interface LevelHistory {
  level: number;
  events: LevelEventSummary[];
}

// --- Interface pour l'état publicitaire attendu ---
// (Doit correspondre à ce qui est retourné par useGameLogicA)
interface AdStateForContent {
    hasRewardedAd: boolean;         // La pub récompensée est-elle chargée ?
    hasWatchedRewardedAd: boolean;  // L'a-t-on déjà regardée dans cette partie ?
    isAdFree?: boolean;             // Optionnel: Période sans pub active ?
    // Ajoutez d'autres clés si nécessaire
}

// --- Interface des Props Mises à Jour ---
interface GameContentAProps {
  user: User | null; // Peut être null pendant le chargement initial
  timeLeft: number;
  loading: boolean; // Chargement global (géré par GamePage maintenant)
  error: string | null;
  previousEvent: Event | null;
  newEvent: Event | null; // Event potentiel (peut-être moins utile ici maintenant)
  displayedEvent: Event | null; // Événement ACTUELLEMENT affiché à droite
  isGameOver: boolean;
  leaderboardsReady: boolean; // Ajouté
  showDates: boolean;
  isCorrect?: boolean;
  isImageLoaded: boolean;
  handleChoice: (choice: 'avant' | 'après') => void; // Type plus strict
  handleImageLoad: () => void;
  handleRestartOrClose: () => void; // Renommé
  streak: number;
  highScore: number;
  level: number; // Déjà présent via user, mais gardé pour clarté si utilisé directement
  fadeAnim: Animated.Value;
  showLevelModal: boolean;
  isLevelPaused: boolean;
  handleLevelUp: () => void;
  currentLevelConfig: ExtendedLevelConfig;
  currentReward: {
    type: RewardType;
    amount: number;
    targetPosition?: { x: number; y: number };
  } | null;
  completeRewardAnimation: () => void;
  updateRewardPosition: (position: { x: number; y: number }) => void;
  leaderboards?: {
    daily: Array<{ name: string; score: number; rank: number }>;
    monthly: Array<{ name: string; score: number; rank: number }>;
    allTime: Array<{ name: string; score: number; rank: number }>;
  };
  levelCompletedEvents: LevelEventSummary[];
  levelsHistory: LevelHistory[];
  showRewardedAd?: () => boolean; // La fonction pour déclencher la pub
  adState: AdStateForContent; // AJOUTÉ : L'état publicitaire simplifié
  // isAdFreePeriod?: boolean; // Supprimé, car inclus dans adState
}

function GameContentA({
  user,
  timeLeft,
  // loading, // 'loading' de useGameLogicA n'est plus nécessaire ici, géré par GamePage
  error,
  previousEvent,
  // newEvent, // Moins utile ici, displayedEvent est l'événement actif
  displayedEvent, // NOUVEAU
  isGameOver,
  leaderboardsReady, // NOUVEAU
  showDates,
  isCorrect,
  isImageLoaded,
  handleChoice,
  handleImageLoad,
  handleRestartOrClose, // RENOMMÉ
  streak,
  highScore,
  level,
  fadeAnim,
  showLevelModal,
  isLevelPaused,
  handleLevelUp,
  currentLevelConfig,
  currentReward,
  completeRewardAnimation,
  updateRewardPosition,
  leaderboards,
  levelCompletedEvents,
  levelsHistory,
  showRewardedAd,
  adState, // NOUVEAU
}: GameContentAProps) {
  const router = useRouter();
  const userInfoRef = useRef<UserInfoHandle>(null);
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const [isRewardPositionSet, setIsRewardPositionSet] = useState(false);

  // --- États pour gérer l'affichage conditionnel de fin de partie ---
  // 1. Faut-il montrer l'offre "Regarder une pub ?"
  const [showWatchAdOffer, setShowWatchAdOffer] = useState(false);
  // 2. Faut-il montrer le tableau des scores final ?
  const [showScoreboard, setShowScoreboard] = useState(false);

  const isInitialRenderRef = useRef(true); // Pour l'animation d'EventLayoutA

  // --- LOGS DE DÉBOGAGE ---
  useEffect(() => {
    console.log("[DEBUG GameContentA] Component (re)mounted or key props changed");
    console.log("[DEBUG GameContentA] isGameOver:", isGameOver);
    console.log("[DEBUG GameContentA] user:", user ? `${user.name} (lives: ${user.lives})` : "null");
    console.log("[DEBUG GameContentA] adState:", adState);
    console.log("[DEBUG GameContentA] showWatchAdOffer:", showWatchAdOffer);
    console.log("[DEBUG GameContentA] showScoreboard:", showScoreboard);
  }, [isGameOver, user, adState, showWatchAdOffer, showScoreboard]);

  // --- Effet pour obtenir la position des éléments pour l'animation de récompense ---
  useEffect(() => {
    // (Logique inchangée pour la position de la récompense)
    let mounted = true;
    const updateRewardPositionSafely = async () => {
      if (!currentReward || !userInfoRef.current || !mounted || !user) return; // Ajout check user
      try {
        const position = currentReward.type === RewardType.EXTRA_LIFE
          ? await userInfoRef.current.getLifePosition()
          : await userInfoRef.current.getPointsPosition();
        // Vérifie explicitement que position et ses coordonnées sont valides
        if (mounted && position && typeof position.x === 'number' && typeof position.y === 'number') {
          if (!currentReward.targetPosition || currentReward.targetPosition.x !== position.x || currentReward.targetPosition.y !== position.y) {
            updateRewardPosition(position);
            setIsRewardPositionSet(true);
          }
        } else if (mounted) {
             console.warn("[GameContentA] getPosition returned invalid value:", position);
             setIsRewardPositionSet(false); // Marquer comme non défini si la position est invalide
        }
      } catch (e){
          console.warn("[GameContentA] Could not get element position for reward animation:", e);
        setIsRewardPositionSet(false);
      }
    };

    // Tenter immédiatement et après un court délai si la première tentative échoue
    updateRewardPositionSafely();
    const timer = setTimeout(() => {
      if (mounted && currentReward && !isRewardPositionSet) {
        updateRewardPositionSafely();
      }
    }, 250); // Léger délai augmenté

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [currentReward, updateRewardPosition, user]); // Ajout de user car userInfoRef dépend de son rendu

  // --- Animation d'opacité pour le modal de niveau ---
  useEffect(() => {
    // (Logique inchangée)
    if (showLevelModal) {
      Animated.sequence([
        Animated.timing(contentOpacity, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        Animated.timing(contentOpacity, { toValue: 1, duration: 300, delay: 1000, useNativeDriver: true }),
      ]).start();
    } else {
        contentOpacity.setValue(1);
    }
  }, [showLevelModal, contentOpacity]);

  // --- Effet pour gérer la fin de partie et l'offre de publicité ---
  useEffect(() => {
    console.log("[DEBUG GameContentA] ===== Game Over Effect Triggered =====");
    console.log("[DEBUG GameContentA] isGameOver:", isGameOver);
    console.log("[DEBUG GameContentA] user:", user ? `Name: ${user.name}, Lives: ${user.lives}, Points: ${user.points}` : "null");
    console.log("[DEBUG GameContentA] adState:", JSON.stringify(adState));
    
    // Conditions pour déclencher la logique de fin : le jeu est terminé ET l'utilisateur est défini
    if (isGameOver && user) {
      console.log("[DEBUG GameContentA] Game Over detected with valid user");

      // Vérifier si on peut proposer une pub récompensée
      // (seulement si l'utilisateur n'a pas déjà regardé une pub dans cette partie)
      const canOfferAd =
        user.lives === 0 &&               // A 0 vie
        showRewardedAd &&                 // La fonction existe
        adState.hasRewardedAd &&          // La pub est chargée
        !adState.hasWatchedRewardedAd;    // Pas déjà regardée
      
      console.log("[DEBUG GameContentA] Can offer ad?", canOfferAd);
      console.log("[DEBUG GameContentA] - Lives === 0?", user.lives === 0);
      console.log("[DEBUG GameContentA] - showRewardedAd exists?", !!showRewardedAd);
      console.log("[DEBUG GameContentA] - hasRewardedAd?", adState.hasRewardedAd);
      console.log("[DEBUG GameContentA] - !hasWatchedRewardedAd?", !adState.hasWatchedRewardedAd);

      if (canOfferAd) {
        console.log("[DEBUG GameContentA] CONDITIONS MET: Showing watch ad offer dialog");
        setShowWatchAdOffer(true);  
        setShowScoreboard(false); 
      } else if (user.lives === 0) { // On affiche le scoreboard si le joueur n'a plus de vie, même s'il a déjà vu une pub
        console.log("[DEBUG GameContentA] No more lives. Showing Scoreboard directly");
        console.log("[DEBUG GameContentA] Current leaderboardsReady state:", leaderboardsReady);
        console.log("[DEBUG GameContentA] Has leaderboards data?", !!leaderboards);
        setShowWatchAdOffer(false);
        setShowScoreboard(true);
      } else {
        // Si l'utilisateur a encore des vies (cas qui ne devrait pas arriver)
        console.log("[DEBUG GameContentA] EDGE CASE: User still has lives but game is over? Hiding both ad offer and scoreboard.");
        setShowWatchAdOffer(false);
        setShowScoreboard(false);
      }
    } else if (!isGameOver) {
      // Si le jeu n'est pas terminé, s'assurer que l'offre et le scoreboard sont cachés
      console.log("[DEBUG GameContentA] Game NOT over - hiding watch ad offer and scoreboard");
      setShowWatchAdOffer(false);
      setShowScoreboard(false);
    } else {
      console.log("[DEBUG GameContentA] Game over but no valid user - cannot proceed with end game logic");
    }
    
    console.log("[DEBUG GameContentA] ===== End of Game Over Effect =====");
  }, [isGameOver, user, adState, showRewardedAd, leaderboardsReady, leaderboards]); // Ajout des dépendances pour le log

  // --- EFFET DE SURVEILLANCE pour le changement d'état des flags d'affichage ---
  useEffect(() => {
    console.log("[DEBUG GameContentA] Display flags changed:");
    console.log("[DEBUG GameContentA] - showWatchAdOffer:", showWatchAdOffer);
    console.log("[DEBUG GameContentA] - showScoreboard:", showScoreboard);
  }, [showWatchAdOffer, showScoreboard]);

  // --- Effet pour surveiller ScoreboardModal ---
  useEffect(() => {
    console.log("[DEBUG GameContentA] ScoreboardModal visibility condition changed:");
    console.log("[DEBUG GameContentA] - isGameOver && showScoreboard:", isGameOver && showScoreboard);
  }, [isGameOver, showScoreboard]);

  // --- Effet pour marquer la fin du premier rendu significatif ---
  useEffect(() => {
    // (Logique inchangée)
    if (previousEvent && displayedEvent && isInitialRenderRef.current) {
      const timer = setTimeout(() => {
        console.log("[GameContentA] Premier set d'événements chargé. Marqué comme non-initial pour les suivants.");
        isInitialRenderRef.current = false;
      }, 0);
      return () => clearTimeout(timer);
    }
    // Optionnel: Réinitialiser si les événements disparaissent (ex: redémarrage)
    if (!previousEvent && !displayedEvent && !error && user) { // Vérifier user pour éviter reset prématuré
       // console.log("[GameContentA] Événements remis à zéro. Réinitialisation de isInitialRenderRef à true.");
       // isInitialRenderRef.current = true; // Attention, cela pourrait causer des animations non désirées si mal géré
    }
  }, [previousEvent, displayedEvent, error, user]); // 'loading' enlevé car géré par parent

  // --- Fonctions pour gérer l'interaction avec l'offre de publicité ---
  const handleWatchAd = () => {
    console.log("[DEBUG GameContentA] User accepted watch ad offer");
    if (showRewardedAd) {
      const adTriggered = showRewardedAd(); // Tente d'afficher la pub
      console.log("[DEBUG GameContentA] showRewardedAd() returned:", adTriggered);
      if (adTriggered) {
        // Si la tentative est faite, on cache l'offre. La reprise est gérée par useAds.
        setShowWatchAdOffer(false);
      } else {
        // Si showRewardedAd retourne false (ex: erreur interne, pub déchargée entre temps)
        console.log("[DEBUG GameContentA] showRewardedAd() returned false. Ad could not be shown.");
        Alert.alert("Oups !", "Impossible de lancer la publicité pour le moment.", [{ text: "OK" }]);
        // On cache l'offre et on affiche le scoreboard car la pub n'a pas pu être lancée
        setShowWatchAdOffer(false);
        setShowScoreboard(true);
      }
    } else {
       // Cas où showRewardedAd n'est pas défini (ne devrait pas arriver si les conditions sont bonnes)
       console.error("[DEBUG GameContentA] handleWatchAd called but showRewardedAd is undefined!");
       setShowWatchAdOffer(false);
       setShowScoreboard(true);
    }
  };

  const handleDeclineWatchAd = () => {
    console.log("[DEBUG GameContentA] User declined watch ad offer");
    setShowWatchAdOffer(false); // Cacher l'offre
    setShowScoreboard(true);  // Afficher le scoreboard
    // Pas besoin de gérer isGameOver ici, il est déjà true.
  };

  // --- Rendu Principal du Contenu ---
  const renderContent = () => {
    // 'loading' est géré par GamePage, on vérifie juste les erreurs ou l'absence d'événements/user
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          {/* Ajouter un bouton pour réessayer ou retourner au menu ? */}
          <TouchableOpacity onPress={handleRestartOrClose} style={styles.errorButton}>
              <Text style={styles.errorButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Attendre que l'utilisateur et les premiers événements soient prêts
    if (!user || (!previousEvent && !displayedEvent)) {
      // Devrait être couvert par le loader de GamePage, mais sécurité supplémentaire
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.white} />
          <Text style={styles.loadingText}>Préparation...</Text>
        </View>
      );
    }

    // Si on arrive ici, user, previousEvent et displayedEvent sont valides
    return (
      <>
        {/* --- Layout Principal des Événements --- */}
        <EventLayoutA
          previousEvent={previousEvent}
          newEvent={displayedEvent} // Utilise displayedEvent pour l'événement de droite
          onImageLoad={handleImageLoad}
          onChoice={handleChoice} // Passe directement la fonction typée
          showDate={showDates}
          isCorrect={isCorrect}
          isImageLoaded={isImageLoaded}
          streak={streak}
          level={level}
          isLevelPaused={isLevelPaused}
          isInitialRender={isInitialRenderRef.current} // Passe l'état initial
        />

        {/* --- Modal de Level Up --- */}
        <LevelUpModalBis
          visible={showLevelModal}
          level={level}
          onStart={handleLevelUp}
          name={currentLevelConfig.name}
          description={currentLevelConfig.description}
          requiredEvents={currentLevelConfig.eventsNeeded}
          specialRules={currentLevelConfig.specialRules}
          previousLevel={level > 1 ? level - 1 : undefined}
          isNewLevel={level > 1}
          eventsSummary={levelCompletedEvents}
        />

        {/* --- Modal Tableau des Scores --- */}
        {/* S'affiche si le jeu est terminé ET qu'on a décidé d'afficher le scoreboard */}
        <ScoreboardModal
          isVisible={isGameOver && showScoreboard} // Condition d'affichage
          currentScore={user.points}
          personalBest={highScore}
          isLoadingScores={!leaderboardsReady && isGameOver} // Loader si gameover mais scores pas prêts
          dailyScores={leaderboards?.daily || []}
          monthlyScores={leaderboards?.monthly || []}
          allTimeScores={leaderboards?.allTime || []}
          onRestart={handleRestartOrClose} // Action "Rejouer" -> Navigue vers vue1
          onMenuPress={handleRestartOrClose} // Action "Menu" -> Navigue aussi vers vue1
          playerName={user.name}
          levelsHistory={levelsHistory}
        />

        {/* --- Overlay pour l'offre de Publicité Récompensée --- */}
        {/* S'affiche si le jeu est terminé ET qu'on a décidé d'afficher l'offre */}
        {isGameOver && showWatchAdOffer && (
          <View style={styles.watchAdOverlay}>
            <View style={styles.watchAdContainer}>
              {/* ... (contenu de l'overlay inchangé) ... */}
              <View style={styles.watchAdIconContainer}>
                <Ionicons name="heart" size={50} color={colors.incorrectRed} />
              </View>
              <Text style={styles.watchAdTitle}>Dernière vie perdue !</Text>
              <Text style={styles.watchAdDescription}>
                Regardez une courte publicité pour obtenir une vie supplémentaire et continuer votre partie.
              </Text>
              <View style={styles.watchAdButtonsContainer}>
                <TouchableOpacity
                  style={[styles.watchAdButton, styles.watchAdDeclineButton]}
                  onPress={handleDeclineWatchAd} // Action refuser
                >
                  <Text style={styles.watchAdDeclineText}>Non, merci</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.watchAdButton, styles.watchAdAcceptButton]}
                  onPress={handleWatchAd} // Action accepter
                >
                  <Ionicons name="play-circle-outline" size={20} color="white" style={styles.watchAdButtonIcon} />
                  <Text style={styles.watchAdAcceptText}>D'accord !</Text>
                </TouchableOpacity>
              </View>
              {/* ... */}
            </View>
          </View>
        )}
      </>
    );
  };

  // --- Rendu du Composant Principal ---
  // Utiliser un fragment ou un View si SafeAreaView n'est pas le container principal
  return (
    // SafeAreaView déplacé au niveau parent (GamePage), donc on utilise un View ici
    <View style={styles.container}>
       {/* La barre de statut est maintenant gérée par GamePage */}
       {/* <StatusBar barStyle="light-content" backgroundColor="#050B1F" translucent={false} /> */}

       {/* Animation de fondu appliquée au contenu */}
       <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
         {/* Header avec Infos Joueur et Countdown */}
         <View style={styles.header}>
           {/* S'assurer que user n'est pas null avant de rendre UserInfo */}
           {user && (
              <UserInfo
                ref={userInfoRef}
                name={user.name}
                points={user.points}
                lives={user.lives}
                level={level}
                streak={streak}
                eventsCompletedInLevel={user.eventsCompletedInLevel}
                eventsNeededForLevel={currentLevelConfig.eventsNeeded}
              />
           )}
           <View style={styles.countdownContainer}>
             {/* Condition pour activer le Countdown */}
             <Countdown
                timeLeft={timeLeft}
                isActive={!isLevelPaused && isImageLoaded && !!user && !!previousEvent && !!displayedEvent && !isGameOver && !showLevelModal}
             />
           </View>

           {/* Animation de Récompense */}
           {currentReward && isRewardPositionSet && (
             <RewardAnimation
               type={currentReward.type}
               amount={currentReward.amount}
               targetPosition={currentReward.targetPosition}
               onComplete={completeRewardAnimation}
             />
           )}
         </View>

         {/* Contenu Principal (Événements, Modals, Offre de Pub) */}
         <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
           {renderContent()}
         </Animated.View>
       </Animated.View>
    </View>
  );
}

// --- Styles ---
// (Styles existants, ajout d'un style pour le bouton d'erreur)
const styles = StyleSheet.create({
  // safeArea: { // Déplacé au parent
  //   flex: 1,
  //   backgroundColor: 'transparent',
  // },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(250, 245, 235, 0.85)', // beige doux transparent
    borderBottomColor: 'rgba(0, 0, 0, 0.05)', // ligne légère pour différencier
    zIndex: 1000,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'android' ? 8 : 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  countdownContainer: {
    marginLeft: 15,
  },
  content: {
    flex: 1,
    position: 'relative',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  errorText: {
    color: colors.white,
    fontSize: 18,
    textAlign: 'center',
    backgroundColor: colors.incorrectRed,
    padding: 20,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20, // Espace avant le bouton
  },
  errorButton: {
      backgroundColor: colors.white,
      paddingHorizontal: 30,
      paddingVertical: 10,
      borderRadius: 20,
  },
  errorButtonText: {
      color: colors.incorrectRed,
      fontSize: 16,
      fontWeight: 'bold',
  },
  watchAdOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  watchAdContainer: {
    width: '85%',
    maxWidth: 380,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  watchAdIconContainer: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  watchAdTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  watchAdDescription: {
    fontSize: 16,
    color: colors.textMuted || colors.text,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  watchAdButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 10,
  },
  watchAdButton: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 130,
    flex: 1,
    marginHorizontal: 5,
  },
  watchAdDeclineButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  watchAdAcceptButton: {
    backgroundColor: colors.correctGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchAdDeclineText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '500',
  },
  watchAdAcceptText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  watchAdButtonIcon: {
    marginRight: 8,
  },
});

export default GameContentA;