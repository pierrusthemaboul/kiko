// /home/pierre/sword/kiko/app/(tabs)/page.tsx (ou le chemin correct de votre page)

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
// --- CORRECTION DE L'IMPORT ---
// Utilise l'importation nommée pour obtenir l'objet FirebaseAnalytics exporté
import { FirebaseAnalytics } from '@/lib/firebase'; // Vérifie le chemin

export default function GamePage() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [gameKey, setGameKey] = useState(0);
  const [isRestarting, setIsRestarting] = useState(false);

  const gameLogic = useGameLogicA(''); // Assure-toi que '' est le paramètre attendu si nécessaire

  useFocusEffect(
    useCallback(() => {
      try {
        // Cet appel devrait maintenant fonctionner correctement
        FirebaseAnalytics.screen('GameScreen', 'GamePage');
      } catch (error) {
        console.error("Erreur lors de l'appel à FirebaseAnalytics.screen :", error);
        // Optionnel : Tu pourrais aussi tracker cette erreur avec Firebase si besoin
        // FirebaseAnalytics.error('analytics_call_failed', `Error calling screen: ${error.message}`, 'GamePage');
      }
      // La fonction de nettoyage est correcte
      return () => {};
    }, []) // Pas de dépendances nécessaires ici car FirebaseAnalytics et les strings sont stables
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
    setTimeout(() => setIsRestarting(false), 150); // Court délai pour laisser le rendu se faire
  }, [gameLogic.initGame, fadeAnim]); // S'assurer que gameLogic.initGame est stable ou inclus


  // Fonction pour naviguer vers vue1 (utilisée pour "Rejouer" / "Menu")
  const handleNavigateToVue1 = useCallback(() => {
    // (Logique inchangée)
    console.log("[GamePage] 'Rejouer'/'Menu' clicked: Navigating to /vue1");
    try {
       // Utilise replace pour éviter d'empiler les écrans de jeu dans l'historique
       router.replace('/vue1');
    } catch (e) {
      console.error("[GamePage] Error navigating to /vue1:", e);
    }
  }, [router]); // router est généralement stable

  useEffect(() => {
    // Animation d'entrée initiale ou après redémarrage
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [gameKey, fadeAnim]); // Déclenché par gameKey pour le redémarrage

  // Condition pour afficher l'indicateur de chargement
  // - Au premier chargement (gameKey === 0) pendant que gameLogic charge
  // - Pendant le redémarrage manuel (isRestarting)
  const showLoadingIndicator = (gameKey === 0 && gameLogic.loading) || isRestarting;

  // --- Vérification de chargement plus robuste ---
  // S'assurer que les données essentielles sont là avant de tenter le rendu du jeu
  if (showLoadingIndicator || !gameLogic || !gameLogic.user || !gameLogic.currentLevelConfig || !gameLogic.adState) {
     // Log pour débogage si nécessaire
     // console.log("GamePage Loading State:", { showLoadingIndicator, gameLogicExists: !!gameLogic, userExists: !!gameLogic?.user, configExists: !!gameLogic?.currentLevelConfig, adStateExists: !!gameLogic?.adState });
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
        source={require('../../assets/images/quipasse3.png')} // Vérifie le chemin de l'image
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

        {/* Utilisation de SafeAreaView pour gérer les encoches et barres système */}
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          {/* GameContentA reçoit toutes les props nécessaires depuis useGameLogicA */}
          <GameContentA
            key={gameKey} // Force le re-rendu complet lors du redémarrage
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
            handleImageLoad={gameLogic.onImageLoad}
            // Utilise la navigation vers vue1 pour rejouer/menu
            handleRestartOrClose={handleNavigateToVue1}
            streak={gameLogic.streak}
            highScore={gameLogic.highScore}
            level={gameLogic.user.level}
            fadeAnim={fadeAnim} // Passe l'animation pour le contenu
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
    backgroundColor: 'transparent', // Important pour voir le fond d'écran
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Fond semi-transparent pour le chargement
  },
});