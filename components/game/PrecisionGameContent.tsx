import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
  Animated,
  Easing,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Event } from '../../hooks/types';
import { steampunkTheme } from '../../constants/Colors';
import { PrecisionResult } from '../../hooks/game/usePrecisionGame';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import PrecisionContinueModal from '../modals/PrecisionContinueModal';

// --- PROPS INTERFACE ---
interface PrecisionGameContentProps {
  loading: boolean;
  error: string | null;
  currentEvent: Event | null;
  score: number;
  hp: number;
  hpMax: number;
  levelLabel: string;
  levelId: number;
  levelProgress: number;
  lastResult: PrecisionResult | null;
  isGameOver: boolean;
  timeLeft: number;
  timerProgress: number;
  pauseTimer: () => void;
  resumeTimer: () => void;
  onSubmitGuess: (guessYear: number) => void;
  onContinue: () => void;
  onReload: () => void;
  onRestart: () => void;
  onExit: () => void;
  showContinueOffer?: boolean;
  onContinueWithAd?: () => void;
  onDeclineContinue?: () => void;
  continueAdLoaded?: boolean;
}

// --- HELPER FUNCTIONS ---
function formatDifference(diff: number) {
  const sign = diff > 0 ? '+' : diff < 0 ? '-' : '';
  return `${sign}${Math.abs(diff)}`;
}

// --- CONSTANTS ---
const AUTO_ADVANCE_MS = 10000;
const AUTO_ADVANCE_SECONDS = Math.ceil(AUTO_ADVANCE_MS / 1000);
const MAX_DIGITS = 4;

// --- MAIN COMPONENT ---
const PrecisionGameContent: React.FC<PrecisionGameContentProps> = ({
  loading,
  error,
  currentEvent,
  score,
  hp,
  hpMax,
  levelLabel,
  levelId, // Correction : Ajout de levelId
  levelProgress,
  lastResult,
  isGameOver,
  timeLeft,
  timerProgress,
  pauseTimer,
  resumeTimer,
  onSubmitGuess,
  onContinue,
  onReload,
  onRestart,
  onExit,
  showContinueOffer = false,
  onContinueWithAd,
  onDeclineContinue,
  continueAdLoaded = false,
}) => {
  // --- STATE & REFS ---
  const [guessValue, setGuessValue] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const [showDescription, setShowDescription] = useState(false);
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  const submitLockRef = useRef(false);
  const [resultExpanded, setResultExpanded] = useState(false);
  const [resultImageLightbox, setResultImageLightbox] = useState(false);
  
  const flashAnim = useRef(new Animated.Value(0)).current;
  const lightboxScale = useRef(new Animated.Value(0)).current;
  const lightboxOpacity = useRef(new Animated.Value(0)).current;
  const autoAdvanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoAdvanceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [autoAdvanceCountdown, setAutoAdvanceCountdown] = useState<number | null>(null);
  const hasAnsweredRef = useRef(false);
  const resultFadeAnim = useRef(new Animated.Value(0)).current;

  // --- MEMOIZED VALUES ---
  const hpRatio = useMemo(() => Math.max(0, Math.min(1, hp / hpMax)), [hp, hpMax]);
  const hasGuess = guessValue !== '' && guessValue !== '-';
  const scoreDelta = lastResult ? lastResult.scoreGain : null;
  const hpDelta = lastResult ? -lastResult.hpLoss : null;
  const timeLabel = `${timeLeft}s`;
  const resultDiffLabel = lastResult
    ? lastResult.timedOut
      ? 'Temps écoulé'
      : `${formatDifference(lastResult.difference)} ans d'écart`
    : null;
  const urgentLabel = !lastResult && !isGameOver && timeLeft > 0 && timeLeft <= 3 ? `${timeLeft}` : null;
  const displayedCountdown = autoAdvanceCountdown ?? AUTO_ADVANCE_SECONDS;

  // --- CALLBACKS ---
  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
    if (autoAdvanceIntervalRef.current) clearInterval(autoAdvanceIntervalRef.current);
    autoAdvanceTimeoutRef.current = null;
    autoAdvanceIntervalRef.current = null;
    setAutoAdvanceCountdown(null);
  }, []);

  const handleDigitPress = useCallback((digit: string) => {
    setInputError(null);
    setGuessValue((prev) => {
      const isNegative = prev.startsWith('-');
      const digits = isNegative ? prev.slice(1) : prev;
      if (digits.length >= MAX_DIGITS) {
        return prev;
      }
      const nextDigits = digits + digit;
      const newValue = (isNegative ? '-' : '') + nextDigits;
      return newValue;
    });
  }, []);

  const handleBackspace = useCallback(() => {
    setInputError(null);
    setGuessValue((prev) => {
      if (prev.length === 0) return prev;
      const trimmed = prev.slice(0, -1);
      if (trimmed === '-') return '';
      return trimmed;
    });
  }, []);

  const handleSubmit = useCallback(() => {
    if (submitLockRef.current) return;
    const parsed = parseInt(guessValue, 10);
    if (!guessValue || Number.isNaN(parsed)) {
      setInputError('Entrez une année valide.');
      return;
    }
    setInputError(null);
    submitLockRef.current = true;
    setTimeout(() => { submitLockRef.current = false; }, 200);
    hasAnsweredRef.current = true;
    clearAutoAdvance();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSubmitGuess(parsed);
  }, [guessValue, clearAutoAdvance, onSubmitGuess]);

  const handleContinue = () => {
    if (!lastResult || isGameOver) return;
    clearAutoAdvance();
    if (showDescription) setShowDescription(false);
    setResultExpanded(false);
    setResultImageLightbox(false);
    onContinue();
  };

  const handleResultClick = () => {
    if (resultExpanded) return;
    clearAutoAdvance();
    setResultExpanded(true);
  };

  const toggleResultImageLightbox = () => {
    setResultImageLightbox(!resultImageLightbox);
  };
  
  const openDescription = () => {
    if (!currentEvent?.description_detaillee) return;
    clearAutoAdvance();
    setShowDescription(true);
  };

  const closeDescription = () => setShowDescription(false);

  const closeDescriptionAndContinue = () => {
    setShowDescription(false);
    if (lastResult && !isGameOver) onContinue();
  };

  const openImageLightbox = () => {
    if (!currentEvent?.illustration_url) return;
    setShowImageLightbox(true);
    lightboxScale.setValue(0.8);
    lightboxOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(lightboxScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.timing(lightboxOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const closeImageLightbox = () => {
    Animated.parallel([
      Animated.timing(lightboxScale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
      Animated.timing(lightboxOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setShowImageLightbox(false));
  };

  // --- EFFECTS ---
  useEffect(() => {
    if (!lastResult) {
      setGuessValue('');
      setInputError(null);
      setResultExpanded(false);
      resultFadeAnim.setValue(0);
    } else {
      setResultExpanded(false);
      resultFadeAnim.setValue(0);
      Animated.timing(resultFadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [lastResult, currentEvent?.id, resultFadeAnim]);

  useEffect(() => {
    if (timeLeft === 0 && !lastResult && !isGameOver) {
      flashAnim.setValue(1);
      Animated.timing(flashAnim, { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    }
  }, [flashAnim, isGameOver, lastResult, timeLeft]);

  useEffect(() => {
    if (showDescription) pauseTimer();
    else resumeTimer();
  }, [pauseTimer, resumeTimer, showDescription]);

  useEffect(() => {
    if (!lastResult || isGameOver || showDescription || resultExpanded) {
      clearAutoAdvance();
      return;
    }
    let remaining = AUTO_ADVANCE_SECONDS;
    setAutoAdvanceCountdown(remaining);
    autoAdvanceIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setAutoAdvanceCountdown(remaining);
      if (remaining <= 0 && autoAdvanceIntervalRef.current) {
        clearInterval(autoAdvanceIntervalRef.current);
      }
    }, 1000);
    autoAdvanceTimeoutRef.current = setTimeout(() => {
      clearAutoAdvance();
      onContinue();
    }, AUTO_ADVANCE_MS);
    return clearAutoAdvance;
  }, [lastResult, showDescription, isGameOver, resultExpanded, onContinue, clearAutoAdvance]);

  useEffect(() => () => clearAutoAdvance(), [clearAutoAdvance]);
  useEffect(() => {
    setShowDescription(false);
    setShowImageLightbox(false);
  }, [currentEvent?.id]);

  // --- RENDER ---
  const showContent = !loading && !error && currentEvent;

  const KeypadButton = ({ label, onPress, containerStyle, textStyle, disabled, isIcon, iconName, isSubmit }: any) => {
    const [isPressed, setIsPressed] = useState(false);

    const gradientColors: [string, string] = isSubmit
      ? ['#E0B457', '#8C6B2B']
      : ['#1C1922', '#0F0E13'];

    const handlePressIn = () => {
      if (disabled) return;
      setIsPressed(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      // Execute immediately on press in for ALL buttons
      if (isIcon) {
        onPress();
      } else {
        onPress(label);
      }
    };

    const handlePressOut = () => {
      setIsPressed(false);
    };

    const handlePress = () => {
      // All actions now handled in onPressIn for instant response
      return;
    };

    return (
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={1}
        delayPressIn={0}
        delayPressOut={0}
        style={[
          styles.keypadKey,
          containerStyle,
          disabled && styles.keypadDisabled,
        ]}
      >
        <LinearGradient
          colors={gradientColors}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {isPressed && <View style={styles.keyPressedOverlay} pointerEvents="none" />}
        <View style={styles.keypadContent} pointerEvents="none">
          {isIcon ? (
            <Ionicons name={iconName} size={36} color={steampunkTheme.secondaryText} />
          ) : (
            <Text style={[styles.keypadKeyText, textStyle, isSubmit && { color: '#0B0A0A' }]}>
              {label}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !currentEvent) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={steampunkTheme.goldAccent} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* --- BACKGROUND --- */}
      <ImageBackground
        source={require('../../assets/images/bgpreci.png')}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.60)']}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      {/* --- HUD --- */}
      <View style={styles.topHud}>
        <LinearGradient colors={[steampunkTheme.cardGradient.start, steampunkTheme.cardGradient.end]} style={styles.hudCard}>
          <Text style={styles.hudLabel}>Niveau</Text>
          <Text style={styles.hudValue}>{levelId}</Text>
        </LinearGradient>
        <LinearGradient colors={[steampunkTheme.cardGradient.start, steampunkTheme.cardGradient.end]} style={styles.hudCard}>
          <Text style={styles.hudLabel}>Score</Text>
          <Text style={styles.hudValue}>{score}</Text>
        </LinearGradient>
        <LinearGradient colors={[steampunkTheme.cardGradient.start, steampunkTheme.cardGradient.end]} style={[styles.hudCard, { flex: 1.5 }]}>
          <Text style={styles.hudLabel}>Vitalité</Text>
          <View style={styles.progressTrack}>
            <LinearGradient colors={[steampunkTheme.goldGradient.start, steampunkTheme.goldGradient.end]} style={[styles.progressFill, { width: `${hpRatio * 100}%` }]} />
          </View>
          <Text style={styles.hudValueSmall}>{hp}/{hpMax}</Text>
        </LinearGradient>
      </View>

      {/* --- TIMER --- */}
      <View style={styles.timerContainer}>
        <View style={styles.progressTrack}>
          <LinearGradient colors={[steampunkTheme.goldGradient.start, steampunkTheme.goldGradient.end]} style={[styles.progressFill, { width: `${timerProgress * 100}%` }]} />
        </View>
        <View style={styles.timerBadge}>
          <Text style={styles.timerValue}>{timeLeft}s</Text>
        </View>
      </View>

      {/* --- MAIN CONTENT AREA --- */}
      <View style={styles.mainContent}>
        {showContent && !isGameOver && (
          <>
            {/* --- EVENT IMAGE & TITLE --- */}
            <View style={styles.eventCard}>
              <Pressable onPress={toggleResultImageLightbox}>
                <ImageBackground
                  source={{ uri: currentEvent.illustration_url }}
                  style={styles.eventImage}
                  imageStyle={styles.eventImageStyle}
                  resizeMode="cover"
                >
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.imageOverlay} />
                  <BlurView intensity={Platform.OS === 'ios' ? 10 : 0} tint="dark" style={styles.titleBadge}>
                    <Text style={styles.eventTitle}>{currentEvent.titre}</Text>
                  </BlurView>
                </ImageBackground>
              </Pressable>
            </View>

            {/* --- INPUT & KEYPAD OR RESULT --- */}
            {!lastResult ? (
              /* Show input & keypad when no result */
              <View style={styles.inputSection}>
                <View style={styles.inputSlotsContainer}>
                  {Array.from({ length: MAX_DIGITS }).map((_, i) => (
                    <View key={i} style={styles.inputSlot}>
                      <Text style={styles.inputSlotText}>{guessValue[i] || ''}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.keypadContainer}>
                  <KeypadButton label="1" onPress={handleDigitPress} disabled={!!lastResult} />
                  <KeypadButton label="2" onPress={handleDigitPress} disabled={!!lastResult} />
                  <KeypadButton label="3" onPress={handleDigitPress} disabled={!!lastResult} />
                  <KeypadButton label="4" onPress={handleDigitPress} disabled={!!lastResult} />
                  <KeypadButton label="5" onPress={handleDigitPress} disabled={!!lastResult} />
                  <KeypadButton label="6" onPress={handleDigitPress} disabled={!!lastResult} />
                  <KeypadButton label="7" onPress={handleDigitPress} disabled={!!lastResult} />
                  <KeypadButton label="8" onPress={handleDigitPress} disabled={!!lastResult} />
                  <KeypadButton label="9" onPress={handleDigitPress} disabled={!!lastResult} />
                  <KeypadButton label="Supprimer" onPress={handleBackspace} disabled={!!lastResult} isIcon iconName="backspace-outline" containerStyle={{backgroundColor: 'transparent'}}/>
                  <KeypadButton label="0" onPress={handleDigitPress} disabled={!!lastResult} />
                  <KeypadButton
                    label="Valider"
                    onPress={handleSubmit}
                    disabled={!hasGuess || !!lastResult}
                    isSubmit={true}
                    textStyle={styles.actionKeyText}
                  />
                </View>
              </View>
            ) : (
              /* Show result panel when result exists */
              lastResult && !isGameOver && (
                <Animated.View style={[styles.resultPanel, { opacity: resultFadeAnim }]}>
                  <Pressable
                    onPress={handleResultClick}
                    disabled={resultExpanded}
                    style={({ pressed }) => [
                      { transform: [{ scale: !resultExpanded && pressed ? 0.99 : 1 }] }
                    ]}
                  >
                    <LinearGradient
                      colors={[steampunkTheme.cardGradient.start, steampunkTheme.cardGradient.end]}
                      style={styles.resultCard}
                    >
                      {/* Compact View */}
                      <View style={styles.resultCompact}>
                      <View style={styles.resultHeader}>
                        <Text style={styles.resultTitle}>{lastResult.event.titre}</Text>
                        {!resultExpanded && (
                          <Text style={styles.resultExpandHint}>👆 Toucher pour détails</Text>
                        )}
                      </View>

                      <View style={styles.resultComparison}>
                        <View style={styles.resultColumn}>
                          <Text style={styles.resultLabel}>Votre réponse</Text>
                          <Text style={styles.resultYourAnswer}>{lastResult.guessYear}</Text>
                        </View>
                        <View style={styles.resultColumn}>
                          <Text style={styles.resultLabel}>Date réelle</Text>
                          <Text style={styles.resultCorrectAnswer}>{lastResult.actualYear}</Text>
                        </View>
                      </View>

                      {lastResult.timedOut ? (
                        <Text style={styles.resultTimeout}>⏱ Temps écoulé ! -500 HP</Text>
                      ) : (
                        <View style={styles.resultStats}>
                          <Text style={styles.resultDifference}>
                            Écart : {lastResult.absDifference} an{lastResult.absDifference > 1 ? 's' : ''}
                          </Text>
                          <Text style={styles.resultHP}>HP -{lastResult.hpLoss}</Text>
                          <Text style={styles.resultScore}>Score +{lastResult.scoreGain}</Text>
                        </View>
                      )}

                      {/* Truncated Description */}
                      {!resultExpanded && lastResult.event.description_detaillee && (
                        <Text style={styles.resultDescriptionTruncated} numberOfLines={2}>
                          {lastResult.event.description_detaillee}
                        </Text>
                      )}
                    </View>

                    {/* Expanded View */}
                    {resultExpanded && (
                      <View style={styles.resultExpanded}>
                        {lastResult.event.description_detaillee && (
                          <ScrollView style={styles.resultDescriptionContainer} showsVerticalScrollIndicator={false}>
                            <Text style={styles.resultDescription}>
                              {lastResult.event.description_detaillee}
                            </Text>
                          </ScrollView>
                        )}

                        <Pressable
                          onPress={handleContinue}
                          style={({ pressed }) => [
                            styles.continueButton,
                            { transform: [{ scale: pressed ? 0.98 : 1 }] }
                          ]}
                        >
                          <LinearGradient
                            colors={['#E0B457', '#8C6B2B']}
                            style={StyleSheet.absoluteFill}
                          />
                          <Text style={styles.continueButtonText}>Continuer</Text>
                        </Pressable>
                      </View>
                    )}

                    {/* Auto-advance countdown - only when compact */}
                    {!resultExpanded && (
                      <Pressable
                        onPress={handleContinue}
                        style={({ pressed }) => [
                          styles.resultCountdown,
                          { opacity: pressed ? 0.7 : 1 }
                        ]}
                      >
                        <Text style={styles.resultCountdownText}>
                          ⏭ Continuer ({displayedCountdown}s)
                        </Text>
                      </Pressable>
                    )}
                  </LinearGradient>
                </Pressable>
              </Animated.View>
              )
            )}
          </>
        )}
      </View>

      {/* --- IMAGE LIGHTBOX --- */}
      {resultImageLightbox && currentEvent?.illustration_url && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={toggleResultImageLightbox}>
          <Pressable style={styles.lightboxOverlay} onPress={toggleResultImageLightbox}>
            <Animated.View style={styles.lightboxContainer}>
              <ImageBackground
                source={{ uri: currentEvent.illustration_url }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />
              <Pressable style={styles.lightboxCloseButton} onPress={toggleResultImageLightbox}>
                <Ionicons name="close-circle" size={48} color="#E0B457" />
              </Pressable>
            </Animated.View>
          </Pressable>
        </Modal>
      )}

      {/* Modal Continue avec pub récompensée */}
      <PrecisionContinueModal
        isVisible={showContinueOffer}
        currentScore={score}
        onWatchAd={() => onContinueWithAd?.()}
        onDecline={() => onDeclineContinue?.()}
        adLoaded={continueAdLoaded}
      />
    </View>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: steampunkTheme.mainBg,
    padding: 10,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: steampunkTheme.mainBg,
  },
  loadingText: {
    marginTop: 12,
    color: steampunkTheme.primaryText,
    fontSize: 16,
  },
  // --- HUD ---
  topHud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  hudCard: {
    flex: 1,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: steampunkTheme.goldBorderTransparent,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: 'black', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  hudLabel: {
    color: steampunkTheme.secondaryText,
    fontSize: 12,
    fontWeight: '600',
  },
  hudValue: {
    color: steampunkTheme.primaryText,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  hudValueSmall: {
    color: steampunkTheme.primaryText,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  // --- Progress Bars ---
  progressTrack: {
    height: 8,
    width: '100%',
    backgroundColor: steampunkTheme.progressTrack,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  // --- Timer ---
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  timerBadge: {
    backgroundColor: steampunkTheme.inputSlot,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: steampunkTheme.goldBorder,
  },
  timerValue: {
    color: steampunkTheme.primaryText,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // --- Main Content ---
  mainContent: {
    flex: 1,
  },
  // --- Event Card ---
  eventCard: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: steampunkTheme.cardPanel,
  },
  eventImage: {
    width: '100%',
    height: 160,
    justifyContent: 'flex-end',
  },
  eventImageStyle: {
    borderRadius: 18,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  titleBadge: {
    margin: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: steampunkTheme.goldBorderTransparent,
    backgroundColor: steampunkTheme.glassBg,
  },
  eventTitle: {
    color: steampunkTheme.primaryText,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // --- Input & Keypad ---
  inputSection: {
    width: '98%',
    flex: 1,
    alignSelf: 'center',
    justifyContent: 'flex-start',
  },
  inputSlotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
    height: 45,
  },
  inputSlot: {
    flex: 1,
    maxWidth: 60,
    backgroundColor: steampunkTheme.inputSlot,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 74, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(224, 180, 87, 0.18)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 5,
  },
  inputSlotText: {
    color: steampunkTheme.primaryText,
    fontSize: 28,
    fontWeight: 'bold',
  },
  keypadContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'space-between',
    gap: 8,
    flex: 1,
  },
  keypadKey: {
    width: '31%',
    height: '22%',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  keypadContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyPressedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(224, 180, 87, 0.3)',
  },
  keypadKeyText: {
    color: '#E8D9A8',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 28,
  },
  actionKey: {
    // Specific styles for the "Valider" button
  },
  actionKeyText: {
    color: steampunkTheme.mainBg,
    fontWeight: 'bold',
    fontSize: 18,
  },
  keypadDisabled: {
    opacity: 0.4,
  },
  // --- Result Panel ---
  resultPanel: {
    marginTop: 16,
    marginBottom: 20,
  },
  resultCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 74, 0.3)',
    ...Platform.select({
      ios: { shadowColor: '#E0B457', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  resultCompact: {
    padding: 16,
  },
  resultHeader: {
    marginBottom: 12,
  },
  resultTitle: {
    color: '#E8D9A8',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  resultExpandHint: {
    color: steampunkTheme.secondaryText,
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  resultComparison: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(200, 160, 74, 0.2)',
  },
  resultColumn: {
    alignItems: 'center',
  },
  resultLabel: {
    color: steampunkTheme.secondaryText,
    fontSize: 12,
    marginBottom: 4,
  },
  resultYourAnswer: {
    color: '#E8D9A8',
    fontSize: 24,
    fontWeight: 'bold',
  },
  resultCorrectAnswer: {
    color: steampunkTheme.goldAccent,
    fontSize: 24,
    fontWeight: 'bold',
  },
  resultStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  resultDifference: {
    color: '#E8D9A8',
    fontSize: 14,
    fontWeight: '600',
  },
  resultHP: {
    color: '#C04D3A',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resultScore: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resultTimeout: {
    color: '#C04D3A',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  resultDescriptionTruncated: {
    color: steampunkTheme.secondaryText,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  resultCountdown: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(200, 160, 74, 0.2)',
    alignItems: 'center',
  },
  resultCountdownText: {
    color: steampunkTheme.goldAccent,
    fontSize: 13,
    fontWeight: '600',
  },
  resultExpanded: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  resultImage: {
    width: '114%',
    height: 200,
    justifyContent: 'flex-end',
    marginBottom: 16,
    marginHorizontal: -16,
  },
  resultImageStyle: {
    borderRadius: 0,
  },
  resultImageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  resultDescriptionContainer: {
    maxHeight: 200,
    marginBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 12,
    padding: 12,
  },
  resultDescription: {
    color: '#E8D9A8',
    fontSize: 14,
    lineHeight: 20,
  },
  continueButton: {
    borderRadius: 14,
    overflow: 'hidden',
    paddingVertical: 14,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#0B0A0A',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // --- Lightbox ---
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
  lightboxCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
});

export default PrecisionGameContent;
