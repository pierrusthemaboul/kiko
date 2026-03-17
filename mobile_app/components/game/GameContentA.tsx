// /home/pierre/sword/kiko/components/game/GameContentA.tsx
// ----- VERSION COMPLÈTE AVEC MODIFICATIONS INTÉGRÉES -----

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Animated,
  StyleSheet,
  Platform,
  StatusBar,
  SafeAreaView, // Bien que non utilisé directement ici, on garde l'import au cas où
  TouchableOpacity,
  Alert,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router'; // Gardé si jamais utilisé ailleurs, sinon peut être enlevé
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Components
import UserInfo, { UserInfoHandle } from './UserInfo';
import Countdown from './Countdown';
import EventLayoutA from './EventLayoutA'; // Assurez-vous que ce chemin est correct
import LevelUpModalBis from '../modals/LevelUpModalBis';
import ScoreboardModal from '../modals/ScoreboardModal';
import RewardAnimation from './RewardAnimation';
import { Logger } from '@/utils/logger';

// Types & Constants
import { colors } from '@/constants/Colors';
import { GameModeConfig } from '@/constants/gameModes';
import type {
  User,
  Event,
  ExtendedLevelConfig,
  LevelEventSummary,
} from '@/hooks/types'; // Assurez-vous que ce chemin est correct
import { RewardType } from '@/hooks/types';

// Interface pour l'historique des niveaux (si non définie ailleurs)
interface LevelHistory {
  level: number;
  events: LevelEventSummary[];
}

// --- Interface pour l'état publicitaire attendu ---
interface AdStateForContent {
  rewardedLoaded: boolean;
  hasWatchedRewardedAd: boolean;
  isAdFree?: boolean;
}

// --- Interface des Props Mises à Jour ---
interface GameContentAProps {
  user: User | null;
  timeLeft: number;
  loading?: boolean; // Peut-être toujours utile pour un état de chargement interne
  error: string | null;
  previousEvent: Event | null;
  displayedEvent: Event | null;
  isGameOver: boolean;
  leaderboardsReady: boolean;
  showDates: boolean;
  isCorrect?: boolean;
  isImageLoaded: boolean;
  handleChoice: (choice: 'avant' | 'après') => void;
  handleImageLoad: () => void;
  streak: number;
  highScore: number;
  level: number;
  fadeAnim: Animated.Value; // Animation gérée par le parent
  showLevelModal: boolean;
  showLevelTransition: boolean;
  triggerLevelEndAnim: boolean;
  isLevelPaused: boolean;
  isLastEventOfLevel: boolean;
  handleLevelUp: () => void;
  currentLevelConfig: ExtendedLevelConfig;
  currentReward: {
    type: RewardType;
    amount: number;
    targetPosition?: { x: number; y: number };
  } | null;
  completeRewardAnimation: () => void;
  updateRewardPosition: (position: { x: number; y: number }) => void;
  leaderboards?: {
    daily: Array<{ name: string; score: number; rank: number }>;
    monthly: Array<{ name: string; score: number; rank: number }>;
    allTime: Array<{ name: string; score: number; rank: number }>;
  };
  levelCompletedEvents: LevelEventSummary[];
  levelsHistory: LevelHistory[];
  showRewardedAd?: () => boolean;
  adState: AdStateForContent;
  resetAdsState?: () => void;

  // --- MODIFICATION : Remplacer handleRestartOrClose ---
  // handleRestartOrClose: () => void; // SUPPRIMÉ
  onActualRestart: () => void;     // NOUVELLE prop pour REJOUER
  onActualMenu: () => void;        // NOUVELLE prop pour MENU
  // ----------------------------------------------------
  isAdLoaded: (adType: 'rewarded' | 'interstitial' | 'levelUp' | 'gameOver') => boolean;
  gameMode: GameModeConfig;
  timeLimit: number;
}

function GameContentA({
  user,
  timeLeft,
  // loading, // Commenté car géré par le parent via showLoadingIndicator
  error,
  previousEvent,
  displayedEvent,
  isGameOver,
  leaderboardsReady,
  showDates,
  isCorrect,
  isImageLoaded,
  handleChoice,
  handleImageLoad,
  streak,
  highScore,
  level,
  fadeAnim, // Reçu du parent
  showLevelModal,
  showLevelTransition,
  triggerLevelEndAnim,
  isLevelPaused,
  isLastEventOfLevel,
  handleLevelUp,
  currentLevelConfig,
  currentReward,
  completeRewardAnimation,
  updateRewardPosition,
  leaderboards,
  levelCompletedEvents,
  levelsHistory,
  showRewardedAd,
  adState,
  resetAdsState, // Reçu du parent

  // --- MODIFICATION : Récupérer les nouvelles props ---
  onActualRestart,
  onActualMenu,
  // handleRestartOrClose, // Ne plus récupérer
  // ----------------------------------------------------
  isAdLoaded,
  gameMode,
  timeLimit,
}: GameContentAProps) {
  const router = useRouter(); // Gardé, même si non utilisé directement ici
  const userInfoRef = useRef<UserInfoHandle>(null);
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const [isRewardPositionSet, setIsRewardPositionSet] = useState(false);

  // --- États pour gérer l'affichage conditionnel de fin de partie ---
  const [showWatchAdOffer, setShowWatchAdOffer] = useState(false);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [isLoadingAd, setIsLoadingAd] = useState(false);

  const isInitialRenderRef = useRef(true); // Pour l'animation d'EventLayoutA

  // --- MODIFICATION : Supprimer l'ancien handleRestart wrapper ---
  // const handleRestart = useCallback(() => { ... }); // SUPPRIMÉ
  // ------------------------------------------------------------

  // --- MODIFICATION : Nouveaux handlers internes pour les boutons du modal ---
  // Handler pour le bouton "Rejouer" du modal
  const handleModalRestart = useCallback(() => {
    Logger.info('GameLogic', "[GameContentA] Modal 'Rejouer' clicked. Resetting ads and calling parent restart logic.");
    if (resetAdsState) {
      resetAdsState(); // Réinitialise les pubs si la fonction existe
    }
    onActualRestart(); // Appelle la fonction de redémarrage fournie par le parent (GameScreenPage)
  }, [onActualRestart, resetAdsState]);

  // Handler pour le bouton "Menu" du modal
  const handleModalMenu = useCallback(() => {
    Logger.info('GameLogic', "[GameContentA] Modal 'Menu' clicked. Resetting ads and calling parent menu logic.");
    if (resetAdsState) {
      resetAdsState(); // Réinitialise les pubs si la fonction existe
    }
    onActualMenu(); // Appelle la fonction de retour au menu fournie par le parent (GameScreenPage)
  }, [onActualMenu, resetAdsState]);
  // ------------------------------------------------------------------------

  // --- Effet pour obtenir la position des éléments pour l'animation de récompense ---
  // (Logique inchangée)
  useEffect(() => {
    let mounted = true;
    let attempts = 0;
    const MAX_ATTEMPTS = 3;

    const updateRewardPositionSafely = async () => {
      if (!currentReward || !userInfoRef.current || !mounted || !user) {
        // console.log("[GameContentA] Cannot update reward position - prerequisites not met");
        return;
      }

      try {
        // console.log(`[GameContentA] Getting position for reward type: ${currentReward.type}`);
        const position = currentReward.type === RewardType.EXTRA_LIFE
          ? await userInfoRef.current.getLifePosition()
          : await userInfoRef.current.getPointsPosition();

        if (mounted && position && typeof position.x === 'number' && typeof position.y === 'number') {
          // console.log(`[GameContentA] Got valid position: x=${position.x}, y=${position.y}`);
          const positionChanged =
            !currentReward.targetPosition ||
            Math.abs(currentReward.targetPosition.x - position.x) > 5 ||
            Math.abs(currentReward.targetPosition.y - position.y) > 5;

          if (positionChanged) {
            // console.log(`[GameContentA] Updating reward position`);
            updateRewardPosition(position);
            setIsRewardPositionSet(true);
          } else {
            // console.log("[GameContentA] Position unchanged, no update needed");
            setIsRewardPositionSet(true);
          }
        } else {
          // console.warn("[GameContentA] getPosition returned invalid position:", position);
          if (attempts < MAX_ATTEMPTS) {
            attempts++;
          } else {
            // console.log("[GameContentA] Using fallback position after failed attempts");
            const fallbackPosition = currentReward.type === RewardType.EXTRA_LIFE
              ? { x: Dimensions.get('window').width * 0.80, y: 50 }
              : { x: Dimensions.get('window').width * 0.20, y: 50 };
            updateRewardPosition(fallbackPosition);
            setIsRewardPositionSet(true);
          }
        }
      } catch (e) {
        // console.warn("[GameContentA] Error getting element position:", e);
        if (attempts < MAX_ATTEMPTS) {
          attempts++;
        } else {
          // console.log("[GameContentA] Using fallback position after error");
          const fallbackPosition = currentReward.type === RewardType.EXTRA_LIFE
            ? { x: Dimensions.get('window').width * 0.80, y: 50 }
            : { x: Dimensions.get('window').width * 0.20, y: 50 };
          updateRewardPosition(fallbackPosition);
          setIsRewardPositionSet(true);
        }
      }
    };

    updateRewardPositionSafely();
    const timers: any[] = [];
    for (let i = 1; i <= MAX_ATTEMPTS; i++) {
      const timer = setTimeout(() => {
        if (mounted && currentReward && !isRewardPositionSet) { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
          // console.log(`[GameContentA] Retry ${i}/${MAX_ATTEMPTS} for position update`);
          updateRewardPositionSafely();
        }
      }, i * 300);
      timers.push(timer);
    }

    return () => {
      mounted = false;
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [currentReward, updateRewardPosition, user, isRewardPositionSet]); // Dépendances inchangées

  // --- Animation d'opacité pour le modal de niveau ---
  // (Logique inchangée)
  useEffect(() => {
    if (showLevelModal) {
      Animated.sequence([
        Animated.timing(contentOpacity, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        Animated.timing(contentOpacity, { toValue: 1, duration: 300, delay: 1000, useNativeDriver: true }),
      ]).start();
    } else {
      contentOpacity.setValue(1);
    }
  }, [showLevelModal, contentOpacity]);

  // --- Effet pour gérer la fin de partie et l'offre de publicité ---
  // Utilise isAdLoaded pour vérifier directement l'instance native
  useEffect(() => {
    if (isGameOver && user) {
      const canOfferAd =
        user.lives === 0 &&
        showRewardedAd &&
        isAdLoaded('rewarded') &&
        !adState.hasWatchedRewardedAd;

      if (canOfferAd) {
        setShowWatchAdOffer(true);
        setShowScoreboard(false);
      } else if (user.lives === 0) {
        setShowWatchAdOffer(false);
        setShowScoreboard(true); // Afficher le scoreboard si pas de pub ou déjà vue
      } else {
        // Cas où le jeu est fini mais le joueur a encore des vies (ne devrait pas arriver logiquement, mais sécurité)
        setShowWatchAdOffer(false);
        setShowScoreboard(false); // Ne rien montrer dans ce cas étrange
      }
    } else if (!isGameOver) {
      // S'assurer que tout est caché si le jeu n'est pas terminé
      setShowWatchAdOffer(false);
      setShowScoreboard(false);
    }
  }, [isGameOver, user, adState, showRewardedAd, isAdLoaded]); // Ajout de isAdLoaded aux dépendances

  // --- Effet pour réinitialiser l'état de chargement de la pub ---
  useEffect(() => {
    if (showScoreboard || !isGameOver) {
      setIsLoadingAd(false);
    }
  }, [showScoreboard, isGameOver]);

  // --- Effet pour marquer la fin du premier rendu significatif ---
  // (Logique inchangée)
  useEffect(() => {
    if (previousEvent && displayedEvent && isInitialRenderRef.current) {
      const timer = setTimeout(() => {
        isInitialRenderRef.current = false;
      }, 0);
      return () => clearTimeout(timer);
    }
    if (!previousEvent && !displayedEvent && !error && user) {
      // isInitialRenderRef.current = true; // Commenté
    }
  }, [previousEvent, displayedEvent, error, user]);

  // --- Fonctions pour gérer l'interaction avec l'offre de publicité ---
  // (Logique inchangée)
  const handleWatchAd = () => {
    console.log('[GameContentA] handleWatchAd appelé');
    console.log('[GameContentA] showRewardedAd existe:', !!showRewardedAd);
    console.log('[GameContentA] isAdLoaded(rewarded):', isAdLoaded?.('rewarded'));

    if (showRewardedAd) {
      console.log('[GameContentA] Appel de showRewardedAd()...');
      setIsLoadingAd(true); // Activer l'indicateur de chargement

      const adTriggered = showRewardedAd();
      console.log('[GameContentA] showRewardedAd() retourné:', adTriggered);

      if (adTriggered) {
        console.log('[GameContentA] Pub déclenchée avec succès, masquage de l\'offre');
        setShowWatchAdOffer(false); // Cacher l'offre pendant que la pub tourne
        // L'indicateur de chargement restera actif jusqu'à ce que la pub s'affiche
      } else {
        console.log('[GameContentA] La pub n\'a pas pu être déclenchée');
        setIsLoadingAd(false); // Désactiver l'indicateur
        Alert.alert("Oups !", "Impossible de lancer la publicité pour le moment.", [{ text: "OK" }]);
        setShowWatchAdOffer(false);
        setShowScoreboard(true); // Afficher le scoreboard si la pub échoue à démarrer
      }
    } else {
      console.log('[GameContentA] showRewardedAd n\'existe pas!');
      setShowWatchAdOffer(false);
      setShowScoreboard(true); // Afficher le scoreboard si la fonction showRewardedAd n'existe pas
    }
  };

  const handleDeclineWatchAd = () => {
    setShowWatchAdOffer(false);
    setShowScoreboard(true); // Afficher le scoreboard si le joueur refuse
  };

  // --- Rendu Principal du Contenu ---
  const renderContent = () => {
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          {/* --- MODIFICATION : Le bouton Retour doit appeler handleModalMenu --- */}
          {/* Si une erreur survient, on propose généralement de retourner au menu */}
          <TouchableOpacity onPress={handleModalMenu} style={styles.errorButton}>
            <Text style={styles.errorButtonText}>Retour au Menu</Text>
          </TouchableOpacity>
          {/* -------------------------------------------------------------------- */}
        </View>
      );
    }

    // L'indicateur de chargement est maintenant géré par le parent (GameScreenPage)
    // Donc plus besoin de la condition `!user || (!previousEvent && !displayedEvent)` ici
    // si le parent le gère déjà. Si tu veux garder un chargement interne :
    // if (!user || (!previousEvent && !displayedEvent)) { ... }

    return (
      <>
        {/* --- Layout Principal des Événements --- */}
        <EventLayoutA
          previousEvent={previousEvent}
          newEvent={displayedEvent}
          onImageLoad={handleImageLoad}
          onChoice={handleChoice}
          showDate={showDates}
          isCorrect={isCorrect}
          isImageLoaded={isImageLoaded}
          streak={streak}
          level={level}
          isLevelPaused={isLevelPaused}
          triggerLevelEndAnim={triggerLevelEndAnim}
          isInitialRender={isInitialRenderRef.current}
          isLastEventOfLevel={isLastEventOfLevel}
        />



        {/* --- Modal de Level Up --- */}
        <LevelUpModalBis
          visible={showLevelModal}
          level={level}
          onStart={handleLevelUp}
          onReturnToMenu={onActualMenu}
          name={currentLevelConfig.name || `Niveau ${level}`}
          description={currentLevelConfig.description || ''}
          requiredEvents={currentLevelConfig.eventsNeeded}
          specialRules={currentLevelConfig.specialRules}
          previousLevel={level > 1 ? level - 1 : undefined}
          isNewLevel={level > 1}
          eventsSummary={levelCompletedEvents}
        />

        {/* --- Modal Tableau des Scores --- */}
        {/* --- MODIFICATION : Props onPress mises à jour --- */}
        <ScoreboardModal
          isVisible={isGameOver && showScoreboard}
          currentScore={user?.points ?? 0} // Sécurité si user peut être null ici
          personalBest={highScore}
          // isLoadingScores={!leaderboardsReady && isGameOver} // Prop originale
          onRestart={handleModalRestart} // Utilise le nouveau handler pour REJOUER
          onMenuPress={handleModalMenu}  // Utilise le nouveau handler pour MENU
          playerName={user?.name ?? 'Joueur'} // Sécurité
          levelsHistory={levelsHistory}
          dailyScores={leaderboards?.daily || []}
          monthlyScores={leaderboards?.monthly || []}
          allTimeScores={leaderboards?.allTime || []}
        />
        {/* ------------------------------------------------- */}

        {/* --- Overlay pour l'offre de Publicité Récompensée --- */}
        {/* (Logique inchangée) */}
        {isGameOver && showWatchAdOffer && (
          <View style={styles.watchAdOverlay}>
            <View style={styles.watchAdContainer}>
              <View style={styles.watchAdIconContainer}>
                <Ionicons name="heart" size={50} color={colors.incorrectRed} />
              </View>
              <Text style={styles.watchAdTitle}>Dernière vie perdue !</Text>
              <Text style={styles.watchAdDescription}>
                Regardez une courte publicité pour obtenir une vie supplémentaire et continuer votre partie.
              </Text>
              <View style={styles.watchAdButtonsContainer}>
                <TouchableOpacity
                  style={[styles.watchAdButton, styles.watchAdDeclineButton]}
                  onPress={handleDeclineWatchAd}
                  disabled={isLoadingAd}
                >
                  <Text style={styles.watchAdDeclineText}>Non, merci</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.watchAdButton, styles.watchAdAcceptButton, isLoadingAd && styles.watchAdButtonDisabled]}
                  onPress={handleWatchAd}
                  disabled={isLoadingAd}
                >
                  {isLoadingAd ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons name="play-circle-outline" size={20} color="white" style={styles.watchAdButtonIcon} />
                      <Text style={styles.watchAdAcceptText}>D'accord !</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* --- Overlay de chargement pour la publicité --- */}
        {isLoadingAd && !showWatchAdOffer && (
          <View style={styles.loadingAdOverlay}>
            <View style={styles.loadingAdContainer}>
              <ActivityIndicator size="large" color={colors.correctGreen} />
              <Text style={styles.loadingAdText}>Chargement de la publicité...</Text>
            </View>
          </View>
        )}
      </>
    );
  };

  // --- Rendu du Composant Principal ---
  return (
    // Le conteneur principal et l'animation fadeAnim sont gérés par le parent,
    // donc on peut simplifier ici. Le parent applique déjà l'animation.
    <View style={styles.container}>
      {/* La barre de statut est gérée par le parent */}
      {/* L'Animated.View avec fadeAnim est appliqué par le parent */}

      {/* Header avec UserInfo, Countdown */}
      <View style={styles.headerWrapper}>
        <LinearGradient
          colors={['#1a1a2e', '#16213e', '#0f3460']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          {/* Effet de lumière subtile */}
          <View style={styles.subtleGlow} />

          {/* Ligne dorée décorative en haut */}
          <View style={styles.decorativeLineTop} />

          {/* Ligne dorée décorative en bas */}
          <View style={styles.decorativeLineBottom} />

          <View style={styles.headerContent}>
            {user && (
              <UserInfo
                ref={userInfoRef}
                name={user.name}
                points={user.points}
                lives={user.lives}
                level={level}
                streak={streak}
                eventsCompletedInLevel={user.eventsCompletedInLevel}
                eventsNeededForLevel={currentLevelConfig.eventsNeeded}
                maxLives={gameMode.maxLives}
              />
            )}
            <View style={styles.countdownContainer}>
              <Countdown
                timeLeft={timeLeft}
                isActive={!isLevelPaused && isImageLoaded && !!user && !!previousEvent && !!displayedEvent && !isGameOver && !showLevelModal}
              />
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* RewardAnimation rendu en dehors du header pour être visible partout */}
      {currentReward && (isRewardPositionSet || currentReward.targetPosition) && (
        <RewardAnimation
          type={currentReward.type}
          amount={currentReward.amount}
          targetPosition={currentReward.targetPosition}
          onComplete={completeRewardAnimation}
        />
      )}

      {/* Contenu principal du jeu avec son animation d'opacité interne (pour le modal) */}
      <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
        {renderContent()}
      </Animated.View>
    </View>
  );
}

// --- Styles ---
// (Identiques à la version originale fournie)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Important pour voir le fond d'écran du parent
  },
  headerWrapper: {
    position: 'relative',
    overflow: 'visible',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 15,
  },
  header: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'android' ? 12 : 14,
    minHeight: 70,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212, 175, 55, 0.3)',
  },
  // Effet de lumière subtile pour donner de la profondeur
  subtleGlow: {
    position: 'absolute',
    top: 0,
    left: '20%',
    right: '20%',
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 100,
    zIndex: 0,
  },
  // Ligne dorée décorative en haut
  decorativeLineTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(212, 175, 55, 0.4)',
    zIndex: 1,
  },
  // Ligne dorée décorative en bas
  decorativeLineBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(212, 175, 55, 0.5)',
    zIndex: 1,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  countdownContainer: {
    marginLeft: 15, // Espace entre UserInfo et Countdown
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
    position: 'relative', // Nécessaire pour les overlays (pub, modal)
  },
  loadingContainer: { // Peut-être plus utilisé si géré par parent
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingText: { // Peut-être plus utilisé
    marginTop: 10,
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.6)', // Fond sombre pour contraster l'erreur
  },
  errorText: {
    color: colors.white,
    fontSize: 18,
    textAlign: 'center',
    backgroundColor: colors.incorrectRed,
    padding: 20,
    borderRadius: 10,
    overflow: 'hidden', // Pour que le borderRadius s'applique au fond
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: colors.white,
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 20,
  },
  errorButtonText: {
    color: colors.incorrectRed, // Texte rouge sur bouton blanc
    fontSize: 16,
    fontWeight: 'bold',
  },
  watchAdOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000, // Au-dessus du contenu du jeu
  },
  watchAdContainer: {
    width: '85%',
    maxWidth: 380,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  watchAdIconContainer: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(231, 76, 60, 0.2)', // Rouge pâle
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  watchAdTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text, // Utilise la couleur texte définie
    marginBottom: 15,
    textAlign: 'center',
  },
  watchAdDescription: {
    fontSize: 16,
    color: colors.lightText || colors.text, // Utilise la couleur texte mute ou standard
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  watchAdButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 10,
  },
  watchAdButton: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 130,
    flex: 1,
    marginHorizontal: 5,
  },
  watchAdDeclineButton: {
    backgroundColor: '#f5f5f5', // Gris clair
    borderWidth: 1,
    borderColor: '#ddd', // Bordure grise
  },
  watchAdAcceptButton: {
    backgroundColor: colors.correctGreen, // Vert défini
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchAdButtonDisabled: {
    backgroundColor: '#888', // Gris pour l'état désactivé
    opacity: 0.6,
  },
  loadingAdOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  loadingAdContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    minWidth: 200,
  },
  loadingAdText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  watchAdDeclineText: {
    color: '#888', // Gris foncé
    fontSize: 16,
    fontWeight: '500',
  },
  watchAdAcceptText: {
    color: 'white', // Blanc sur vert
    fontSize: 16,
    fontWeight: 'bold',
  },
  watchAdButtonIcon: {
    marginRight: 8,
  },
});

export default GameContentA;
