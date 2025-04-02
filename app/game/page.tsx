import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Animated,
  StatusBar,
  ImageBackground,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

// Composants
import GameContentA from "../../components/game/GameContentA";
import RewardAnimation from "../../components/game/RewardAnimation"; 
// Assurez-vous que le chemin d'import est correct 
// selon l'emplacement de votre fichier RewardAnimation.tsx

// Hooks
import { useGameLogicA } from '@/hooks/useGameLogicA';

export default function GamePage() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const gameLogic = useGameLogicA(''); 
  // <-- Ajoutez un éventuel paramètre si nécessaire

  // Log initial des valeurs récupérées depuis le hook
  useEffect(() => {
    console.log('[GamePage] gameLogic.user:', gameLogic.user);
    console.log('[GamePage] gameLogic.levelsHistory:', gameLogic.levelsHistory);
    console.log('[GamePage] gameLogic.levelCompletedEvents:', gameLogic.levelCompletedEvents);
  }, [gameLogic.user, gameLogic.levelsHistory, gameLogic.levelCompletedEvents]);

  const handleRestartGame = () => {
    router.replace('/');
  };

  // Effet d'animation de fade-in au montage
  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Sécurité : si gameLogic n'est pas prêt, on n'affiche rien
  if (!gameLogic) {
    return null;
  }

  return (
    <View style={styles.fullScreenContainer}>
      <ImageBackground
        source={require('../../assets/images/quipasse.webp')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle="light-content"
        />

        <SafeAreaView style={styles.container} edges={['bottom']}>
          {/* 
            GameContentA contient déjà l'UI du jeu, 
            y compris la barre de score/vies si vous l'y avez intégrée 
          */}
          <GameContentA
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
            handleRestart={handleRestartGame}
            streak={gameLogic.streak}
            highScore={gameLogic.highScore}
            level={gameLogic.user.level}
            fadeAnim={fadeAnim}
            showLevelModal={gameLogic.showLevelModal}
            isLevelPaused={gameLogic.isLevelPaused}
            handleLevelUp={gameLogic.handleLevelUp}
            currentLevelConfig={gameLogic.currentLevelConfig}
            leaderboards={gameLogic.leaderboards}
            levelCompletedEvents={gameLogic.levelCompletedEvents}
            currentReward={gameLogic.currentReward}
            completeRewardAnimation={gameLogic.completeRewardAnimation}
            updateRewardPosition={gameLogic.updateRewardPosition}
            // <-- Passage de la prop levelsHistory
            levelsHistory={gameLogic.levelsHistory}
          />

          {/*
            Affichage conditionnel de l'animation de récompense.
            - On vérifie que currentReward est défini 
            - On vérifie aussi que targetPosition est présente (définie via updateRewardPosition)
          */}
          {gameLogic.currentReward && gameLogic.currentReward.targetPosition && (
            <RewardAnimation
              type={gameLogic.currentReward.type}
              amount={gameLogic.currentReward.amount}
              targetPosition={gameLogic.currentReward.targetPosition}
              onComplete={gameLogic.completeRewardAnimation}
            />
          )}
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    // S'assurer que le contenu remplit tout l'écran
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    // edges={['bottom']} évite le padding en haut
  },
});