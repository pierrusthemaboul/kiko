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
} from 'react-native';
import { useRouter } from 'expo-router';

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
  startLevel: () => void;
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

  // On ajoute la prop pour l’historique complet
  levelsHistory: LevelHistory[];
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
  startLevel,
  currentLevelConfig,
  currentReward,
  completeRewardAnimation,
  updateRewardPosition,
  leaderboards,
  levelCompletedEvents,
  levelsHistory, // <-- On le reçoit
}: GameContentAProps) {
  const router = useRouter();
  const userInfoRef = useRef<UserInfoHandle>(null);
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const [isRewardPositionSet, setIsRewardPositionSet] = useState(false);

  // [ADDED LOG]
  useEffect(() => {
    console.log('[GameContentA] Mounted or updated');
    console.log('[GameContentA] isGameOver:', isGameOver);
    console.log('[GameContentA] user.lives:', user.lives);
    console.log('[GameContentA] levelCompletedEvents:', levelCompletedEvents);
    console.log('[GameContentA] levelsHistory:', levelsHistory);
  }, [
    isGameOver,
    user.lives,
    levelCompletedEvents,
    levelsHistory,
  ]);

  // [ADDED LOG]
  useEffect(() => {
    console.log('[GameContentA] levelsHistory changed => length:', levelsHistory?.length || 0);
  }, [levelsHistory]);

  // [ADDED LOG]
  useEffect(() => {
    console.log('[GameContentA] levelCompletedEvents changed => length:', levelCompletedEvents?.length || 0);
  }, [levelCompletedEvents]);

  // [ADDED LOG]
  useEffect(() => {
    console.log('[GameContentA] isGameOver changed:', isGameOver);
  }, [isGameOver]);

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

  const onChoiceWrapper = (choice: string) => {
    // [ADDED LOG]
    console.log('[GameContentA] onChoiceWrapper => user chose:', choice);
    handleChoice(choice);
  };

  const renderContent = () => {
    // [ADDED LOG]
    console.log('[GameContentA] renderContent => loading:', loading, ', error:', error);

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
          onStart={startLevel}
          name={currentLevelConfig.name}
          description={currentLevelConfig.description}
          requiredEvents={currentLevelConfig.eventsNeeded}
          specialRules={currentLevelConfig.specialRules}
          previousLevel={level > 1 ? level - 1 : undefined}
          isNewLevel={level > 1}
          eventsSummary={levelCompletedEvents}
        />

        <ScoreboardModal
          isVisible={isGameOver}
          currentScore={user.points}
          personalBest={highScore}
          dailyScores={leaderboards?.daily || []}
          monthlyScores={leaderboards?.monthly || []}
          allTimeScores={leaderboards?.allTime || []}
          onRestart={handleRestart}
          onMenuPress={() => router.replace('/')}
          playerName={user.name}
          // --- On passe levelsHistory ---
          levelsHistory={levelsHistory}
        />
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
});

export default GameContentA;
