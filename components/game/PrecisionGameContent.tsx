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
import NumericKeypad, { NUMERIC_KEYPAD_HEIGHT_RATIO } from './NumericKeypad';
import { usePrecisionAudio } from '../../hooks/game/usePrecisionAudio';
import useAudio from '../../hooks/useAudio';

const LAYOUT_DEBUG = false;
const KEYPAD_ROWS = 4;
const KEYPAD_COLS = 3;
const KEY_SIZE_MIN = 32; // Réduit de 36 à 32 pour permettre un pavé plus compact
const KEY_SIZE_MAX = 130; // Augmenté pour permettre au pavé d'utiliser 98% de la largeur
const GAP_MIN = 1; // Réduit de 2 à 1
const SPACING_MIN = 0.60;
const KEY_SIZE_STEP = 3;
const GAP_STEP = 1;
const SPACING_STEP = 0.05;

// --- PROPS INTERFACE ---
interface PrecisionGameContentProps {
  loading: boolean;
  error: string | null;
  currentEvent: Event | null;
  score: number;
  hp: number;
  hpMax: number;
  baseHpCap: number;
  levelLabel: string;
  levelId: number;
  levelProgress: number;
  lastResult: PrecisionResult | null;
  isGameOver: boolean;
  timeLeft: number;
  timerProgress: number;
  timerLimit: number;
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
  eventsAnsweredInLevel: number;
  eventsRequiredForLevel: number;
  focusGauge: number;
  focusLevel: number;
  focusHpBonus: number;
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
  limitSeconds?: number;
  spacingScale?: number;
  onLayout?: (event: LayoutChangeEvent) => void;
}

const TimerDisplay = memo(({ progress, seconds, limitSeconds, spacingScale = 1, onLayout }: TimerDisplayProps) => {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const marginBottom = 0; // Supprime la marge inférieure
  const rowGap = Math.max(Math.round(3 * spacingScale), 2); // Réduit le gap
  const badgePaddingH = Math.max(Math.round(6 * spacingScale), 4); // Réduit le padding horizontal
  const badgePaddingV = Math.max(Math.round(1 * spacingScale), 1); // Réduit le padding vertical
  const badgeRadius = Math.max(Math.round(6 * spacingScale), 4); // Réduit le radius
  const timerFont = Math.max(Math.round(12 * spacingScale), 10); // Réduit la taille de police
  const timerLabel = limitSeconds ? `${seconds}s / ${limitSeconds}s` : `${seconds}s`;
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
        <Text style={[styles.timerValue, { fontSize: timerFont }]}>{timerLabel}</Text>
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
  baseHpCap,
  levelLabel,
  levelId,
  levelProgress,
  lastResult,
  isGameOver,
  timeLeft,
  timerProgress,
  timerLimit,
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
  eventsAnsweredInLevel,
  eventsRequiredForLevel,
  focusGauge,
  focusLevel,
  focusHpBonus,
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
  const prevFocusGaugeRef = useRef(focusGauge);
  const prevFocusLevelRef = useRef(focusLevel);
  const showLevelComplete = useMemo(() => levelProgress >= 1, [levelProgress]);
  const prevLevelCompleteRef = useRef(showLevelComplete);
  const prevGameOverRef = useRef(isGameOver);
  const hasMountedFocusRef = useRef(false);

  // --- AUDIO ---
  const { soundVolume, isSoundEnabled } = useAudio();
  const precisionAudio = usePrecisionAudio({ soundVolume, isSoundEnabled });

  // --- MEMOIZED VALUES ---
  const hpRatio = useMemo(() => Math.max(0, Math.min(1, hp / hpMax)), [hp, hpMax]);
  const focusRatio = useMemo(() => Math.max(0, Math.min(1, focusGauge / 100)), [focusGauge]);
  const hasGuess = guessValue !== '' && guessValue !== '-';
  const resultDiffLabel = lastResult
    ? lastResult.timedOut
      ? 'Temps écoulé'
      : `${formatDifference(lastResult.difference)} ans d'écart`
    : null;
  const displayedCountdown = autoAdvanceCountdown ?? AUTO_ADVANCE_SECONDS;

  const layoutMetrics = useMemo(() => {
    // Estimation des hauteurs fixes
    const hudEstimate = 55;
    const timerEstimate = 25;
    const inputSlotsEstimate = 36;
    const contentGaps = 8;
    const safetyMargin = 10;
    const chromeTotal = hudEstimate + timerEstimate + inputSlotsEstimate + contentGaps + safetyMargin;

    const safeHeight = top + bottom;
    const contentPaddingTopExtra = 0;
    const contentPaddingBottom = bottom;
    const extraBottom = 0;
    const usableSpace = Math.max(
      vh - safeHeight - chromeTotal - contentPaddingTopExtra - extraBottom,
      0,
    );

    const aspectRatio = vw > 0 ? vh / vw : 1;
    let imageFraction = 0.37;
    if (aspectRatio >= 1.9) imageFraction = 0.40;
    else if (aspectRatio >= 1.7) imageFraction = 0.38;
    else if (aspectRatio >= 1.5) imageFraction = 0.37;
    else imageFraction = 0.35;

    const imgTarget = Math.max(170, usableSpace * imageFraction);
    const sectionGap = 2;

    // Ajout de 1% d'espace en dessous du pavé
    const bottomMarginPercent = 0.01;
    const bottomMarginPx = Math.round(vh * bottomMarginPercent);

    const keypadTarget = Math.max(usableSpace - imgTarget - sectionGap - bottomMarginPx, 0);

    const baseGap = 1;
    const cols = KEYPAD_COLS;
    const rows = KEYPAD_ROWS;

    // Calcul de la largeur : 1% de marge de chaque côté
    const horizontalMarginPercent = 0.01;
    const singleMargin = Math.round(vw * horizontalMarginPercent);

    const safeLeft = Math.max(left, singleMargin);
    const safeRight = Math.max(right, singleMargin);

    const availableWidth = Math.max(vw - safeLeft - safeRight, 0);

    // On veut que le pavé fasse 98% de availableWidth
    const targetKeypadWidthRatio = 0.98;
    const containerWidth = Math.round(availableWidth * targetKeypadWidthRatio);

    const widthDenominator = cols > 0 ? cols : 1;
    const gapsWidth = baseGap * Math.max(cols - 1, 0);
    const internalWidth = Math.max(containerWidth - gapsWidth, 0);
    const baseKeySize = internalWidth > 0 ? Math.floor(internalWidth / widthDenominator) : 0;

    const fallbackSize = containerWidth > 0 ? Math.floor(containerWidth / widthDenominator) : 46;
    const keySizeCandidate = baseKeySize > 0 ? baseKeySize : Math.max(fallbackSize, 32);

    // PRIORITÉ À LA LARGEUR : on force la taille calculée depuis la largeur
    const targetKeyWidth = Math.max(KEY_SIZE_MIN, Math.min(KEY_SIZE_MAX, keySizeCandidate));

    // Maintenant on calcule quel ratio hauteur/largeur on peut se permettre
    let finalGap = Math.max(GAP_MIN, baseGap);
    const verticalPadding = Math.max(1, Math.floor(finalGap / 3));
    const paddingTotal = verticalPadding * 2;

    // Calcul de la hauteur disponible pour les touches
    const availableHeightForKeys = Math.max(keypadTarget - (rows + 1) * finalGap - paddingTotal, 0);
    const maxKeyHeight = rows > 0 ? Math.floor(availableHeightForKeys / rows) : 0;

    // Calcul du ratio hauteur/largeur optimal
    const optimalHeightRatio = targetKeyWidth > 0 ? maxKeyHeight / targetKeyWidth : NUMERIC_KEYPAD_HEIGHT_RATIO;
    const actualHeightRatio = Math.min(NUMERIC_KEYPAD_HEIGHT_RATIO, optimalHeightRatio);

    const finalKeySize = targetKeyWidth;
    const finalKeyHeight = Math.round(finalKeySize * actualHeightRatio);
    const finalKeypadHeight = rows * finalKeyHeight + (rows + 1) * finalGap + paddingTotal;

    const overflow = finalKeypadHeight - keypadTarget;
    if (overflow > 0) {
      // Si on déborde, on réduit le gap
      while (overflow > 0 && finalGap > GAP_MIN) {
        finalGap = Math.max(GAP_MIN, finalGap - 1);
        const newVerticalPadding = Math.max(1, Math.floor(finalGap / 3));
        const newPaddingTotal = newVerticalPadding * 2;
        const newAvailableHeight = Math.max(keypadTarget - (rows + 1) * finalGap - newPaddingTotal, 0);
        const newMaxKeyHeight = rows > 0 ? Math.floor(newAvailableHeight / rows) : 0;
        const newHeightRatio = targetKeyWidth > 0 ? newMaxKeyHeight / targetKeyWidth : actualHeightRatio;
        const adjustedHeightRatio = Math.min(actualHeightRatio, newHeightRatio);

        const testHeight = rows * Math.round(finalKeySize * adjustedHeightRatio) + (rows + 1) * finalGap + newPaddingTotal;

        if (testHeight <= keypadTarget) {
          break;
        }
      }
    }

    const keypadBaseWidth = finalKeySize * KEYPAD_COLS + finalGap * Math.max(KEYPAD_COLS - 1, 0);
    const keypadContainerWidth = containerWidth; // On force la largeur du container

    return {
      imgTarget,
      finalKeySize,
      finalGap,
      keypadContainerWidth,
      contentPaddingTopExtra,
      contentPaddingBottom,
      keypadTarget,
      bottomMarginPx,
      keyHeightRatio: actualHeightRatio,
    };
  }, [bottom, left, right, top, vh, vw]);
  const {
    imgTarget,
    finalKeySize,
    finalGap,
    keypadContainerWidth,
    contentPaddingTopExtra,
    contentPaddingBottom,
    keypadTarget,
    bottomMarginPx,
    keyHeightRatio,
  } = layoutMetrics;

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

  const keypadStyle = useMemo(
    () => ({
      alignSelf: 'center' as const,
      width: keypadContainerWidth,
      maxHeight: keypadTarget > 0 ? keypadTarget : undefined,
    }),
    [keypadContainerWidth, keypadTarget],
  );

  // --- CALLBACKS ---
  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceTimeoutRef.current) clearTimeout(autoAdvanceTimeoutRef.current);
    if (autoAdvanceIntervalRef.current) clearInterval(autoAdvanceIntervalRef.current);
    autoAdvanceTimeoutRef.current = null;
    autoAdvanceIntervalRef.current = null;
    setAutoAdvanceCountdown(null);
  }, []);

  const handleDigitPress = useCallback((digit: string) => {
    console.log('[handleDigitPress] Called with digit:', digit);
    setInputError(null);

    setGuessValue((prev) => {
      console.log('[handleDigitPress] Previous value:', prev);
      const isNegative = prev.startsWith('-');
      const digits = isNegative ? prev.slice(1) : prev;
      if (digits.length >= MAX_DIGITS) {
        console.log('[handleDigitPress] Max digits reached, returning prev');
        return prev;
      }
      const nextDigits = digits + digit;
      const newValue = (isNegative ? '-' : '') + nextDigits;
      console.log('[handleDigitPress] New value:', newValue);
      return newValue;
    });

    // Jouer le son après la mise à jour de l'état
    precisionAudio.playKeyPress();
  }, [precisionAudio]);

  const handleBackspace = useCallback(() => {
    console.log('[handleBackspace] Called');
    setInputError(null);

    setGuessValue((prev) => {
      console.log('[handleBackspace] Previous value:', prev);
      if (prev.length === 0) {
        console.log('[handleBackspace] Empty value, returning prev');
        return prev;
      }
      const trimmed = prev.slice(0, -1);
      if (trimmed === '-') {
        console.log('[handleBackspace] Only minus sign left, clearing');
        return '';
      }
      console.log('[handleBackspace] New value:', trimmed);
      return trimmed;
    });

    // Jouer le son après la mise à jour de l'état
    precisionAudio.playKeyPress();
  }, [precisionAudio]);

  const handleSubmit = useCallback(() => {
    console.log('[handleSubmit] Called with guessValue:', guessValue);
    if (submitLockRef.current) {
      console.log('[handleSubmit] Submit locked, returning');
      return;
    }
    const parsed = parseInt(guessValue, 10);
    if (!guessValue || Number.isNaN(parsed)) {
      console.log('[handleSubmit] Invalid guess value');
      setInputError('Entrez une année valide.');
      return;
    }
    console.log('[handleSubmit] Submitting guess:', parsed);
    setInputError(null);
    submitLockRef.current = true;
    setTimeout(() => { submitLockRef.current = false; }, 200);
    hasAnsweredRef.current = true;
    clearAutoAdvance();
    precisionAudio.playSubmit();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSubmitGuess(parsed);
  }, [guessValue, clearAutoAdvance, onSubmitGuess, precisionAudio]);

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
    console.log('[Effect lastResult] lastResult changed:', lastResult?.event?.titre || 'null');
    if (!lastResult) {
      console.log('[Effect lastResult] No result, clearing guessValue');
      setGuessValue('');
      setInputError(null);
      setResultExpanded(false);
      resultFadeAnim.setValue(0);
      return;
    }

    console.log('[Effect lastResult] Result present, playing audio');
    if (lastResult.timedOut) {
      precisionAudio.playTimerExpired();
    } else {
      precisionAudio.playAnswerResult(lastResult.absDifference);
    }

    setResultExpanded(false);
    resultFadeAnim.setValue(0);
    Animated.timing(resultFadeAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [lastResult, currentEvent?.id, precisionAudio, resultFadeAnim]);

  useEffect(() => {
    if (timeLeft === 0 && !lastResult && !isGameOver) {
      flashAnim.setValue(1);
      Animated.timing(flashAnim, { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    }
  }, [flashAnim, isGameOver, lastResult, timeLeft]);

  // Son d'avertissement quand le temps devient faible (5 secondes)
  const prevTimeLeftRef = useRef(timeLeft);
  useEffect(() => {
    // Ne jouer le son que quand on PASSE à 5 secondes (pas à chaque render)
    if (timeLeft === 5 && prevTimeLeftRef.current === 6 && !lastResult && !isGameOver) {
      precisionAudio.playTimerWarning();
    }
    prevTimeLeftRef.current = timeLeft;
  }, [timeLeft, lastResult, isGameOver, precisionAudio]);

  useEffect(() => {
    if (!hasMountedFocusRef.current) {
      hasMountedFocusRef.current = true;
      prevFocusGaugeRef.current = focusGauge;
      prevFocusLevelRef.current = focusLevel;
      return;
    }

    if (focusLevel > prevFocusLevelRef.current) {
      precisionAudio.playFocusLevelUp();
    }

    const gaugeDelta = focusGauge - prevFocusGaugeRef.current;
    if (focusLevel === prevFocusLevelRef.current) {
      if (gaugeDelta >= 8) {
        precisionAudio.playFocusGain();
      } else if (gaugeDelta <= -8) {
        precisionAudio.playFocusLoss();
      }
    } else if (focusLevel < prevFocusLevelRef.current && gaugeDelta <= -8) {
      // Au cas improbable d'une baisse de niveau de focus
      precisionAudio.playFocusLoss();
    }

    prevFocusGaugeRef.current = focusGauge;
    prevFocusLevelRef.current = focusLevel;
  }, [focusGauge, focusLevel, precisionAudio]);

  useEffect(() => {
    if (showLevelComplete && !prevLevelCompleteRef.current) {
      precisionAudio.playLevelUp();
    }
    prevLevelCompleteRef.current = showLevelComplete;
  }, [showLevelComplete, precisionAudio]);

  useEffect(() => {
    if (isGameOver && !prevGameOverRef.current) {
      precisionAudio.playGameOver();
    }
    prevGameOverRef.current = isGameOver;
  }, [isGameOver, precisionAudio]);

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
    return () => {
      precisionAudio.stopAll();
    };
  }, [currentEvent?.id, precisionAudio]);

  // --- RENDER ---
  const showContent = !loading && !error && currentEvent;

  const contentInsets = useMemo(() => {
    const horizontalInset = Math.max(vw * 0.01, 4); // 1% de marge (cohérent avec layoutMetrics)
    const topPadding = 0; // Supprime le padding supérieur
    return {
      paddingTop: top + topPadding,
      paddingBottom: contentPaddingBottom,
      paddingLeft: Math.max(left, horizontalInset),
      paddingRight: Math.max(right, horizontalInset),
    };
  }, [contentPaddingBottom, left, right, top, vw]);

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
            { gap: applySpacing(3, 2), marginBottom: 0 }, // Réduit le gap et supprime marginBottom
          ]}
          onLayout={updateLayoutHeight('hud')}
        >
          <LinearGradient
            colors={[steampunkTheme.cardGradient.start, steampunkTheme.cardGradient.end]}
            style={[
              styles.hudCard,
              {
                paddingVertical: applySpacing(4, 2), // Réduit padding vertical
                paddingHorizontal: applySpacing(5, 3), // Réduit padding horizontal
              },
            ]}
          >
            <Text style={[styles.hudLabel, { fontSize: applySpacing(9, 8) }]}>Niveau</Text>
            <Text style={[styles.hudValue, { fontSize: applySpacing(13, 12), marginTop: 0 }]}>
              {levelId}
            </Text>
            {!!levelLabel && (
              <Text style={[styles.hudValueSmall, { fontSize: applySpacing(8, 7), marginTop: 0 }]}>
                {levelLabel}
              </Text>
            )}
            <Text style={[styles.hudEventCounter, { fontSize: applySpacing(7, 6), marginTop: 0 }]}>
              {eventsAnsweredInLevel + 1}/{eventsRequiredForLevel}
            </Text>
          </LinearGradient>
          <LinearGradient
            colors={[steampunkTheme.cardGradient.start, steampunkTheme.cardGradient.end]}
            style={[
              styles.hudCard,
              {
                paddingVertical: applySpacing(4, 2), // Réduit padding vertical
                paddingHorizontal: applySpacing(5, 3), // Réduit padding horizontal
              },
            ]}
          >
            <Text style={[styles.hudLabel, { fontSize: applySpacing(9, 8) }]}>Score</Text>
            <Text style={[styles.hudValue, { fontSize: applySpacing(13, 12), marginTop: 0 }]}> {/* Réduit fontSize et marginTop */}
              {score}
            </Text>
          </LinearGradient>
          <LinearGradient
            colors={[steampunkTheme.cardGradient.start, steampunkTheme.cardGradient.end]}
            style={[
              styles.hudCard,
              {
                flex: 1.5,
                paddingVertical: applySpacing(4, 2), // Réduit padding vertical
                paddingHorizontal: applySpacing(5, 3), // Réduit padding horizontal
              },
            ]}
          >
            <Text style={[styles.hudLabel, { fontSize: applySpacing(9, 8) }]}>Vitalité</Text>
            <View
              style={[
                styles.progressTrack,
                { height: applySpacing(3, 2), marginTop: 0 }, // Réduit height et marginTop
              ]}
            >
              <LinearGradient
                colors={[steampunkTheme.goldGradient.start, steampunkTheme.goldGradient.end]}
                style={[styles.progressFill, { width: `${hpRatio * 100}%` }]}
              />
            </View>
            <View style={styles.hudSubRow}>
              <Text style={[styles.hudValueSmall, { fontSize: applySpacing(8, 7), marginTop: 0 }]}>
                {hp}/{hpMax}
              </Text>
              <Text style={[styles.hudValueSmall, { fontSize: applySpacing(7, 6), marginTop: 0 }]}>
                Max {baseHpCap}{focusHpBonus > 0 ? ` +${focusHpBonus}` : ''}
              </Text>
            </View>
            <View style={[styles.focusTrack, { height: applySpacing(2.3, 1.8) }]}>
              <LinearGradient
                colors={['#3fd6c6', '#7df5e2']}
                style={[styles.focusFill, { width: `${focusRatio * 100}%` }]}
              />
            </View>
            <View style={styles.hudSubRow}>
              <Text style={[styles.hudValueSmall, { fontSize: applySpacing(7, 6) }]}>
                Focus Lv{focusLevel}
              </Text>
              <Text style={[styles.hudValueSmall, { fontSize: applySpacing(7, 6) }]}>
                {Math.round(focusGauge)}%
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* --- TIMER --- */}
        <TimerDisplay
          progress={timerProgress}
          seconds={timeLeft}
          limitSeconds={timerLimit}
          spacingScale={spacingScale}
          onLayout={updateLayoutHeight('timer')}
        />

        {/* --- MAIN CONTENT AREA --- */}
        <View
          style={[styles.mainContent, { gap: applySpacing(2, 1) }]} // Réduit le gap du mainContent
        >
          {showContent && !isGameOver && (
            <>
              {/* --- EVENT IMAGE & TITLE --- */}
              <View
                style={[
                  styles.eventCard,
                  { marginBottom: 0 }, // Supprime la marge inférieure
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
                    { gap: applySpacing(2, 1) }, // Réduit le gap
                  ]}
                  onLayout={updateLayoutHeight('guess')}
                >
                  <View
                    style={[
                      styles.inputSlotsContainer,
                      {
                        gap: applySpacing(3, 2), // Réduit le gap entre les slots
                        marginBottom: applySpacing(1, 0), // Réduit la marge inférieure
                        height: applyHeight(32, 28), // Réduit la hauteur des slots
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
                        marginTop: 0, // Supprime la marge supérieure du pavé
                        marginBottom: bottomMarginPx, // Ajoute 1% de marge en dessous
                        maxHeight: keypadTarget > 0 ? keypadTarget : undefined,
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
                      keyHeightRatio={keyHeightRatio}
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
                          <Text style={styles.resultTimeout}>⏱ Temps écoulé ! -250 HP</Text>
                        ) : (
                          <View style={styles.resultStats}>
                            <Text style={styles.resultDifference}>
                              Écart : {lastResult.absDifference} an{lastResult.absDifference > 1 ? 's' : ''}
                            </Text>
                            {lastResult.hpGain > 0 ? (
                              <Text style={styles.resultHPBonus}>HP +{lastResult.hpGain}</Text>
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
    gap: 2, // Réduit le gap de 8 à 2 pour économiser l'espace vertical
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
  hudSubRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  hudEventCounter: {
    color: steampunkTheme.secondaryText,
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
    opacity: 0.8,
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
  focusTrack: {
    width: '100%',
    backgroundColor: steampunkTheme.progressTrack,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 4,
  },
  focusFill: {
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
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: steampunkTheme.cardPanel,
  },
  eventImage: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  eventImageStyle: {
    borderRadius: 14,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  titleBadge: {
    margin: 4, // Réduit la marge
    paddingVertical: 3, // Réduit le padding vertical
    paddingHorizontal: 6, // Réduit le padding horizontal
    borderRadius: 8, // Réduit le radius
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: steampunkTheme.goldBorderTransparent,
    backgroundColor: steampunkTheme.glassBg,
  },
  eventTitle: {
    color: steampunkTheme.primaryText,
    fontSize: 13, // Réduit la taille de la police
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
    flexShrink: 1,
  },
  inputSlotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 3, // Réduit le gap
    marginBottom: 2, // Réduit la marge
    height: 32, // Réduit la hauteur
  },
  inputSlot: {
    flex: 1,
    maxWidth: 42, // Réduit la largeur max
    backgroundColor: steampunkTheme.inputSlot,
    borderRadius: 8, // Réduit le radius
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
    fontSize: 20, // Réduit la taille de la police
    fontWeight: 'bold',
  },
  keypadWrapper: {
    width: '100%',
    alignSelf: 'center',
    marginTop: 0, // Supprime la marge supérieure
    flexShrink: 1,
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
