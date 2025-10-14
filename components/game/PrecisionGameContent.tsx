import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  useWindowDimensions,
  LayoutChangeEvent,
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
import NumericKeypad from './NumericKeypad';

const LAYOUT_DEBUG = false;
const KEYPAD_ROWS = 4;
const KEYPAD_COLS = 3;
const KEY_SIZE_MIN = 52;
const GAP_MIN = 4;
const SPACING_MIN = 0.65;
const KEY_SIZE_STEP = 4;
const GAP_STEP = 2;
const SPACING_STEP = 0.05;

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

const PrecisionGameBackground = memo(() => (
  <ImageBackground
    source={require('../../assets/images/bgpreci.png')}
    resizeMode="cover"
    style={StyleSheet.absoluteFill}
    pointerEvents="none"
  >
    <LinearGradient
      colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.60)']}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  </ImageBackground>
));
PrecisionGameBackground.displayName = 'PrecisionGameBackground';

interface TimerDisplayProps {
  progress: number;
  seconds: number;
  spacingScale?: number;
  onLayout?: (event: LayoutChangeEvent) => void;
}

const TimerDisplay = memo(({ progress, seconds, spacingScale = 1, onLayout }: TimerDisplayProps) => {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const marginBottom = Math.max(Math.round(6 * spacingScale), 2);
  const rowGap = Math.max(Math.round(10 * spacingScale), 6);
  const badgePaddingH = Math.max(Math.round(12 * spacingScale), 8);
  const badgePaddingV = Math.max(Math.round(4 * spacingScale), 2);
  const badgeRadius = Math.max(Math.round(10 * spacingScale), 6);
  const timerFont = Math.max(Math.round(16 * spacingScale), 12);
  return (
    <View style={[styles.timerContainer, { marginBottom, gap: rowGap }]} onLayout={onLayout}>
      <View style={styles.progressTrack}>
        <LinearGradient
          colors={[steampunkTheme.goldGradient.start, steampunkTheme.goldGradient.end]}
          style={[styles.progressFill, { width: `${clampedProgress * 100}%` }]}
          pointerEvents="none"
        />
      </View>
      <View
        style={[styles.timerBadge, {
          paddingHorizontal: badgePaddingH,
          paddingVertical: badgePaddingV,
          borderRadius: badgeRadius,
        }]}
      >
        <Text style={[styles.timerValue, { fontSize: timerFont }]}>{seconds}s</Text>
      </View>
    </View>
  );
});

TimerDisplay.displayName = 'TimerDisplay';

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
  const { top, bottom, left, right } = useSafeAreaInsets();
  const { height: vh, width: vw } = useWindowDimensions();
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
  const resultDiffLabel = lastResult
    ? lastResult.timedOut
      ? 'Temps écoulé'
      : `${formatDifference(lastResult.difference)} ans d'écart`
    : null;
  const displayedCountdown = autoAdvanceCountdown ?? AUTO_ADVANCE_SECONDS;

  const layoutMetrics = useMemo(() => {
    const chrome = 8 + 8 + 76 + 32;
    const safeHeight = top + bottom;
    const usableSpace = Math.max(vh - safeHeight - chrome, 0);

    const imgTarget = Math.min(Math.max(usableSpace * 0.34, 135), 240);
    const keypadTarget = Math.max(usableSpace - imgTarget, 240);

    const baseGap = 6;
    const cols = KEYPAD_COLS;
    const rows = KEYPAD_ROWS;

    const horizontalPadding = left + right + 20;
    const horizontalSafe = Math.max(vw - horizontalPadding, 0);
    const widthDenominator = cols > 0 ? cols : 1;
    const internalWidth = Math.max(horizontalSafe - baseGap * (cols + 1), 0);
    const baseKeySize = internalWidth > 0 ? Math.floor(internalWidth / widthDenominator) : 0;
    const fallbackSize = horizontalSafe > 0 ? Math.floor(horizontalSafe / widthDenominator) : 48;
    const keySizeCandidate = baseKeySize > 0 ? baseKeySize : Math.max(fallbackSize, 32);

    const neededHeight = rows * keySizeCandidate + (rows + 1) * baseGap;
    const scale =
      keypadTarget > 0 && neededHeight > 0 && neededHeight > keypadTarget
        ? keypadTarget / neededHeight
        : 1;

    const scaledKeySize = Math.floor(keySizeCandidate * Math.min(1, scale));
    const scaledGap = Math.floor(baseGap * Math.min(1, scale));
    const finalGap = Math.max(4, scaledGap);

    let finalKeySize = scaledKeySize;
    if (finalKeySize <= 0) {
      const availableHeight = keypadTarget - (rows + 1) * finalGap;
      finalKeySize = availableHeight > 0 ? Math.floor(availableHeight / rows) : KEY_SIZE_MIN;
    }
    finalKeySize = Math.max(KEY_SIZE_MIN, finalKeySize);

    return {
      imgTarget,
      finalKeySize,
      finalGap,
    };
  }, [bottom, left, right, top, vh, vw]);
  const { imgTarget, finalKeySize, finalGap } = layoutMetrics;

  const debugActive = __DEV__ && LAYOUT_DEBUG;
  const [debugConfig, setDebugConfig] = useState(() => ({
    keySize: finalKeySize,
    gap: finalGap,
    spacingScale: 1,
  }));
  const [layoutHeights, setLayoutHeights] = useState({
    hud: 0,
    timer: 0,
    image: 0,
    guess: 0,
    keypad: 0,
    content: 0,
  });
  const [fitState, setFitState] = useState<'UNKNOWN' | 'OK' | 'FAIL'>('UNKNOWN');
  const [overlayVisible, setOverlayVisible] = useState(false);

  useEffect(() => {
    if (!debugActive) return;
    setDebugConfig({
      keySize: finalKeySize,
      gap: finalGap,
      spacingScale: 1,
    });
    setLayoutHeights({
      hud: 0,
      timer: 0,
      image: 0,
      guess: 0,
      keypad: 0,
      content: 0,
    });
    setFitState('UNKNOWN');
    setOverlayVisible(false);
  }, [debugActive, finalGap, finalKeySize]);

  const updateLayoutHeight = useCallback(
    (section: keyof typeof layoutHeights) => (event: any) => {
      if (!debugActive) return;
      const nextHeight = Math.round(event.nativeEvent.layout.height);
      setLayoutHeights((prev) => {
        if (prev[section] === nextHeight) return prev;
        return { ...prev, [section]: nextHeight };
      });
    },
    [debugActive],
  );

  const effectiveKeySize = debugActive ? debugConfig.keySize : finalKeySize;
  const effectiveGap = debugActive ? debugConfig.gap : finalGap;
  const spacingScale = debugActive ? debugConfig.spacingScale : 1;
  const keypadMinHeight = KEYPAD_ROWS * effectiveKeySize + (KEYPAD_ROWS + 1) * effectiveGap;

  const applySpacing = useCallback(
    (value: number, min: number = 2) => Math.max(Math.round(value * spacingScale), min),
    [spacingScale],
  );
  const applyHeight = useCallback(
    (value: number, min: number = 32) => Math.max(Math.round(value * spacingScale), min),
    [spacingScale],
  );

  const prevFitRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!debugActive) return;
    const { hud, timer, image, guess, keypad, content } = layoutHeights;
    if (!hud || !timer || !image || !guess || !keypad || !content) return;
    const safe = top + bottom;
    const usable = vh - safe;
    const sectionsTotal = hud + timer + image + guess + keypad;
    const margins = Math.max(0, content - sectionsTotal);
    const overflow = content - usable;
    const fit = overflow <= 0;

    const logPayload = {
      vh: Math.round(vh),
      safe: Math.round(safe),
      usable: Math.round(usable),
      hudH: hud,
      timerH: timer,
      imageH: image,
      guessH: guess,
      keypadH: keypad,
      margins,
      contentH: content,
      FIT: fit,
    };

    if (prevFitRef.current !== fit || fit === false) {
      console.table(logPayload);
      if (!fit) {
        console.warn(`[PrecisionLayout] Layout overflow by ${overflow} px`);
      }
      console.log(`LAYOUT_FIT: ${fit ? 'OK' : `FAIL (overflow: ${overflow} px)`}`);
      prevFitRef.current = fit;
    }

    setFitState(fit ? 'OK' : 'FAIL');

    if (!fit) {
      setDebugConfig((prev) => {
        let next = prev;
        if (prev.keySize > KEY_SIZE_MIN) {
          const reduced = Math.max(KEY_SIZE_MIN, prev.keySize - KEY_SIZE_STEP);
          if (reduced !== prev.keySize) {
            next = { ...prev, keySize: reduced };
          }
        } else if (prev.gap > GAP_MIN) {
          const reducedGap = Math.max(GAP_MIN, prev.gap - GAP_STEP);
          if (reducedGap !== prev.gap) {
            next = { ...prev, gap: reducedGap };
          }
        } else if (prev.spacingScale > SPACING_MIN) {
          const reducedScale = Math.max(
            SPACING_MIN,
            Math.round((prev.spacingScale - SPACING_STEP) * 100) / 100,
          );
          if (reducedScale !== prev.spacingScale) {
            next = { ...prev, spacingScale: reducedScale };
          }
        }
        return next;
      });
    }
  }, [debugActive, layoutHeights, top, bottom, vh]);

  const keypadStyle = useMemo(() => ({ alignSelf: 'stretch' as const }), []);

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

  const contentInsets = useMemo(
    () => ({
      paddingTop: top + applySpacing(6, 4),
      paddingBottom: bottom + 10,
      paddingLeft: left + applySpacing(10, 8),
      paddingRight: right + applySpacing(10, 8),
    }),
    [applySpacing, bottom, left, right, top],
  );

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
      <PrecisionGameBackground />

      <View
        style={[styles.content, contentInsets]}
        onLayout={updateLayoutHeight('content')}
      >
        {/* --- HUD --- */}
        <View
          style={[
            styles.topHud,
            { gap: applySpacing(6), marginBottom: applySpacing(6) },
          ]}
          onLayout={updateLayoutHeight('hud')}
        >
          <LinearGradient
            colors={[steampunkTheme.cardGradient.start, steampunkTheme.cardGradient.end]}
            style={[
              styles.hudCard,
              {
                paddingVertical: applySpacing(8, 4),
                paddingHorizontal: applySpacing(10, 6),
              },
            ]}
          >
            <Text style={[styles.hudLabel, { fontSize: applySpacing(11, 10) }]}>Niveau</Text>
            <Text style={[styles.hudValue, { fontSize: applySpacing(18, 16), marginTop: applySpacing(2, 1) }]}>
              {levelId}
            </Text>
            {!!levelLabel && (
              <Text style={[styles.hudValueSmall, { fontSize: applySpacing(11, 10), marginTop: applySpacing(1, 0) }]}>
                {levelLabel}
              </Text>
            )}
          </LinearGradient>
          <LinearGradient
            colors={[steampunkTheme.cardGradient.start, steampunkTheme.cardGradient.end]}
            style={[
              styles.hudCard,
              {
                paddingVertical: applySpacing(8, 4),
                paddingHorizontal: applySpacing(10, 6),
              },
            ]}
          >
            <Text style={[styles.hudLabel, { fontSize: applySpacing(11, 10) }]}>Score</Text>
            <Text style={[styles.hudValue, { fontSize: applySpacing(18, 16), marginTop: applySpacing(2, 1) }]}>
              {score}
            </Text>
          </LinearGradient>
          <LinearGradient
            colors={[steampunkTheme.cardGradient.start, steampunkTheme.cardGradient.end]}
            style={[
              styles.hudCard,
              {
                flex: 1.5,
                paddingVertical: applySpacing(8, 4),
                paddingHorizontal: applySpacing(10, 6),
              },
            ]}
          >
            <Text style={[styles.hudLabel, { fontSize: applySpacing(11, 10) }]}>Vitalité</Text>
            <View
              style={[
                styles.progressTrack,
                { height: applySpacing(6, 4), marginTop: applySpacing(2, 1) },
              ]}
            >
              <LinearGradient
                colors={[steampunkTheme.goldGradient.start, steampunkTheme.goldGradient.end]}
                style={[styles.progressFill, { width: `${hpRatio * 100}%` }]}
              />
            </View>
            <Text style={[styles.hudValueSmall, { fontSize: applySpacing(13, 12), marginTop: applySpacing(2, 1) }]}>
              {hp}/{hpMax}
            </Text>
          </LinearGradient>
        </View>

        {/* --- TIMER --- */}
        <TimerDisplay
          progress={timerProgress}
          seconds={timeLeft}
          spacingScale={spacingScale}
          onLayout={updateLayoutHeight('timer')}
        />

        {/* --- MAIN CONTENT AREA --- */}
        <View
          style={[styles.mainContent, { gap: applySpacing(12, 8) }]}
        >
          {showContent && !isGameOver && (
            <>
              {/* --- EVENT IMAGE & TITLE --- */}
              <View
                style={[
                  styles.eventCard,
                  { marginBottom: applySpacing(6, 4) },
                ]}
                onLayout={updateLayoutHeight('image')}
              >
                <Pressable onPress={toggleResultImageLightbox}>
                  <ImageBackground
                    source={{ uri: currentEvent.illustration_url }}
                    style={[styles.eventImage, { height: imgTarget }]}
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
                <View
                  style={[
                    styles.inputSection,
                    { gap: applySpacing(10, 6) },
                  ]}
                  onLayout={updateLayoutHeight('guess')}
                >
                  <View
                    style={[
                      styles.inputSlotsContainer,
                      {
                        gap: applySpacing(6, 4),
                        marginBottom: applySpacing(6, 4),
                        height: applyHeight(42, 34),
                      },
                    ]}
                  >
                    {Array.from({ length: MAX_DIGITS }).map((_, i) => (
                      <View key={i} style={styles.inputSlot}>
                        <Text style={styles.inputSlotText}>{guessValue[i] || ''}</Text>
                      </View>
                    ))}
                  </View>

                  <View
                    style={[
                      styles.keypadWrapper,
                      {
                        minHeight: keypadMinHeight,
                        marginTop: applySpacing(6, 4),
                      },
                    ]}
                    pointerEvents="box-none"
                    onLayout={updateLayoutHeight('keypad')}
                  >
                    <NumericKeypad
                      disabled={!!lastResult}
                      hasGuess={hasGuess}
                      onDigit={handleDigitPress}
                      onDelete={handleBackspace}
                      onSubmit={handleSubmit}
                      keySize={effectiveKeySize}
                      gap={effectiveGap}
                      style={keypadStyle}
                    />
                  </View>
                </View>
              ) : (
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
                          <Text style={styles.resultTimeout}>⏱ Temps écoulé ! -350 HP</Text>
                        ) : (
                          <View style={styles.resultStats}>
                            <Text style={styles.resultDifference}>
                              Écart : {lastResult.absDifference} an{lastResult.absDifference > 1 ? 's' : ''}
                            </Text>
                            {lastResult.absDifference === 0 ? (
                              <Text style={styles.resultHPBonus}>HP +100</Text>
                            ) : (
                              <Text style={styles.resultHP}>HP -{lastResult.hpLoss}</Text>
                            )}
                            <Text style={styles.resultScore}>Score +{lastResult.scoreGain}</Text>
                          </View>
                        )}

                        {!resultExpanded && lastResult.event.description_detaillee && (
                          <Text style={styles.resultDescriptionTruncated} numberOfLines={2}>
                            {lastResult.event.description_detaillee}
                          </Text>
                        )}
                      </View>

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
              )}
            </>
          )}
        </View>
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

      {debugActive && (
        <View pointerEvents="box-none" style={styles.debugRoot}>
          <Pressable style={styles.debugToggle} onPress={() => setOverlayVisible((prev) => !prev)}>
            <Text style={styles.debugToggleText}>?</Text>
          </Pressable>
          {overlayVisible && (
            <View style={styles.debugOverlay} pointerEvents="none">
              <Text style={styles.debugOverlayText}>
                {`HUD:${layoutHeights.hud} TIM:${layoutHeights.timer} IMG:${layoutHeights.image} GUE:${layoutHeights.guess} PAD:${layoutHeights.keypad} FIT:${fitState}`}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: steampunkTheme.mainBg,
    position: 'relative',
  },
  content: {
    flex: 1,
    gap: 12,
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
    gap: 0,
    marginBottom: 0,
  },
  hudCard: {
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: steampunkTheme.goldBorderTransparent,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: 'black', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  hudLabel: {
    color: steampunkTheme.secondaryText,
    fontSize: 11,
    fontWeight: '600',
  },
  hudValue: {
    color: steampunkTheme.primaryText,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  hudValueSmall: {
    color: steampunkTheme.primaryText,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  // --- Progress Bars ---
  progressTrack: {
    height: 8,
    width: '100%',
    backgroundColor: steampunkTheme.progressTrack,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 2,
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
    marginBottom: 0,
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
    gap: 0,
  },
  // --- Event Card ---
  eventCard: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: steampunkTheme.cardPanel,
    flexShrink: 0,
  },
  eventImage: {
    width: '100%',
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
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'flex-start',
    gap: 0,
    flexShrink: 0,
  },
  inputSlotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 6,
    height: 42,
  },
  inputSlot: {
    flex: 1,
    maxWidth: 54,
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
  keypadWrapper: {
    width: '100%',
    alignSelf: 'center',
    flexShrink: 0,
    marginTop: 6,
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
  resultHPBonus: {
    color: '#4CAF50',
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
  debugRoot: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  debugToggle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  debugToggleText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  debugOverlay: {
    marginLeft: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  debugOverlayText: {
    color: '#F5F5F5',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default PrecisionGameContent;
