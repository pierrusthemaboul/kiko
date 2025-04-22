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
  adState: AdStateForContent; // L'état publicitaire simplifié
  resetAdsState?: () => void; // AJOUTÉ: Fonction pour réinitialiser l'état des publicités
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
  adState,
  resetAdsState, // NOUVEAU: récupération de la fonction resetAdsState
}: GameContentAProps) {
  const router = useRouter();
  const userInfoRef = useRef<UserInfoHandle>(null);
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const [isRewardPositionSet, setIsRewardPositionSet] = useState(false);

  // --- États pour gérer l'affichage conditionnel de fin de partie ---
  const [showWatchAdOffer, setShowWatchAdOffer] = useState(false);
  const [showScoreboard, setShowScoreboard] = useState(false);

  const isInitialRenderRef = useRef(true); // Pour l'animation d'EventLayoutA

  // Fonction wrapper qui appelle resetAdsState (si disponible) et handleRestartOrClose
  const handleRestart = useCallback(() => {
    // Réinitialiser l'état des publicités avant de naviguer/redémarrer
    if (resetAdsState) {
      resetAdsState();
      console.log("[GameContentA] Ads state reset before restarting game");
    }
    // Appeler la fonction de navigation originale
    handleRestartOrClose();
  }, [handleRestartOrClose, resetAdsState]);

  // --- Effet pour obtenir la position des éléments pour l'animation de récompense ---
  useEffect(() => {
    let mounted = true;
    const updateRewardPositionSafely = async () => {
      if (!currentReward || !userInfoRef.current || !mounted || !user) return; // Ajout check user
      try {
        const position = currentReward.type === RewardType.EXTRA_LIFE
          ? await userInfoRef.current.getLifePosition()
          : await userInfoRef.current.getPointsPosition();
        if (mounted && position && typeof position.x === 'number' && typeof position.y === 'number') {
          if (!currentReward.targetPosition || currentReward.targetPosition.x !== position.x || currentReward.targetPosition.y !== position.y) {
            updateRewardPosition(position);
            setIsRewardPositionSet(true);
          }
        } else if (mounted) {
             // console.warn("[GameContentA] getPosition returned invalid value:", position); // Log supprimé
             setIsRewardPositionSet(false);
        }
      } catch (e){
          // console.warn("[GameContentA] Could not get element position for reward animation:", e); // Log supprimé
        setIsRewardPositionSet(false);
      }
    };

    updateRewardPositionSafely();
    const timer = setTimeout(() => {
      if (mounted && currentReward && !isRewardPositionSet) {
        updateRewardPositionSafely();
      }
    }, 250);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [currentReward, updateRewardPosition, user]);

  // --- Animation d'opacité pour le modal de niveau ---
  useEffect(() => {
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
    if (isGameOver && user) {
      const canOfferAd =
        user.lives === 0 &&
        showRewardedAd &&
        adState.hasRewardedAd &&
        !adState.hasWatchedRewardedAd;

      if (canOfferAd) {
        setShowWatchAdOffer(true);
        setShowScoreboard(false);
      } else if (user.lives === 0) {
        setShowWatchAdOffer(false);
        setShowScoreboard(true);
      } else {
        setShowWatchAdOffer(false);
        setShowScoreboard(false);
      }
    } else if (!isGameOver) {
      setShowWatchAdOffer(false);
      setShowScoreboard(false);
    }
  }, [isGameOver, user, adState, showRewardedAd, leaderboardsReady, leaderboards]);

  // --- Effet pour marquer la fin du premier rendu significatif ---
  useEffect(() => {
    if (previousEvent && displayedEvent && isInitialRenderRef.current) {
      const timer = setTimeout(() => {
        // console.log("[GameContentA] Premier set d'événements chargé. Marqué comme non-initial pour les suivants."); // Log supprimé
        isInitialRenderRef.current = false;
      }, 0);
      return () => clearTimeout(timer);
    }
    if (!previousEvent && !displayedEvent && !error && user) {
       // isInitialRenderRef.current = true; // Logique commentée conservée si nécessaire
    }
  }, [previousEvent, displayedEvent, error, user]);

  // --- Fonctions pour gérer l'interaction avec l'offre de publicité ---
  const handleWatchAd = () => {
    if (showRewardedAd) {
      const adTriggered = showRewardedAd();
      if (adTriggered) {
        setShowWatchAdOffer(false);
      } else {
        // console.log("[DEBUG GameContentA] showRewardedAd() returned false. Ad could not be shown."); // Log supprimé
        Alert.alert("Oups !", "Impossible de lancer la publicité pour le moment.", [{ text: "OK" }]);
        setShowWatchAdOffer(false);
        setShowScoreboard(true);
      }
    } else {
       // console.error("[DEBUG GameContentA] handleWatchAd called but showRewardedAd is undefined!"); // Log supprimé
       setShowWatchAdOffer(false);
       setShowScoreboard(true);
    }
  };

  const handleDeclineWatchAd = () => {
    setShowWatchAdOffer(false);
    setShowScoreboard(true);
  };

  // --- Rendu Principal du Contenu ---
  const renderContent = () => {
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={handleRestart} style={styles.errorButton}>
              <Text style={styles.errorButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!user || (!previousEvent && !displayedEvent)) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.white} />
          <Text style={styles.loadingText}>Préparation...</Text>
        </View>
      );
    }

    return (
      <>
        {/* --- Layout Principal des Événements --- */}
        <EventLayoutA
          previousEvent={previousEvent}
          newEvent={displayedEvent}
          onImageLoad={handleImageLoad}
          onChoice={handleChoice}
          showDate={showDates}
          isCorrect={isCorrect}
          isImageLoaded={isImageLoaded}
          streak={streak}
          level={level}
          isLevelPaused={isLevelPaused}
          isInitialRender={isInitialRenderRef.current}
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
        <ScoreboardModal
          isVisible={isGameOver && showScoreboard}
          currentScore={user.points}
          personalBest={highScore}
          isLoadingScores={!leaderboardsReady && isGameOver}
          onRestart={handleRestart} // Utiliser handleRestart au lieu de handleRestartOrClose
          onMenuPress={handleRestart}  // Utiliser handleRestart au lieu de handleRestartOrClose
          playerName={user.name}
          levelsHistory={levelsHistory}
          dailyScores={leaderboards?.daily || []}
          monthlyScores={leaderboards?.monthly || []}
          allTimeScores={leaderboards?.allTime || []}
        />

        {/* --- Overlay pour l'offre de Publicité Récompensée --- */}
        {isGameOver && showWatchAdOffer && (
          <View style={styles.watchAdOverlay}>
            <View style={styles.watchAdContainer}>
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
                  onPress={handleDeclineWatchAd}
                >
                  <Text style={styles.watchAdDeclineText}>Non, merci</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.watchAdButton, styles.watchAdAcceptButton]}
                  onPress={handleWatchAd}
                >
                  <Ionicons name="play-circle-outline" size={20} color="white" style={styles.watchAdButtonIcon} />
                  <Text style={styles.watchAdAcceptText}>D'accord !</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </>
    );
  };

  // --- Rendu du Composant Principal ---
  return (
    <View style={styles.container}>
       {/* <StatusBar barStyle="light-content" backgroundColor="#050B1F" translucent={false} /> */}

       <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
         <View style={styles.header}>
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
             <Countdown
                timeLeft={timeLeft}
                isActive={!isLevelPaused && isImageLoaded && !!user && !!previousEvent && !!displayedEvent && !isGameOver && !showLevelModal}
             />
           </View>

           {currentReward && isRewardPositionSet && (
             <RewardAnimation
               type={currentReward.type}
               amount={currentReward.amount}
               targetPosition={currentReward.targetPosition}
               onComplete={completeRewardAnimation}
             />
           )}
         </View>

         <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
           {renderContent()}
         </Animated.View>
       </Animated.View>
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(250, 245, 235, 0.85)',
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
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
    marginBottom: 20,
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