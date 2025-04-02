// /app/game/page.tsx

import React, { useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Animated,
  StatusBar,
  ImageBackground,
  View,
  ActivityIndicator // Importer pour l'indicateur de chargement
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

// Composants
import GameContentA from "../../components/game/GameContentA";
import RewardAnimation from "../../components/game/RewardAnimation";

// Hooks
import { useGameLogicA } from '@/hooks/useGameLogicA';

// Libs
import * as FirebaseAnalytics from '@/lib/firebase'; // L'import est correct, le problème est probablement lié au build/cache

export default function GamePage() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const gameLogic = useGameLogicA('');

  // Log initial (peut être retiré en prod)
  /*
  useEffect(() => {
    console.log('[GamePage] Initial gameLogic state:', {
      user: gameLogic.user,
      levelsHistory: gameLogic.levelsHistory,
      levelCompletedEvents: gameLogic.levelCompletedEvents,
    });
  }, [gameLogic.user, gameLogic.levelsHistory, gameLogic.levelCompletedEvents]);
  */

  // Suivi de l'écran de jeu
  useFocusEffect(
    useCallback(() => {
      // Utiliser un try...catch pour isoler l'erreur si elle persiste
      try {
        // Vérifier si FirebaseAnalytics et FirebaseAnalytics.screen sont définis avant d'appeler
        if (FirebaseAnalytics && typeof FirebaseAnalytics.screen === 'function') {
          FirebaseAnalytics.screen('GameScreen', 'GamePage');
        } else {
          // Logguer si la fonction n'est toujours pas trouvée après le nettoyage du cache
          console.warn('FirebaseAnalytics.screen n\'est pas une fonction au moment de l\'appel dans useFocusEffect.');
          // Vous pourriez vouloir logger l'objet FirebaseAnalytics entier pour voir ce qu'il contient
          // console.log('Contenu actuel de FirebaseAnalytics:', FirebaseAnalytics);
        }
      } catch (error) {
         // Log l'erreur pour mieux comprendre si elle persiste
        console.error("Erreur lors de l'appel à FirebaseAnalytics.screen :", error);
      }

      // Optionnel : Code à exécuter si l'écran perd le focus
      // return () => { console.log('GameScreen lost focus'); };
    }, [])
  );

  const handleRestartGame = () => {
    router.replace('/');
  };

  // Effet d'animation de fade-in au montage
  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  // Affichage pendant le chargement initial de la logique de jeu
  if (!gameLogic || !gameLogic.user) {
    // Retourne un indicateur de chargement centré
    return (
      <View style={[styles.fullScreenContainer, styles.loadingContainer]}>
         <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
         <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  // Affichage principal du jeu
  return (
    <View style={styles.fullScreenContainer}>
      <ImageBackground
        source={require('../../assets/images/quipasse.webp')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <SafeAreaView style={styles.container} edges={['bottom']}>
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
            levelsHistory={gameLogic.levelsHistory}
          />
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
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  backgroundImage: {
    flex: 1, width: '100%', height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  // Style pour le conteneur de chargement
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Fond semi-transparent pendant le chargement
  },
});