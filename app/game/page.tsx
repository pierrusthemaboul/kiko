// /home/pierre/sword/kiko/app/game/page.tsx

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
import { SafeAreaView } from 'react-native-safe-area-context';

// Composants
import GameContentA from "../../components/game/GameContentA"; // Chemin OK

// Hooks
import { useGameLogicA } from '@/hooks/useGameLogicA'; // Chemin OK

// Libs
import { FirebaseAnalytics } from '@/lib/firebase'; // Chemin OK

export default function GameScreenPage() { // Renommé pour clarté, mais le nom exporté doit être default
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [gameKey, setGameKey] = useState(0);
  const [isRestarting, setIsRestarting] = useState(false);

  const gameLogic = useGameLogicA(''); // Paramètre OK si attendu

  useFocusEffect(
    useCallback(() => {
      try {
        FirebaseAnalytics.screen('GameScreen', 'GameScreenPage'); // Nom du fichier/écran
      } catch (error) {
        console.error("Erreur lors de l'appel à FirebaseAnalytics.screen :", error);
      }
      return () => {};
    }, [])
  );

  // --- FONCTION POUR "REJOUER" ---
  // Renommée et logique ajustée (reset ads avant initGame)
  const handleActualRestart = useCallback(async () => {
    console.log("[GameScreenPage] ACTION: Restarting game state (Rejouer)...");
    setIsRestarting(true); // Affiche le chargement

    // Réinitialise l'état des pubs D'ABORD
    if (gameLogic.resetAdsState) {
      gameLogic.resetAdsState();
      console.log("[GameScreenPage] Ads state reset before restarting game logic");
    } else {
       console.log("[GameScreenPage] resetAdsState function not available.");
    }

    // Réinitialise la logique du jeu
    if (gameLogic.initGame) {
      try {
        await gameLogic.initGame(); // Réinitialise l'état interne du hook
        console.log("[GameScreenPage] Game logic re-initialized.");
      } catch (error) {
         console.error("[GameScreenPage] Error during initGame on restart:", error);
      }
    } else {
      console.warn("[GameScreenPage] gameLogic.initGame function not found!");
    }

    // Force le re-rendu de GameContentA et réinitialise l'animation
    setGameKey(prevKey => prevKey + 1);
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    setTimeout(() => setIsRestarting(false), 150); // Cache le chargement

  }, [gameLogic.initGame, gameLogic.resetAdsState, fadeAnim]); // Dépendances

  // --- FONCTION POUR "MENU" ---
  // Navigue vers l'écran d'accueil (index.tsx dans le groupe (tabs))
  const handleActualMenu = useCallback(() => {
    console.log("[GameScreenPage] ACTION: Navigating to Home Screen (Menu)...");

    // Réinitialise l'état des pubs AVANT de quitter
    if (gameLogic.resetAdsState) {
      gameLogic.resetAdsState();
      console.log("[GameScreenPage] Ads state reset before navigating to home");
    } else {
        console.log("[GameScreenPage] resetAdsState function not available.");
    }

    try {
      // Navigue vers la racine du groupe (tabs), qui correspond à /app/(tabs)/index.tsx
      // Utilise replace pour une meilleure navigation (pas de retour vers le jeu)
      router.replace('/(tabs)/');
    } catch (e) {
      console.error("[GameScreenPage] Error navigating to Home Screen:", e);
    }
  }, [router, gameLogic.resetAdsState]); // Dépendances

  // --- Supprimer l'ancienne fonction ---
  // const handleNavigateToVue1 = useCallback(() => { ... }); // Supprimée ou commentée

  useEffect(() => {
    // Animation d'entrée
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [gameKey, fadeAnim]);

  const showLoadingIndicator = (gameKey === 0 && gameLogic.loading) || isRestarting;

  if (showLoadingIndicator || !gameLogic || !gameLogic.user || !gameLogic.currentLevelConfig || !gameLogic.adState) {
     return (
       <View style={[styles.fullScreenContainer, styles.loadingContainer]}>
         <StatusBar translucent backgroundColor="black" barStyle="light-content" />
         <ActivityIndicator size="large" color="#FFFFFF" />
       </View>
     );
   }

  return (
    <View style={styles.fullScreenContainer}>
      <ImageBackground
        source={require('../../assets/images/quipasse3.png')} // Chemin OK
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <StatusBar translucent backgroundColor="black" barStyle="light-content" />
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <GameContentA
            key={gameKey}
            user={gameLogic.user}
            previousEvent={gameLogic.previousEvent}
            displayedEvent={gameLogic.displayedEvent}
            timeLeft={gameLogic.timeLeft}
            error={gameLogic.error}
            isGameOver={gameLogic.isGameOver}
            leaderboardsReady={gameLogic.leaderboardsReady}
            showDates={gameLogic.showDates}
            isCorrect={gameLogic.isCorrect}
            isImageLoaded={gameLogic.isImageLoaded}
            handleChoice={gameLogic.handleChoice}
            handleImageLoad={gameLogic.onImageLoad} // OK

            // --- PASSER LES NOUVELLES FONCTIONS SPÉCIFIQUES ---
            onActualRestart={handleActualRestart} // Pour l'action REJOUER
            onActualMenu={handleActualMenu}       // Pour l'action MENU
            // handleRestartOrClose={...} // Supprimer cette ligne

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
            adState={gameLogic.adState}
            resetAdsState={gameLogic.resetAdsState} // Garder cette prop
          />
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

// --- Styles ---
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