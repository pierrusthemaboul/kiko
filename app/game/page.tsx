import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  StatusBar,
  ImageBackground,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

// Components
import GameContentA from '@/components/game/GameContentA';

// Hooks
import { useGameLogicA } from '@/hooks/useGameLogicA';

export default function GamePage() {
  // Router
  const router = useRouter();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Game Logic
  const gameLogic = useGameLogicA('');

  // Gestion du retour à la page d'accueil
  const handleRestartGame = () => {
    router.replace('/');
  };

  // Animation d'entrée
  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      })
    ]).start();

    return () => {
      // Cleanup si nécessaire
    };
  }, []);

  return (
    <ImageBackground
      source={require('@/assets/images/bgvue2.webp')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <SafeAreaView style={styles.container}>
        <GameContentA
          // Props de base
          user={gameLogic.user}
          previousEvent={gameLogic.previousEvent}
          newEvent={gameLogic.newEvent}
          timeLeft={gameLogic.timeLeft}
          loading={gameLogic.loading}
          error={gameLogic.error}
          isGameOver={gameLogic.isGameOver}
          showDates={gameLogic.showDates}
          isCorrect={gameLogic.isCorrect}
          isImageLoaded={gameLogic.isImageLoaded}
          handleChoice={gameLogic.handleChoice}
          handleImageLoad={gameLogic.onImageLoad}
          streak={gameLogic.streak}
          highScore={gameLogic.highScore}
          level={gameLogic.user.level}

          // Animations et modales
          fadeAnim={fadeAnim}
          showLevelModal={gameLogic.showLevelModal}
          isLevelPaused={gameLogic.isLevelPaused}
          startLevel={gameLogic.startLevel}
          currentLevelConfig={gameLogic.currentLevelConfig}

          // Récompenses et stats
          currentReward={gameLogic.currentReward}
          completeRewardAnimation={gameLogic.completeRewardAnimation}
          updateRewardPosition={gameLogic.updateRewardPosition}
          leaderboards={gameLogic.leaderboards}

          // Historique
          levelCompletedEvents={gameLogic.levelCompletedEvents}

          // Navigation
          handleRestart={handleRestartGame}
        />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
});