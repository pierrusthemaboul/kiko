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
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams, useSegments } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

// Composants
import GameContentA from "../../components/game/GameContentA"; // Chemin OK
import PrecisionGameContent from "../../components/game/PrecisionGameContent";
import PrecisionGameOverModal from "../../components/modals/PrecisionGameOverModal";
import EndRunSummary from '@/components/game/EndRunSummary';
import { nextRankProgress } from '@/lib/economy/ranks';

// Hooks
import { useGameLogicA } from '@/hooks/useGameLogicA'; // Chemin OK
import { usePrecisionGame } from '@/hooks/game/usePrecisionGame';

// Libs
import { FirebaseAnalytics } from '@/lib/firebase'; // Chemin OK
import * as NavigationBar from 'expo-navigation-bar';

function ClassicGameScreen({ requestedMode }: { requestedMode?: string }) {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [gameKey, setGameKey] = useState(0); // Utilisé pour forcer le re-rendu du contenu du jeu
  const [isRestarting, setIsRestarting] = useState(false); // État pour afficher l'indicateur lors du redémarrage
  const [runState, setRunState] = useState<'pending' | 'ready' | 'error'>('pending');

  // Initialise la logique du jeu via le hook personnalisé
  const gameLogic = useGameLogicA('', requestedMode); // Passe une chaîne vide ou l'initialEvent si nécessaire
  const { endSummary, startRun, canStartRun, playsInfo, clearEndSummary } = gameLogic;

  useEffect(() => {
    const initializeRun = async () => {
      if (typeof startRun !== 'function') {
        setRunState('error');
        Alert.alert('Erreur', 'La fonction de démarrage du jeu est indisponible.');
        return;
      }

      try {
        const economyMode: 'classic' | 'date' = gameLogic.gameMode?.variant === 'precision' ? 'date' : 'classic';
        const res = await startRun(economyMode);

        if (res.ok) {
          setRunState('ready');
        } else {
          setRunState('error');
          Alert.alert('Démarrage impossible', res.message, [
            { text: 'OK', onPress: () => router.back() },
          ]);
        }
      } catch (err) {
        setRunState('error');
        Alert.alert('Erreur', err instanceof Error ? err.message : 'Erreur inconnue', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    };

    initializeRun();
  }, []);

  const handleCloseEndSummary = useCallback(() => {
    clearEndSummary?.();
  }, [clearEndSummary]);

  const next = endSummary
    ? (() => {
        const prog = nextRankProgress(endSummary.newXp);
        if (!prog.next) return null;
        const denom = Math.max(1, prog.progress + prog.needed);
        return {
          label: prog.next.label,
          xpNeeded: Math.max(0, prog.needed),
          pct: Math.round((prog.progress / denom) * 100),
        };
      })()
    : null;

  // Log analytics quand l'écran prend le focus
  useFocusEffect(
    useCallback(() => {
      try {
        FirebaseAnalytics.screen('GameScreen', 'GameScreenPage');
        NavigationBar.setVisibilityAsync('hidden').catch(() => undefined);
      } catch (error) {
      }
      return () => {};
    }, [])
  );

  const handleActualRestart = useCallback(async () => {
    setIsRestarting(true);

    // La logique de vérification et de démarrage est maintenant dans le useEffect principal
    if (typeof startRun === 'function') {
      const economyMode: 'classic' | 'date' = gameLogic.gameMode?.variant === 'precision' ? 'date' : 'classic';
      try {
        const res = await startRun(economyMode);
        if (!res.ok) throw new Error(res.message);
      } catch (runError) {
      }
    }

    if (gameLogic.resetAdsState) {
      gameLogic.resetAdsState();
    }

    if (gameLogic.resetGameFlowState) {
      gameLogic.resetGameFlowState();
    }

    if (gameLogic.initGame) {
      try {
        await gameLogic.initGame();
      } catch (error) {
      }
    }

    setGameKey(prevKey => prevKey + 1);
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    setTimeout(() => setIsRestarting(false), 150);

  }, [
    gameLogic.initGame,
    gameLogic.resetAdsState,
    gameLogic.resetGameFlowState,
    gameLogic.gameMode,
    startRun,
    canStartRun,
    playsInfo,
    fadeAnim,
  ]);

  const handleActualMenu = useCallback(() => {
    if (gameLogic.resetAdsState) {
      gameLogic.resetAdsState();
    }

    try {
      router.replace('/(tabs)/');
    } catch (e) {
    }
  }, [router, gameLogic.resetAdsState]);

  // Animation d'entrée initiale et lors du changement de clé (redémarrage)
  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [gameKey, fadeAnim]); // Se déclenche au montage et quand gameKey change

  // Détermine quand afficher l'indicateur de chargement principal
  const showLoadingIndicator = runState === 'pending' || (gameKey === 0 && gameLogic.loading) || isRestarting;

  // Affiche l'indicateur de chargement si le jeu s'initialise, redémarre, ou si des données essentielles manquent
  if (showLoadingIndicator || runState !== 'ready' || !gameLogic || !gameLogic.user || !gameLogic.currentLevelConfig || !gameLogic.adState) {
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
            isAdLoaded={gameLogic.isAdLoaded} // Vérification native de chargement des pubs
            completeRewardAnimation={gameLogic.completeRewardAnimation}
            updateRewardPosition={gameLogic.updateRewardPosition}
            // Props d'animation/modales
            fadeAnim={fadeAnim}
            showLevelModal={gameLogic.showLevelModal}
            gameMode={gameLogic.gameMode}
            timeLimit={gameLogic.timeLimit}
          />

        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

function PrecisionGameScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const {
    loading,
    error,
    currentEvent,
    score,
    hp,
    hpMax,
    level,
    levelProgress,
    lastResult,
    isGameOver,
    timeLeft,
    timerProgress,
    pauseTimer,
    resumeTimer,
    submitGuess,
    loadNextEvent,
    restart,
    reload,
    personalBest,
    playerName,
    leaderboards,
    leaderboardsReady,
  } = usePrecisionGame();

  useFocusEffect(
    useCallback(() => {
      try {
        FirebaseAnalytics.screen('PrecisionGameScreen', 'PrecisionGameScreen');
        NavigationBar.setVisibilityAsync('hidden').catch(() => undefined);
      } catch (error) {
      }
      return () => {};
    }, [])
  );

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim, currentEvent?.id, lastResult?.event.id]);

  const handleMenu = useCallback(() => {
    router.replace('/(tabs)/');
  }, [router]);

  const showBlockingLoader = loading && !currentEvent && !error;

  return (
    <View style={styles.fullScreenContainer}>
      <ImageBackground
        source={require('../../assets/images/quipasse3.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <StatusBar translucent backgroundColor="black" barStyle="light-content" />
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          {showBlockingLoader ? (
            <View style={[styles.flexFill, styles.loadingContainer]}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          ) : (
            <Animated.View style={[styles.flexFill, { opacity: fadeAnim }] }>
              <PrecisionGameContent
                loading={loading}
                error={error}
                currentEvent={currentEvent}
                score={score}
                hp={hp}
                hpMax={hpMax}
                levelLabel={level.label}
                levelId={level.id}
                levelProgress={levelProgress}
                lastResult={lastResult}
                isGameOver={isGameOver}
                timeLeft={timeLeft}
                timerProgress={timerProgress}
                pauseTimer={pauseTimer}
                resumeTimer={resumeTimer}
                onSubmitGuess={submitGuess}
                onContinue={loadNextEvent}
                onReload={reload}
                onRestart={restart}
                onExit={handleMenu}
                showContinueOffer={showContinueOffer}
                onContinueWithAd={handleContinueWithAd}
                onDeclineContinue={handleDeclineContinue}
                continueAdLoaded={adState?.continueLoaded}
              />

              {/* Game Over Modal */}
              <PrecisionGameOverModal
                isVisible={isGameOver && leaderboardsReady}
                finalScore={score}
                personalBest={personalBest}
                levelReached={level.label}
                levelId={level.id}
                onRestart={restart}
                onMenuPress={handleMenu}
                playerName={playerName}
                dailyScores={leaderboards.daily}
                monthlyScores={leaderboards.monthly}
                allTimeScores={leaderboards.allTime}
              />
            </Animated.View>
          )}
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

export default function GameScreenPage() {
  const params = useLocalSearchParams();
  const segments = useSegments();
  const rawMode = (params as { mode?: string | string[] }).mode;
  const resolvedMode = Array.isArray(rawMode) ? rawMode[rawMode.length - 1] : rawMode;
  const mode = typeof resolvedMode === 'string' ? resolvedMode.toLowerCase() : undefined;

  if (mode === 'precision') {
    return <PrecisionGameScreen />;
  }

  const requestedMode = mode;
  return <ClassicGameScreen requestedMode={requestedMode} />;
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
flexFill: {
  flex: 1,
},
loadingContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.7)', // Fond semi-transparent pour le chargement
},
});
