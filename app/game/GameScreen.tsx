// /home/pierre/sword/kiko/app/game/page.tsx
// ----- FICHIER CORRIGÉ AVEC LOGIQUE REJOUER AJUSTÉE -----

import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
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
import PrecisionLevelCompleteModal from "../../components/modals/PrecisionLevelCompleteModal";
import EndRunSummary from '@/components/game/EndRunSummary';
import { nextRankProgress } from '@/lib/economy/ranks';

// Hooks
import { useGameLogicA } from '@/hooks/useGameLogicA'; // Chemin OK
import { usePrecisionGame } from '@/hooks/game/usePrecisionGame';
import { useImmersiveMode } from '@/hooks/useImmersiveMode';
import { Logger } from '@/utils/logger';

// Libs
import { FirebaseAnalytics } from '@/lib/firebase'; // Chemin OK
import * as NavigationBar from 'expo-navigation-bar';

// Utils
import { getBackgroundForLevel } from '@/utils/backgroundProgression';

function ClassicGameScreen({ requestedMode }: { requestedMode?: string }) {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [gameKey, setGameKey] = useState(0); // Utilisé pour forcer le re-rendu du contenu du jeu
  const [isRestarting, setIsRestarting] = useState(false); // État pour afficher l'indicateur lors du redémarrage
  const [runState, setRunState] = useState<'pending' | 'ready' | 'error'>('pending');
  const bgFadeAnim = useRef(new Animated.Value(1)).current; // Animation pour transition des backgrounds

  // Activer le mode immersif pour cet écran
  useImmersiveMode(true);

  // Initialise la logique du jeu via le hook personnalisé
  const gameLogic = useGameLogicA('', requestedMode); // Passe une chaîne vide ou l'initialEvent si nécessaire
  const { endSummary, startRun, canStartRun, playsInfo, clearEndSummary } = gameLogic;

  // On utilise un état local pour le background afin d'éviter qu'il ne change 
  // pendant l'animation de fin de niveau (ce qui cause un flash).
  const [displayedLevel, setDisplayedLevel] = useState(gameLogic?.user?.level || 1);

  useEffect(() => {
    // On ne met à jour le background que si on n'est pas en transition de fin de niveau
    if (!gameLogic.triggerLevelEndAnim && gameLogic.user?.level) {
      setDisplayedLevel(gameLogic.user.level);
    }
  }, [gameLogic.user?.level, gameLogic.triggerLevelEndAnim]);

  // Calcule le background en fonction du niveau affiché
  const currentBackground = useMemo(() => {
    return getBackgroundForLevel(displayedLevel);
  }, [displayedLevel]);

  // Effet de transition douce lors du changement de background
  useEffect(() => {
    if (__DEV__ && (console as any).tron) {
      (console as any).tron.log(`🖼️ TRANSITION BACKGROUND - Niveau affiché: ${displayedLevel}`);
    }
    // Fade in simple
    bgFadeAnim.setValue(0.8);
    Animated.timing(bgFadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [currentBackground, bgFadeAnim, displayedLevel]);

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
      return () => { };
    }, [])
  );

  const handleActualRestart = useCallback(async () => {
    // 🔍 REACTOTRON LOG - DÉBUT REJOUER
    if (__DEV__ && console.tron) {
      console.tron.display({
        name: '🎮 REJOUER - DÉBUT',
        preview: 'Utilisateur appuie sur Rejouer',
        value: {
          playsInfo_avant: playsInfo,
          canStartRun_avant: canStartRun,
          timestamp: new Date().toISOString()
        },
        important: true
      });
    }

    setIsRestarting(true);

    // La logique de vérification et de démarrage est maintenant dans le useEffect principal
    if (typeof startRun === 'function') {
      const economyMode: 'classic' | 'date' = gameLogic.gameMode?.variant === 'precision' ? 'date' : 'classic';
      try {
        if (__DEV__ && console.tron) {
          console.tron.log('📞 Appel startRun() - Enregistrement partie en DB');
        }
        const res = await startRun(economyMode);
        if (!res.ok) throw new Error(res.message);
        if (__DEV__ && console.tron) {
          console.tron.log('✅ startRun() terminé - Résultat:', res);
        }
      } catch (runError) {
        if (__DEV__ && console.tron) {
          console.tron.error('❌ Erreur dans startRun:', runError);
        }
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
        if (__DEV__ && console.tron) {
          console.tron.log('📞 Appel gameLogic.initGame()');
        }
        await gameLogic.initGame();
        if (__DEV__ && console.tron) {
          console.tron.log('✅ gameLogic.initGame() terminé');
        }
      } catch (error) {
        if (__DEV__ && console.tron) {
          console.tron.error('❌ Erreur dans initGame:', error);
        }
      }
    }

    setGameKey(prevKey => prevKey + 1);
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    // 🔍 REACTOTRON LOG - FIN REJOUER
    if (__DEV__ && console.tron) {
      console.tron.display({
        name: '🎮 REJOUER - FIN',
        preview: 'Rejouer terminé',
        value: {
          playsInfo_apres: playsInfo,
          canStartRun_apres: canStartRun,
          timestamp: new Date().toISOString()
        },
        important: true
      });
    }

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
      <Animated.View style={[styles.fullScreenContainer, { opacity: bgFadeAnim }]}>
        <ImageBackground
          source={currentBackground}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          {/* Overlay semi-transparent pour ne pas surcharger visuellement */}
          <View style={styles.backgroundOverlay} />
        </ImageBackground>
      </Animated.View>

      <View style={styles.contentContainer}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
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
            triggerLevelEndAnim={gameLogic.triggerLevelEndAnim}
            showLevelTransition={gameLogic.showLevelTransition}
            isLastEventOfLevel={gameLogic.isLastEventOfLevel}
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
      </View>
    </View>
  );
}

function PrecisionGameScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Activer le mode immersif pour cet écran
  useImmersiveMode(true);

  const {
    loading,
    error,
    currentEvent,
    score,
    hp,
    hpMax,
    baseHpCap,
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
    showContinueOffer,
    handleContinueWithAd,
    handleDeclineContinue,
    showLevelComplete,
    levelCompleteData,
    closeLevelComplete,
    eventsAnsweredInLevel,
    eventsRequiredForLevel,
    timerLimit,
    focus,
    adState,
  } = usePrecisionGame();

  useFocusEffect(
    useCallback(() => {
      try {
        FirebaseAnalytics.screen('PrecisionGameScreen', 'PrecisionGameScreen');
        NavigationBar.setVisibilityAsync('hidden').catch(() => undefined);
      } catch (error) {
      }
      return () => { };
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
            <Animated.View style={[styles.flexFill, { opacity: fadeAnim }]}>
              <PrecisionGameContent
                loading={loading}
                error={error}
                currentEvent={currentEvent}
                score={score}
                hp={hp}
                hpMax={hpMax}
                baseHpCap={baseHpCap}
                levelLabel={level.label}
                levelId={level.id}
                levelProgress={levelProgress}
                lastResult={lastResult}
                isGameOver={isGameOver}
                timeLeft={timeLeft}
                timerProgress={timerProgress}
                timerLimit={timerLimit}
                focusGauge={focus.gauge}
                focusLevel={focus.level}
                focusHpBonus={focus.bonusHp}
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
                eventsAnsweredInLevel={eventsAnsweredInLevel}
                eventsRequiredForLevel={eventsRequiredForLevel}
              />

              {/* Level Complete Modal */}
              <PrecisionLevelCompleteModal
                isVisible={showLevelComplete}
                completedLevel={levelCompleteData?.level.id ?? 1}
                completedLevelLabel={levelCompleteData?.level.label ?? ''}
                newLevel={levelCompleteData?.newLevel.id ?? 2}
                newLevelLabel={levelCompleteData?.newLevel.label ?? ''}
                currentScore={levelCompleteData?.score ?? 0}
                hpRestored={levelCompleteData?.hpRestored ?? 0}
                newHpCap={levelCompleteData?.newHpCap ?? hpMax}
                onContinue={closeLevelComplete}
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

  Logger.info('System', `[GameScreenPage] Rendering for mode: ${mode || 'default (classic)'}`);

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
    backgroundColor: '#000',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)', // Un peu plus sombre pour la transition
  },
  contentContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: '#000', // Important pour voir l'image de fond
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
