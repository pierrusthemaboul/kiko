import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  StyleSheet,
  Animated,
  StatusBar,
  ImageBackground,
  View,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
// --- MODIFICATION IMPORT ---
// Assure-toi que l'import vient bien de la librairie installée
import { SafeAreaView } from 'react-native-safe-area-context';

// Composants
import GameContentA from "../../components/game/GameContentA"; // Vérifie le chemin

// Hooks
import { useGameLogicA } from '@/hooks/useGameLogicA'; // Vérifie le chemin

// Libs
import * as FirebaseAnalytics from '@/lib/firebase'; // Vérifie le chemin

export default function GamePage() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [gameKey, setGameKey] = useState(0);
  const [isRestarting, setIsRestarting] = useState(false);

  const gameLogic = useGameLogicA('');

  useFocusEffect(
    useCallback(() => {
      try {
        FirebaseAnalytics.screen('GameScreen', 'GamePage');
      } catch (error) {
        console.error("Erreur lors de l'appel à FirebaseAnalytics.screen :", error);
      }
      return () => {};
    }, [])
  );

  // Fonction pour relancer sur la MÊME page (gardée pour référence)
  const handleRestartGameOnSameScreen = useCallback(async () => {
    // (Logique inchangée)
    console.log("[GamePage] Restarting game on the same screen...");
    setIsRestarting(true);
    if (gameLogic.initGame) {
      try {
        await gameLogic.initGame();
      } catch (error) {
         console.error("[GamePage] Error during initGame on restart:", error);
      }
    }
    setGameKey(prevKey => prevKey + 1);
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    setTimeout(() => setIsRestarting(false), 150);
  }, [gameLogic.initGame, fadeAnim]);


  // Fonction pour naviguer vers vue1 (utilisée pour "Rejouer" / "Menu")
  const handleNavigateToVue1 = useCallback(() => {
    // (Logique inchangée)
    console.log("[GamePage] 'Rejouer'/'Menu' clicked: Navigating to /vue1");
    try {
       router.replace('/vue1');
    } catch (e) {
      console.error("[GamePage] Error navigating to /vue1:", e);
    }
  }, [router]);

  useEffect(() => {
    // (Logique inchangée)
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [gameKey, fadeAnim]);

  const showLoadingIndicator = (gameKey === 0 && gameLogic.loading) || isRestarting;

  // --- Vérification de chargement (inchangée) ---
  if (showLoadingIndicator || !gameLogic || !gameLogic.user || !gameLogic.currentLevelConfig || !gameLogic.adState) {
     return (
       <View style={[styles.fullScreenContainer, styles.loadingContainer]}>
         <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
         <ActivityIndicator size="large" color="#FFFFFF" />
       </View>
     );
   }

  // --- Rendu Principal ---
  return (
    <View style={styles.fullScreenContainer}>
      <ImageBackground
        source={require('../../assets/images/quipasse3.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

        {/* ========== MODIFICATION POUR LE LAYOUT ========== */}
        {/* Ajoute 'top' aux edges pour prendre en compte la barre de statut */}
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          {/* ================================================= */}
          <GameContentA
            key={gameKey}
            // Props passées (inchangées par rapport à la version précédente demandée)
            user={gameLogic.user}
            previousEvent={gameLogic.previousEvent}
            // newEvent={gameLogic.newEvent} // Moins utile maintenant
            displayedEvent={gameLogic.displayedEvent}
            timeLeft={gameLogic.timeLeft}
            // loading={false} // Géré au dessus
            error={gameLogic.error}
            isGameOver={gameLogic.isGameOver}
            leaderboardsReady={gameLogic.leaderboardsReady} // Ajouté précédemment
            showDates={gameLogic.showDates}
            isCorrect={gameLogic.isCorrect}
            isImageLoaded={gameLogic.isImageLoaded}
            handleChoice={gameLogic.handleChoice}
            handleImageLoad={gameLogic.onImageLoad}
            handleRestartOrClose={handleNavigateToVue1} // Renommé précédemment
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
            showRewardedAd={gameLogic.showRewardedAd}
            adState={gameLogic.adState} // Ajouté précédemment
          />
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

// --- Styles (inchangés) ---
const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1, width: '100%', height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
});