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

// Components
import UserInfo, { UserInfoHandle } from './UserInfo';
import Countdown from './Countdown';
import EventLayoutA from './EventLayoutA'; // Assurez-vous que ce chemin est correct
import LevelUpModalBis from '../modals/LevelUpModalBis';
import ScoreboardModal from '../modals/ScoreboardModal';
import RewardAnimation from './RewardAnimation';

// Types & Constants
import { colors } from '@/constants/Colors';
import type {
  User,
  Event,
  ExtendedLevelConfig,
  RewardType,
  LevelEventSummary,
} from '@/hooks/types'; // Assurez-vous que ce chemin est correct

// Interface pour l'historique des niveaux (si non définie ailleurs)
interface LevelHistory {
  level: number;
  events: LevelEventSummary[];
}

// --- Interface pour l'état publicitaire attendu ---
interface AdStateForContent {
    hasRewardedAd: boolean;
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
  isLevelPaused: boolean;
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
  isLevelPaused,
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
}: GameContentAProps) {
  const router = useRouter(); // Gardé, même si non utilisé directement ici
  const userInfoRef = useRef<UserInfoHandle>(null);
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const [isRewardPositionSet, setIsRewardPositionSet] = useState(false);

  // --- États pour gérer l'affichage conditionnel de fin de partie ---
  const [showWatchAdOffer, setShowWatchAdOffer] = useState(false);
  const [showScoreboard, setShowScoreboard] = useState(false);

  const isInitialRenderRef = useRef(true); // Pour l'animation d'EventLayoutA

  // --- MODIFICATION : Supprimer l'ancien handleRestart wrapper ---
  // const handleRestart = useCallback(() => { ... }); // SUPPRIMÉ
  // ------------------------------------------------------------

  // --- MODIFICATION : Nouveaux handlers internes pour les boutons du modal ---
  // Handler pour le bouton "Rejouer" du modal
  const handleModalRestart = useCallback(() => {
    console.log("[GameContentA] Modal 'Rejouer' clicked. Resetting ads and calling parent restart logic.");
    if (resetAdsState) {
      resetAdsState(); // Réinitialise les pubs si la fonction existe
    }
    onActualRestart(); // Appelle la fonction de redémarrage fournie par le parent (GameScreenPage)
  }, [onActualRestart, resetAdsState]);

  // Handler pour le bouton "Menu" du modal
  const handleModalMenu = useCallback(() => {
    console.log("[GameContentA] Modal 'Menu' clicked. Resetting ads and calling parent menu logic.");
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
        // console.log("[GameContentA] Cannot update reward position - prerequisites not met"); // Log original
        return;
      }

      try {
        // console.log(`[GameContentA] Getting position for reward type: ${currentReward.type}`); // Log original
        const position = currentReward.type === RewardType.EXTRA_LIFE
          ? await userInfoRef.current.getLifePosition()
          : await userInfoRef.current.getPointsPosition();

        if (mounted && position && typeof position.x === 'number' && typeof position.y === 'number') {
          // console.log(`[GameContentA] Got valid position: x=${position.x}, y=${position.y}`); // Log original
          const positionChanged =
            !currentReward.targetPosition ||
            Math.abs(currentReward.targetPosition.x - position.x) > 5 ||
            Math.abs(currentReward.targetPosition.y - position.y) > 5;

          if (positionChanged) {
             // console.log(`[GameContentA] Updating reward position`); // Log original
             updateRewardPosition(position);
             setIsRewardPositionSet(true);
          } else {
             // console.log("[GameContentA] Position unchanged, no update needed"); // Log original
             setIsRewardPositionSet(true);
          }
        } else {
          // console.warn("[GameContentA] getPosition returned invalid position:", position); // Log original
          if (attempts < MAX_ATTEMPTS) {
            attempts++;
          } else {
             // console.log("[GameContentA] Using fallback position after failed attempts"); // Log original
             const fallbackPosition = currentReward.type === RewardType.EXTRA_LIFE
              ? { x: Dimensions.get('window').width * 0.80, y: 50 }
              : { x: Dimensions.get('window').width * 0.20, y: 50 };
             updateRewardPosition(fallbackPosition);
             setIsRewardPositionSet(true);
          }
        }
      } catch (e) {
        // console.warn("[GameContentA] Error getting element position:", e); // Log original
        if (attempts < MAX_ATTEMPTS) {
            attempts++;
        } else {
           // console.log("[GameContentA] Using fallback position after error"); // Log original
           const fallbackPosition = currentReward.type === RewardType.EXTRA_LIFE
            ? { x: Dimensions.get('window').width * 0.80, y: 50 }
            : { x: Dimensions.get('window').width * 0.20, y: 50 };
           updateRewardPosition(fallbackPosition);
           setIsRewardPositionSet(true);
        }
      }
    };

    updateRewardPositionSafely();
    const timers = [];
    for (let i = 1; i <= MAX_ATTEMPTS; i++) {
      const timer = setTimeout(() => {
        if (mounted && currentReward && !isRewardPositionSet) {
          // console.log(`[GameContentA] Retry ${i}/${MAX_ATTEMPTS} for position update`); // Log original
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
  // (Logique inchangée)
  useEffect(() => {
    if (isGameOver && user) {
      const canOfferAd =
        user.lives === 0 &&
        showRewardedAd &&
        adState.hasRewardedAd &&
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
  }, [isGameOver, user, adState, showRewardedAd]); // Dépendances leaderboards retirées car non nécessaires pour cette logique

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
    if (showRewardedAd) {
      const adTriggered = showRewardedAd();
      if (adTriggered) {
        setShowWatchAdOffer(false); // Cacher l'offre pendant que la pub tourne
      } else {
        Alert.alert("Oups !", "Impossible de lancer la publicité pour le moment.", [{ text: "OK" }]);
        setShowWatchAdOffer(false);
        setShowScoreboard(true); // Afficher le scoreboard si la pub échoue à démarrer
      }
    } else {
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
          isInitialRender={isInitialRenderRef.current}
        />

        {/* --- Modal de Level Up --- */}
        <LevelUpModalBis
          visible={showLevelModal}
          level={level}
          onStart={handleLevelUp}
          name={currentLevelConfig.name}
          description={currentLevelConfig.description}
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
                >
                  <Text style={styles.watchAdDeclineText}>Non, merci</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.watchAdButton, styles.watchAdAcceptButton]}
                  onPress={handleWatchAd}
                >
                  <Ionicons name="play-circle-outline" size={20} color="white" style={styles.watchAdButtonIcon} />
                  <Text style={styles.watchAdAcceptText}>D'accord !</Text>
                </TouchableOpacity>
              </View>
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

      {/* Header avec UserInfo, Countdown, RewardAnimation */}
      <View style={styles.header}>
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
           />
        )}
        <View style={styles.countdownContainer}>
          <Countdown
             timeLeft={timeLeft}
             isActive={!isLevelPaused && isImageLoaded && !!user && !!previousEvent && !!displayedEvent && !isGameOver && !showLevelModal}
          />
        </View>

        {currentReward && (isRewardPositionSet || currentReward.targetPosition) && (
          <RewardAnimation
            type={currentReward.type}
            amount={currentReward.amount}
            targetPosition={currentReward.targetPosition}
            onComplete={completeRewardAnimation}
          />
        )}
      </View>

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
    header: {
      position: 'relative',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: 'rgba(250, 245, 235, 0.85)', // Fond clair semi-transparent
      borderBottomColor: 'rgba(0, 0, 0, 0.05)', // Bordure légère
      zIndex: 1000, // Pour l'animation de récompense
      paddingHorizontal: 15,
      paddingVertical: Platform.OS === 'android' ? 8 : 10,
      borderBottomWidth: 1,
      // borderBottomColor: 'rgba(255, 255, 255, 0.2)', // Commenté car fond clair
    },
    countdownContainer: {
      marginLeft: 15, // Espace entre UserInfo et Countdown
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
      color: colors.textMuted || colors.text, // Utilise la couleur texte mute ou standard
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