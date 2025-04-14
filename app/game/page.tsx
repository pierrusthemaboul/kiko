import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  StyleSheet,
  Animated,
  StatusBar,
  ImageBackground,
  View,
  ActivityIndicator
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

// Composants
import GameContentA from "../../components/game/GameContentA";

// Hooks
import { useGameLogicA } from '@/hooks/useGameLogicA';

// Libs
import * as FirebaseAnalytics from '@/lib/firebase';

export default function GamePage() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [gameKey, setGameKey] = useState(0);
  // Ajout d'un état pour gérer le chargement pendant le redémarrage
  const [isRestarting, setIsRestarting] = useState(false);

  const gameLogic = useGameLogicA('');

  useFocusEffect(
    useCallback(() => {
      // ... (code focus effect inchangé)
      try {
        if (FirebaseAnalytics && typeof FirebaseAnalytics.screen === 'function') {
          FirebaseAnalytics.screen('GameScreen', 'GamePage');
        } else {
          // Gardé car lié directement à l'échec de l'appel analytics
          console.warn('FirebaseAnalytics.screen n\'est pas une fonction au moment de l\'appel dans useFocusEffect.');
        }
      } catch (error) {
        // Gardé car lié directement à l'erreur de l'appel analytics
        console.error("Erreur lors de l'appel à FirebaseAnalytics.screen :", error);
      }
    }, [])
  );

  const handleRestartGame = useCallback(async () => { // Rendre la fonction async
    setIsRestarting(true); // Indiquer qu'on redémarre

    // 1. Forcer la réinitialisation de l'état logique D'ABORD
    if (gameLogic.initGame) {
      try {
        await gameLogic.initGame(); // Attend que l'initialisation de base soit faite
      } catch (error) {
        // Gérer l'erreur si nécessaire, peut-être afficher un message
      }
    }

    // 2. Changer la clé pour forcer le remontage UI APRES réinitialisation logique
    setGameKey(prevKey => prevKey + 1);

    // 3. Gérer l'animation et l'état de redémarrage
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    // On remet isRestarting à false après un court délai pour laisser le temps au rendu
    setTimeout(() => setIsRestarting(false), 100);

  }, [gameLogic.initGame, fadeAnim]);


  useEffect(() => {
    // Joue l'animation au montage initial ET quand la clé change
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [gameKey, fadeAnim]);

  // --- Condition de Chargement Améliorée ---
  // Afficher indicateur si:
  // - Chargement initial du hook ET c'est la première clé (gameKey === 0)
  // - OU si on est en train de redémarrer explicitement (isRestarting === true)
  const showLoading = (gameKey === 0 && gameLogic.loading) || isRestarting;

  if (showLoading || !gameLogic || !gameLogic.user || !gameLogic.currentLevelConfig || !gameLogic.adState) {
     return (
       <View style={[styles.fullScreenContainer, styles.loadingContainer]}>
         <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
         <ActivityIndicator size="large" color="#FFFFFF" />
       </View>
     );
   }

  // --- Affichage principal du jeu ---
  return (
    <View style={styles.fullScreenContainer}>
      <ImageBackground
        source={require('../../assets/images/quipasse3.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <GameContentA
            key={gameKey}
            user={gameLogic.user}
            previousEvent={gameLogic.previousEvent}
            newEvent={gameLogic.newEvent}
            timeLeft={gameLogic.timeLeft}
            // Le loading interne du hook sera géré par sa propre logique après remontage
            loading={false} // On a passé l'étape de chargement de GamePage
            error={gameLogic.error}
            isGameOver={gameLogic.isGameOver} // Sera false car initGame l'a remis à false
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
            showRewardedAd={gameLogic.showRewardedAd}
            isAdFreePeriod={gameLogic.adState.isAdFree}
          />
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

// Styles (inchangés)
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    // Assurer qu'il est au-dessus de tout si besoin (si zIndex pose problème ailleurs)
    // positions: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999
  },
});