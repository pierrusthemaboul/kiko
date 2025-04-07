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
  isGameOver: boolean;
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
}

function GameContentA({
  user,
  timeLeft,
  loading,
  error,
  previousEvent,
  newEvent,
  isGameOver,
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
}: GameContentAProps) {
  const router = useRouter();
  const userInfoRef = useRef<UserInfoHandle>(null);
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const [isRewardPositionSet, setIsRewardPositionSet] = useState(false);
  
  // État pour l'affichage d'un bouton d'urgence pour la publicité récompensée
  const [showWatchAdButton, setShowWatchAdButton] = useState(false);
  
  // État pour bloquer temporairement l'affichage du tableau des scores
  // jusqu'à ce que l'utilisateur réponde à la proposition de pub
  const [showScoreboardDelayed, setShowScoreboardDelayed] = useState(false);

  // Surveillance de la vie de l'utilisateur
  useEffect(() => {
    // Détection de la dernière vie perdue
    if (user.lives === 0 && !showScoreboardDelayed) {
      console.log('[GameContentA] User lost last life. Showing rewarded ad button');
      
      // Si une fonction de pub récompensée est disponible, on propose la pub
      if (showRewardedAd) {
        setShowWatchAdButton(true);
        
        // On ne montre pas encore le tableau des scores
        // même si isGameOver devient true
        setShowScoreboardDelayed(false);
      } else {
        // Sinon on passe directement au tableau des scores
        setShowScoreboardDelayed(true);
      }
    }
  }, [user.lives, showRewardedAd]);

  // Moniteur pour isGameOver
  useEffect(() => {
    console.log("[GameContentA] isGameOver:", isGameOver, "showWatchAdButton:", showWatchAdButton);
  }, [isGameOver, showWatchAdButton]);

  useEffect(() => {
    let mounted = true;

    const updateRewardPositionSafely = async () => {
      if (!currentReward || !userInfoRef.current || !mounted) return;

      try {
        const position =
          currentReward.type === RewardType.EXTRA_LIFE
            ? await userInfoRef.current.getLifePosition()
            : await userInfoRef.current.getPointsPosition();

        if (!mounted) return;

        if (position && typeof position.x === 'number' && typeof position.y === 'number') {
          if (
            !currentReward.targetPosition ||
            currentReward.targetPosition.x !== position.x ||
            currentReward.targetPosition.y !== position.y
          ) {
            updateRewardPosition(position);
            setIsRewardPositionSet(true);
          }
        }
      } catch {
        setIsRewardPositionSet(false);
      }
    };

    updateRewardPositionSafely();
    return () => {
      mounted = false;
    };
  }, [currentReward?.type]);

  useEffect(() => {
    if (showLevelModal) {
      Animated.sequence([
        Animated.timing(contentOpacity, {
          toValue: 0.3,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 300,
          delay: 1000,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showLevelModal]);

  const handleWatchAd = () => {
    console.log('[GameContentA] User clicked watch ad button');
    if (showRewardedAd) {
      const adShown = showRewardedAd();
      
      if (!adShown) {
        console.log('[GameContentA] Failed to show rewarded ad');
        Alert.alert(
          "Oups !",
          "Aucune publicité n'est disponible pour le moment. Réessayez plus tard.",
          [{ text: "OK" }]
        );
      } else {
        // La pub est affichée, on masque le bouton
        setShowWatchAdButton(false);
        
        // Le callback de la pub gèrera l'ajout de vie
        // Si la vie reste à 0 après la pub, l'écran de scores apparaîtra automatiquement
      }
    }
  };

  const handleDeclineWatchAd = () => {
    console.log('[GameContentA] User declined to watch ad');
    setShowWatchAdButton(false);
    
    // L'utilisateur a décliné, on peut maintenant afficher le tableau des scores
    setShowScoreboardDelayed(true);
  };

  const onChoiceWrapper = (choice: string) => {
    handleChoice(choice);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement des événements...</Text>
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

    if (!previousEvent || !newEvent) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Préparation des événements...</Text>
        </View>
      );
    }

    return (
      <>
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

        {/* 
          ScoreboardModal: doit être visible seulement si:
          1. isGameOver est true (fin de jeu officielle)
          2. ET soit l'utilisateur a décliné la pub (showScoreboardDelayed true)
             OU il n'y a pas de proposition de pub (showWatchAdButton false)
        */}
        <ScoreboardModal
          isVisible={isGameOver && (showScoreboardDelayed || !showWatchAdButton)}
          currentScore={user.points}
          personalBest={highScore}
          dailyScores={leaderboards?.daily || []}
          monthlyScores={leaderboards?.monthly || []}
          allTimeScores={leaderboards?.allTime || []}
          onRestart={handleRestart}
          onMenuPress={() => router.replace('/')}
          playerName={user.name}
          levelsHistory={levelsHistory}
        />
        
        {/* Overlay pour regarder une pub et obtenir une vie supplémentaire */}
        {showWatchAdButton && (
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
                  onPress={handleDeclineWatchAd}
                >
                  <Text style={styles.watchAdDeclineText}>Non, merci</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.watchAdButton, styles.watchAdAcceptButton]}
                  onPress={handleWatchAd}
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

          {currentReward && currentReward.targetPosition && isRewardPositionSet && (
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
    </SafeAreaView>
  );
}

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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
    paddingHorizontal: 15,
    paddingVertical: 10,
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
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.text,
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
  
  // Styles pour le bouton de publicité récompensée
  watchAdOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
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
    width: 80,
    height: 80,
    borderRadius: 40,
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
  },
  watchAdAcceptButton: {
    backgroundColor: colors.correctGreen,
    flexDirection: 'row',
    alignItems: 'center',
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