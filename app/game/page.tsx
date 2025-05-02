// /home/pierre/sword/kiko/app/game/page.tsx
// ----- FICHIER CORRIGÉ AVEC LOGIQUE REJOUER AJUSTÉE -----

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
  const [gameKey, setGameKey] = useState(0); // Utilisé pour forcer le re-rendu du contenu du jeu
  const [isRestarting, setIsRestarting] = useState(false); // État pour afficher l'indicateur lors du redémarrage

  // Initialise la logique du jeu via le hook personnalisé
  const gameLogic = useGameLogicA(''); // Passe une chaîne vide ou l'initialEvent si nécessaire

  // Log analytics quand l'écran prend le focus
  useFocusEffect(
    useCallback(() => {
      try {
        FirebaseAnalytics.screen('GameScreen', 'GameScreenPage'); // Nom du fichier/écran
      } catch (error) {
        console.error("Erreur lors de l'appel à FirebaseAnalytics.screen :", error);
      }
      return () => {}; // Fonction de nettoyage (optionnelle)
    }, [])
  );

  // --- FONCTION POUR "REJOUER" ---
  // Appelle les fonctions de réinitialisation du hook useGameLogicA
  const handleActualRestart = useCallback(async () => {
    console.log("[GameScreenPage] ACTION: Restarting game state (Rejouer)...");
    setIsRestarting(true); // Affiche l'indicateur de chargement

    // 1. Réinitialise l'état des publicités (si la fonction existe)
    if (gameLogic.resetAdsState) {
      gameLogic.resetAdsState();
      console.log("[GameScreenPage] Ads state reset.");
    } else {
      console.warn("[GameScreenPage] resetAdsState function not available in gameLogic.");
    }

    // 2. Réinitialise l'état de contrôle du jeu (isGameOver, isPaused, streak, etc.)
    if (gameLogic.resetGameFlowState) {
      gameLogic.resetGameFlowState();
      console.log("[GameScreenPage] Game flow state reset.");
    } else {
      console.warn("[GameScreenPage] resetGameFlowState function not found in gameLogic!");
    }

    // 3. Réinitialise les données du jeu et sélectionne les événements initiaux
    if (gameLogic.initGame) {
      try {
        await gameLogic.initGame(); // Réinitialise user, events, etc.
        console.log("[GameScreenPage] Game logic data re-initialized.");
      } catch (error) {
         console.error("[GameScreenPage] Error during initGame on restart:", error);
         // Vous pourriez vouloir afficher une erreur à l'utilisateur ici via gameLogic.setError ou un état local
         // gameLogic.setError("Impossible de redémarrer la partie."); // Exemple
      }
    } else {
      console.warn("[GameScreenPage] gameLogic.initGame function not found!");
    }

    // 4. Force le re-rendu du composant GameContentA via la clé et réinitialise l'animation d'entrée
    setGameKey(prevKey => prevKey + 1);
    fadeAnim.setValue(0); // Remet l'opacité à 0 pour l'animation d'entrée
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    // Cache l'indicateur de chargement après un court délai pour laisser le temps au re-rendu
    setTimeout(() => setIsRestarting(false), 150);

  }, [gameLogic.initGame, gameLogic.resetAdsState, gameLogic.resetGameFlowState, fadeAnim]);

  // --- FONCTION POUR "MENU" ---
  // Navigue vers l'écran d'accueil (index.tsx dans le groupe (tabs))
  const handleActualMenu = useCallback(() => {
    console.log("[GameScreenPage] ACTION: Navigating to Home Screen (Menu)...");

    // Réinitialise l'état des pubs AVANT de quitter l'écran de jeu (bonne pratique)
    if (gameLogic.resetAdsState) {
      gameLogic.resetAdsState();
      console.log("[GameScreenPage] Ads state reset before navigating to home");
    } else {
        console.warn("[GameScreenPage] resetAdsState function not available.");
    }

    try {
      // Navigue vers la racine du groupe (tabs), qui est généralement gérée par /app/(tabs)/_layout.tsx et pointe vers index.tsx
      // Utilise 'replace' pour enlever l'écran de jeu de l'historique de navigation (l'utilisateur ne pourra pas "revenir" au jeu terminé)
      router.replace('/(tabs)/');
    } catch (e) {
      console.error("[GameScreenPage] Error navigating to Home Screen:", e);
    }
  }, [router, gameLogic.resetAdsState]); // Dépendances

  // Animation d'entrée initiale et lors du changement de clé (redémarrage)
  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [gameKey, fadeAnim]); // Se déclenche au montage et quand gameKey change

  // Détermine quand afficher l'indicateur de chargement principal
  const showLoadingIndicator = (gameKey === 0 && gameLogic.loading) || isRestarting;

  // Affiche l'indicateur de chargement si le jeu s'initialise, redémarre, ou si des données essentielles manquent
  if (showLoadingIndicator || !gameLogic || !gameLogic.user || !gameLogic.currentLevelConfig || !gameLogic.adState) {
     return (
       <View style={[styles.fullScreenContainer, styles.loadingContainer]}>
         <StatusBar translucent backgroundColor="black" barStyle="light-content" />
         <ActivityIndicator size="large" color="#FFFFFF" />
       </View>
     );
   }

// Rendu principal de l'écran de jeu
return (
  <View style={styles.fullScreenContainer}>
    <ImageBackground
      source={require('../../assets/images/quipasse3.png')} // Chemin relatif OK
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <StatusBar translucent backgroundColor="black" barStyle="light-content" />
      {/* SafeAreaView pour gérer les encoches et barres système */}
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Composant qui contient l'UI et la logique d'affichage du jeu */}
        <GameContentA
          key={gameKey} // La clé change pour forcer le re-montage/re-rendu au redémarrage
          // Props d'état du jeu
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
          streak={gameLogic.streak}
          highScore={gameLogic.highScore}
          level={gameLogic.user.level}
          isLevelPaused={gameLogic.isLevelPaused}
          currentLevelConfig={gameLogic.currentLevelConfig}
          leaderboards={gameLogic.leaderboards}
          levelCompletedEvents={gameLogic.levelCompletedEvents}
          levelsHistory={gameLogic.levelsHistory}
          currentReward={gameLogic.currentReward}
          adState={gameLogic.adState} // État des pubs
          // Props de callbacks (actions)
          handleChoice={gameLogic.handleChoice}
          handleImageLoad={gameLogic.onImageLoad} // Fonction du useTimer
          handleLevelUp={gameLogic.handleLevelUp}
          onActualRestart={handleActualRestart} // <- Fonction Rejouer corrigée
          onActualMenu={handleActualMenu}       // <- Fonction Menu
          showRewardedAd={gameLogic.showRewardedAd}
          resetAdsState={gameLogic.resetAdsState} // Fonction reset pubs
          completeRewardAnimation={gameLogic.completeRewardAnimation}
          updateRewardPosition={gameLogic.updateRewardPosition}
          // Props d'animation/modales
          fadeAnim={fadeAnim}
          showLevelModal={gameLogic.showLevelModal}
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
  backgroundColor: 'transparent', // Important pour voir l'image de fond
},
loadingContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.7)', // Fond semi-transparent pour le chargement
},
});