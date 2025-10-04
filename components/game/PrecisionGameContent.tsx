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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Event } from '../../hooks/types';
import { steampunkTheme } from '../../constants/Colors';
import { PrecisionResult } from '../../hooks/game/usePrecisionGame';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

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
}) => {
  // --- STATE & REFS ---
  const [guessValue, setGuessValue] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const [showDescription, setShowDescription] = useState(false);
  const [showImageLightbox, setShowImageLightbox] = useState(false);
  
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

  const handleDigitPress = (digit: string) => {
    if (lastResult || isGameOver) return;
    setInputError(null);
    setGuessValue((prev) => {
      const isNegative = prev.startsWith('-');
      const digits = isNegative ? prev.slice(1) : prev;
      if (digits.length >= MAX_DIGITS) return prev;
      const nextDigits = digits + digit;
      return (isNegative ? '-' : '') + nextDigits;
    });
  };

  const handleBackspace = () => {
    if (lastResult || isGameOver) return;
    setInputError(null);
    setGuessValue((prev) => {
      if (prev.length === 0) return prev;
      const trimmed = prev.slice(0, -1);
      if (trimmed === '-') return '';
      return trimmed;
    });
  };

  const handleSubmit = () => {
    if (lastResult || isGameOver) return;
    const parsed = parseInt(guessValue, 10);
    if (!hasGuess || Number.isNaN(parsed)) {
      setInputError('Entrez une année valide.');
      return;
    }
    setInputError(null);
    hasAnsweredRef.current = true;
    clearAutoAdvance();
    onSubmitGuess(parsed);
  };

  const handleContinue = () => {
    if (!lastResult || isGameOver) return;
    clearAutoAdvance();
    if (showDescription) setShowDescription(false);
    onContinue();
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
      resultFadeAnim.setValue(0);
    } else {
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
    if (!lastResult || isGameOver || showDescription) {
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
  }, [lastResult, showDescription, isGameOver, onContinue, clearAutoAdvance]);

  useEffect(() => () => clearAutoAdvance(), [clearAutoAdvance]);
  useEffect(() => {
    setShowDescription(false);
    setShowImageLightbox(false);
  }, [currentEvent?.id]);

  // --- RENDER ---
  const showContent = !loading && !error && currentEvent;

  const KeypadButton = ({ label, onPress, containerStyle, textStyle, disabled, isIcon, iconName }: any) => {
    const [isPressed, setIsPressed] = useState(false);
    
    const handlePressIn = () => {
      if (disabled) return;
      setIsPressed(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onPress();
    };
    const handlePressOut = () => setIsPressed(false);

    return (
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={({ pressed }) => [
          styles.keypadKey,
          containerStyle,
          disabled && styles.keypadDisabled,
          { transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
      >
        <LinearGradient
          colors={[steampunkTheme.buttonGradientStart, steampunkTheme.buttonGradientEnd]}
          style={StyleSheet.absoluteFill}
        />
        {isPressed && <View style={styles.keyPressedOverlay} />}
        {isIcon ? (
          <Ionicons name={iconName} size={32} color={steampunkTheme.secondaryText} />
        ) : (
          <Text style={[styles.keypadKeyText, textStyle]}>{label}</Text>
        )}
      </Pressable>
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
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {showContent && !isGameOver && (
          <>
            {/* --- EVENT IMAGE & TITLE --- */}
            <View style={styles.eventCard}>
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
            </View>

            {/* --- INPUT & KEYPAD --- */}
            <View style={styles.inputSection}>
              <View style={styles.inputSlotsContainer}>
                {Array.from({ length: MAX_DIGITS }).map((_, i) => (
                  <View key={i} style={styles.inputSlot}>
                    <Text style={styles.inputSlotText}>{guessValue[i] || ''}</Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.keypadContainer}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => (
                  <KeypadButton key={key} label={key} onPress={() => handleDigitPress(key)} disabled={!!lastResult} />
                ))}
                <KeypadButton label="Supprimer" onPress={handleBackspace} disabled={!!lastResult} isIcon iconName="backspace-outline" containerStyle={{backgroundColor: 'transparent'}}/>
                <KeypadButton label="0" onPress={() => handleDigitPress('0')} disabled={!!lastResult} />
                <Pressable
                  onPress={handleSubmit}
                  disabled={!hasGuess || !!lastResult}
                  style={({ pressed }) => [
                    styles.keypadKey,
                    styles.actionKey,
                    (!hasGuess || !!lastResult) && styles.keypadDisabled,
                    { transform: [{ scale: pressed ? 0.98 : 1 }] }
                  ]}
                >
                  <LinearGradient colors={[steampunkTheme.goldGradient.start, steampunkTheme.goldGlow]} style={StyleSheet.absoluteFill} />
                  <Text style={[styles.keypadKeyText, styles.actionKeyText]}>Valider</Text>
                </Pressable>
              </View>
            </View>
          </>
        )}
      </ScrollView>
      {/* Modals and overlays would go here, styled similarly */}
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
  // --- ScrollView ---
  scrollContainer: {
    paddingBottom: 100,
  },
  // --- Event Card ---
  eventCard: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: steampunkTheme.cardPanel,
  },
  eventImage: {
    width: '100%',
    aspectRatio: 16 / 9,
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
    padding: 8,
  },
  inputSlotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
    height: 60,
  },
  inputSlot: {
    flex: 1,
    maxWidth: 60,
    backgroundColor: steampunkTheme.inputSlot,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: steampunkTheme.goldBorderTransparent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: steampunkTheme.inputGlow,
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
    justifyContent: 'center',
    gap: 12,
  },
  keypadKey: {
    width: '30%',
    aspectRatio: 1.2,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  keyPressedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: steampunkTheme.pressedOverlay,
  },
  keypadKeyText: {
    color: steampunkTheme.primaryText,
    fontSize: 28,
    fontWeight: 'bold',
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
});

export default PrecisionGameContent;