import React, { useState, useRef, useEffect } from 'react';
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
import EventLayoutA from './EventLayoutA';
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
} from '@/hooks/types';

interface LevelHistory {
  level: number;
  events: LevelEventSummary[];
}

interface GameContentAProps {
  user: User;
  timeLeft: number;
  loading: boolean;
  error: string | null;
  previousEvent: Event | null;
  newEvent: Event | null;
  isGameOver: boolean; // Doit venir directement de l'état interne du hook maintenant
  leaderboardsReady: boolean; // État séparé
  showDates: boolean;
  isCorrect?: boolean;
  isImageLoaded: boolean;
  handleChoice: (choice: string) => void;
  handleImageLoad: () => void;
  handleRestart: () => void;
  streak: number;
  highScore: number;
  level: number;
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
  showRewardedAd?: () => boolean;
  isAdFreePeriod?: boolean; // Prop pour savoir si on est dans le cooldown
}

function GameContentA({
  user,
  timeLeft,
  loading,
  error,
  previousEvent,
  newEvent,
  isGameOver, // Prop directe
  leaderboardsReady, // Prop directe
  showDates,
  isCorrect,
  isImageLoaded,
  handleChoice,
  handleImageLoad,
  handleRestart,
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
  isAdFreePeriod,
}: GameContentAProps) {
  const router = useRouter();
  const userInfoRef = useRef<UserInfoHandle>(null);
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const [isRewardPositionSet, setIsRewardPositionSet] = useState(false);

  // État pour l'affichage du bouton/overlay de la publicité récompensée
  const [showWatchAdButton, setShowWatchAdButton] = useState(false);

  // État pour gérer l'affichage différé du scoreboard après refus
  const [showScoreboardDelayed, setShowScoreboardDelayed] = useState(false);

  // Surveillance de la vie de l'utilisateur pour proposer la pub
  useEffect(() => {
    // Log à chaque exécution de cet effet pour suivre les décisions
    console.log(`[GameContentA] useEffect[user.lives] Check: lives=${user.lives}, showWatchAdButton=${showWatchAdButton}, isAdFreePeriod=${isAdFreePeriod}, isGameOver=${isGameOver}`);

    if (user.lives === 0 && !isGameOver && !showWatchAdButton && !isAdFreePeriod) {
      // Condition : Vies à 0, jeu PAS ENCORE officiellement terminé (endGame en cours), overlay pas déjà montré, et pas en période sans pub
      console.log('[GameContentA] useEffect[user.lives]: Conditions met to OFFER ad (lives=0, !isGameOver, !showWatchAdButton, !isAdFreePeriod).');
      if (showRewardedAd) {
        console.log('[GameContentA] useEffect[user.lives]: Calling setShowWatchAdButton(true), setShowScoreboardDelayed(false)');
        setShowWatchAdButton(true);
        setShowScoreboardDelayed(false); // Important : Ne pas montrer le score tout de suite
      } else {
        // Si la fonction showRewardedAd n'existe pas (ne devrait pas arriver?)
        console.log('[GameContentA] useEffect[user.lives]: No showRewardedAd function. Calling setShowScoreboardDelayed(true)');
        setShowScoreboardDelayed(true); // Montrer le score directement si pas de fonction pub
      }
    } else if (user.lives === 0 && isGameOver && isAdFreePeriod && !showScoreboardDelayed) {
        // Condition : Vies à 0, jeu terminé, EN période sans pub, et score pas encore affiché
        console.log('[GameContentA] useEffect[user.lives]: Lives 0, GameOver, IN ad-free period. Calling setShowScoreboardDelayed(true) if not already.');
      if (!showScoreboardDelayed) {
         setShowScoreboardDelayed(true); // Afficher le score directement
      }
       // S'assurer que l'overlay disparaît s'il était visible (cas improbable)
      if (showWatchAdButton) setShowWatchAdButton(false);

    } else if (user.lives > 0 && showWatchAdButton) {
      // Condition : L'utilisateur a regagné une vie (probablement via pub), mais l'overlay est toujours affiché
      console.log('[GameContentA] useEffect[user.lives]: Lives > 0 and ad button was visible. Calling setShowWatchAdButton(false).');
      setShowWatchAdButton(false);
      // On ne touche pas à showScoreboardDelayed ici, car le jeu a repris
    } else if (user.lives === 0 && isGameOver && !isAdFreePeriod && !showWatchAdButton && !showScoreboardDelayed) {
      // Condition : Vies à 0, jeu terminé, PAS en période sans pub, overlay NON visible (car on a cliqué "Non Merci" ?) et score non affiché
      // Ce cas est maintenant géré par handleDeclineWatchAd qui met showScoreboardDelayed à true.
      // On pourrait ajouter un log ici si on suspecte que handleDecline ne fonctionne pas.
       console.log('[GameContentA] useEffect[user.lives]: Lives 0, GameOver, NOT AdFree, Ad Overlay hidden -> Scoreboard should be shown via showScoreboardDelayed.');
    }

  // Ajout de isGameOver aux dépendances car la logique en dépend
  }, [user.lives, showRewardedAd, showScoreboardDelayed, isAdFreePeriod, showWatchAdButton, isGameOver]);

  // Effet pour obtenir la position des éléments pour l'animation de récompense
  useEffect(() => {
    let mounted = true;
    const updateRewardPositionSafely = async () => {
      if (!currentReward || !userInfoRef.current || !mounted) return;
      try {
        const position = currentReward.type === RewardType.EXTRA_LIFE
          ? await userInfoRef.current.getLifePosition()
          : await userInfoRef.current.getPointsPosition();
        if (mounted && position && typeof position.x === 'number' && typeof position.y === 'number') {
          if (!currentReward.targetPosition || currentReward.targetPosition.x !== position.x || currentReward.targetPosition.y !== position.y) {
            // Log avant de mettre à jour la position cible
            // console.log(`[GameContentA] updateRewardPositionSafely: Updating target for ${currentReward.type} to`, position);
            updateRewardPosition(position);
            setIsRewardPositionSet(true);
          }
        }
      } catch (e){
        // console.error('[GameContentA] Error getting reward position:', e);
        setIsRewardPositionSet(false);
      }
    };
    // Ne log que si une récompense est active pour éviter le bruit
    // if (currentReward) console.log('[GameContentA] useEffect[currentReward]: Checking reward position...');
    updateRewardPositionSafely();
    return () => { mounted = false; };
  }, [currentReward, updateRewardPosition]); // currentReward entier pour réagir

  // Animation d'opacité pour le modal de niveau
  useEffect(() => {
    if (showLevelModal) {
      Animated.sequence([
        Animated.timing(contentOpacity, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        Animated.timing(contentOpacity, { toValue: 1, duration: 300, delay: 1000, useNativeDriver: true }),
      ]).start();
    }
  }, [showLevelModal, contentOpacity]);

  // Handler quand l'utilisateur clique pour regarder la pub
  const handleWatchAd = () => {
    console.log('[GameContentA] handleWatchAd: CALLED!'); // Log appel fonction
    if (showRewardedAd) {
      const adShown = showRewardedAd(); // Appel de la fonction du hook
      if (!adShown) {
        console.log('[GameContentA] handleWatchAd: showRewardedAd() returned false (ad not available/shown).');
        Alert.alert("Oups !", "Aucune publicité n'est disponible pour le moment. Réessayez plus tard.", [{ text: "OK" }]);
        // On ne cache PAS forcément le bouton ici, l'utilisateur pourrait vouloir réessayer
        // setShowWatchAdButton(false);
      } else {
        console.log('[GameContentA] handleWatchAd: showRewardedAd() returned true (ad attempt initiated). Setting showWatchAdButton=false.');
        // Important : On cache le bouton dès que la tentative de montrer la pub réussit
        setShowWatchAdButton(false);
      }
    } else {
      console.warn('[GameContentA] handleWatchAd: showRewardedAd function is not available!');
      Alert.alert("Erreur", "Impossible de lancer la publicité pour le moment.");
      setShowWatchAdButton(false); // Cacher le bouton si la fonction elle-même manque
    }
  };

  // Handler quand l'utilisateur refuse la pub
  const handleDeclineWatchAd = () => {
    console.log('[GameContentA] handleDeclineWatchAd: CALLED! Setting showWatchAdButton=false, showScoreboardDelayed=true');
    setShowWatchAdButton(false);
    setShowScoreboardDelayed(true); // Autorise l'affichage du score
  };

  // Wrapper pour handleChoice
  const onChoiceWrapper = (choice: string) => {
    // console.log(`[GameContentA] onChoiceWrapper: Passing choice '${choice}' to handleChoice.`);
    handleChoice(choice);
  };

  // Fonction pour rendre le contenu principal du jeu
  const renderContent = () => {
    // --- États de chargement et d'erreur ---
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.white} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      );
    }
    // Si pas d'erreur mais pas encore d'event (devrait être très bref après chargement)
    if (!previousEvent || !newEvent) {
      return (
        <View style={styles.loadingContainer}>
           {/* Ce message ne devrait plus apparaître longtemps avec les resets dans initGame */}
          <Text style={styles.loadingText}>Préparation du premier tour...</Text>
        </View>
      );
    }

    // --- Calcul de la visibilité du Scoreboard ---
    // Le jeu doit être terminé ET (soit l'overlay de pub n'est pas montré, soit on a cliqué 'Non merci')
    const isScoreboardVisible = isGameOver && (!showWatchAdButton || showScoreboardDelayed);

    // ---> LOG CRUCIAL POUR LE MODAL <---
    console.log('[GameContentA] Scoreboard Render Check:', {
        prop_isGameOver: isGameOver,
        state_showWatchAdButton: showWatchAdButton,
        state_showScoreboardDelayed: showScoreboardDelayed,
        prop_leaderboardsReady: leaderboardsReady, // Info utile
        final_isVisible_prop: isScoreboardVisible
    });
    // ---> FIN LOG CRUCIAL <---

    // --- Calcul de la visibilité de l'Overlay Pub ---
    // Vies à 0, overlay pas déjà caché par l'utilisateur, et jeu pas encore officiellement "terminé" du point de vue UI (avant affichage score)
    // OU on pourrait simplifier : si showWatchAdButton est true et lives === 0
    const shouldShowOverlay = showWatchAdButton && user.lives === 0;
    if(shouldShowOverlay) {
        console.log('[GameContentA] Rendering Watch Ad Overlay.');
    }

    // --- Rendu normal du jeu ---
    return (
      <>
        {/* Layout principal des événements */}
        <EventLayoutA
          previousEvent={previousEvent}
          newEvent={newEvent}
          onImageLoad={handleImageLoad}
          onChoice={onChoiceWrapper}
          showDate={showDates}
          isCorrect={isCorrect}
          isImageLoaded={isImageLoaded}
          streak={streak}
          level={level}
          isLevelPaused={isLevelPaused}
        />

        {/* Modal de passage de niveau */}
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

        {/* Modal de fin de partie (tableau des scores) */}
        <ScoreboardModal
          isVisible={isScoreboardVisible} // Utiliser la variable calculée
          currentScore={user.points}
          personalBest={highScore}
          isLoadingScores={!leaderboardsReady && isGameOver} // Indicateur de chargement si game over mais scores pas prêts
          dailyScores={leaderboards?.daily || []}
          monthlyScores={leaderboards?.monthly || []}
          allTimeScores={leaderboards?.allTime || []}
          onRestart={handleRestart}
          onMenuPress={() => router.replace('/')}
          playerName={user.name}
          levelsHistory={levelsHistory}
        />

        {/* Overlay Publicité Récompensée */}
        {shouldShowOverlay && (
          <View style={styles.watchAdOverlay}>
            <View style={styles.watchAdContainer}>
              <View style={styles.watchAdIconContainer}>
                <Ionicons name="heart" size={50} color={colors.incorrectRed} />
              </View>
              <Text style={styles.watchAdTitle}>Dernière vie perdue!</Text>
              <Text style={styles.watchAdDescription}>
                Regardez une courte publicité pour obtenir une vie supplémentaire et continuer votre partie.
              </Text>
              <View style={styles.watchAdButtonsContainer}>
                <TouchableOpacity
                  style={[styles.watchAdButton, styles.watchAdDeclineButton]}
                  onPress={handleDeclineWatchAd} // Fonction logguée
                >
                  <Text style={styles.watchAdDeclineText}>Non, merci</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.watchAdButton, styles.watchAdAcceptButton]}
                  onPress={handleWatchAd} // Fonction logguée
                >
                  <Ionicons name="play-circle-outline" size={20} color="white" style={styles.watchAdButtonIcon} />
                  <Text style={styles.watchAdAcceptText}>Obtenir une vie</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </>
    );
  };

  // --- Rendu principal du composant ---
  // Log des props principales reçues par GameContentA
  // console.log(`[GameContentA] MAIN RENDER - isGameOver=${isGameOver}, leaderboardsReady=${leaderboardsReady}, showLevelModal=${showLevelModal}, loading=${loading}, error=${error}`);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#050B1F" translucent={false} />

      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.header}>
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
          <View style={styles.countdownContainer}>
            <Countdown timeLeft={timeLeft} isActive={!isLevelPaused && isImageLoaded} />
          </View>
          {/* Animation de récompense */}
          {currentReward && currentReward.targetPosition && isRewardPositionSet && (
            <RewardAnimation
              type={currentReward.type}
              amount={currentReward.amount}
              targetPosition={currentReward.targetPosition}
              onComplete={completeRewardAnimation}
            />
          )}
        </View>

        {/* Contenu principal du jeu */}
        <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
          {renderContent()}
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}

// Styles (inchangés)
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 11, 31, 0.85)',
    zIndex: 1000,
    paddingHorizontal: 15,
    paddingVertical: 10,
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
  },
  errorText: {
    color: colors.incorrectRed,
    fontSize: 18,
    textAlign: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    borderRadius: 10,
  },
  watchAdOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000, // Assurer qu'il est au-dessus du reste
  },
  watchAdContainer: {
    width: '85%',
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
    color: colors.text,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  watchAdButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  watchAdButton: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 130,
  },
  watchAdDeclineButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
  },
  watchAdAcceptButton: {
    backgroundColor: colors.correctGreen,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
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