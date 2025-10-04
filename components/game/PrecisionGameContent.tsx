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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Event } from '../../hooks/types';
import colors from '../../constants/Colors';
import { PrecisionResult } from '../../hooks/game/usePrecisionGame';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

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

function formatDifference(diff: number) {
  const sign = diff > 0 ? '+' : diff < 0 ? '-' : '';
  return `${sign}${Math.abs(diff)}`;
}

const AUTO_ADVANCE_MS = 10000;
const AUTO_ADVANCE_SECONDS = Math.ceil(AUTO_ADVANCE_MS / 1000);

const PrecisionGameContent: React.FC<PrecisionGameContentProps> = ({
  loading,
  error,
  currentEvent,
  score,
  hp,
  hpMax,
  levelLabel,
  levelId,
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

  const hpRatio = useMemo(() => Math.max(0, Math.min(1, hp / hpMax)), [hp, hpMax]);

  const MAX_DIGITS = 4;
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

  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
    if (autoAdvanceIntervalRef.current) {
      clearInterval(autoAdvanceIntervalRef.current);
      autoAdvanceIntervalRef.current = null;
    }
    setAutoAdvanceCountdown(null);
  }, []);

  useEffect(() => {
    if (timeLeft === 0 && !lastResult && !isGameOver) {
      flashAnim.setValue(1);
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    }
  }, [flashAnim, isGameOver, lastResult, timeLeft]);

  useEffect(() => {
    if (showDescription) {
      pauseTimer();
    } else {
      resumeTimer();
    }
  }, [pauseTimer, resumeTimer, showDescription]);

  useEffect(() => {
    if (!lastResult) {
      hasAnsweredRef.current = false;
      clearAutoAdvance();
      return;
    }

    if (isGameOver || showDescription) {
      clearAutoAdvance();
      return;
    }

    clearAutoAdvance();

    let remaining = AUTO_ADVANCE_SECONDS;
    setAutoAdvanceCountdown(remaining);

    autoAdvanceIntervalRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        setAutoAdvanceCountdown(0);
        if (autoAdvanceIntervalRef.current) {
          clearInterval(autoAdvanceIntervalRef.current);
          autoAdvanceIntervalRef.current = null;
        }
        return;
      }
      setAutoAdvanceCountdown(remaining);
    }, 1000);

    autoAdvanceTimeoutRef.current = setTimeout(() => {
      clearAutoAdvance();
      onContinue();
    }, AUTO_ADVANCE_MS);

    return () => {
      clearAutoAdvance();
    };
  }, [lastResult, showDescription, isGameOver, onContinue, clearAutoAdvance]);

  useEffect(() => () => {
    clearAutoAdvance();
  }, [clearAutoAdvance]);

  const handleDigitPress = (digit: string) => {
    if (lastResult || isGameOver) {
      return;
    }

    setInputError(null);
    setGuessValue((prev) => {
      const isNegative = prev.startsWith('-');
      const digits = isNegative ? prev.slice(1) : prev;
      if (digits.length >= MAX_DIGITS) {
        return prev;
      }
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
    if (showDescription) {
      setShowDescription(false);
    }
    onContinue();
  };

  const showContent = !loading && !error && currentEvent;

  const KeypadButton = ({
    label,
    onPress,
    containerStyle,
    textStyle,
    disabled,
  }: {
    label: string;
    onPress: () => void;
    containerStyle?: any;
    textStyle?: any;
    disabled?: boolean;
  }) => {
    const [isPressed, setIsPressed] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;

    const handlePressIn = () => {
      if (disabled) return;
      setIsPressed(true);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0.94,
          tension: 300,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      onPress();
    };

    const handlePressOut = () => {
      setIsPressed(false);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 300,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    };

    return (
      <Animated.View
        style={[
          styles.keypadKey,
          containerStyle,
          disabled && styles.keypadDisabled,
          isPressed && styles.keypadPressed,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Pressable
          accessibilityLabel={label}
          style={styles.keypadPressable}
          android_disableSound
          hitSlop={10}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
        >
          <Text style={[styles.keypadKeyText, textStyle]}>{label}</Text>
        </Pressable>
      </Animated.View>
    );
  };

  const openDescription = () => {
    if (!currentEvent?.description_detaillee) return;
    clearAutoAdvance();
    setShowDescription(true);
  };

  const closeDescription = () => {
    setShowDescription(false);
  };

  const closeDescriptionAndContinue = () => {
    setShowDescription(false);
    if (lastResult && !isGameOver) {
      onContinue();
    }
  };

  const openImageLightbox = () => {
    if (!currentEvent?.illustration_url) return;
    setShowImageLightbox(true);
    lightboxScale.setValue(0.8);
    lightboxOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(lightboxScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(lightboxOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeImageLightbox = () => {
    Animated.parallel([
      Animated.timing(lightboxScale, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(lightboxOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowImageLightbox(false);
    });
  };

  useEffect(() => {
    setShowDescription(false);
    setShowImageLightbox(false);
  }, [currentEvent?.id]);

  return (
    <View style={styles.container}>
      <Animated.View pointerEvents="none" style={[styles.flashOverlay, { opacity: flashAnim }]} />
      <View style={styles.topBars}>
        <View style={styles.compactStat}>
          <Text style={styles.compactLabel}>Niveau</Text>
          <Text style={styles.compactValue}>{levelId}</Text>
          <Text style={styles.compactSub}>{levelLabel}</Text>
        </View>
        <View style={styles.compactStat}>
          <Text style={styles.compactLabel}>Score</Text>
          <Text style={styles.compactValueSmaller}>{score}</Text>
          <View style={styles.slimBar}>
            <View style={[styles.slimFill, { width: `${Math.min(100, Math.max(0, levelProgress * 100))}%` }]} />
          </View>
          {scoreDelta !== null && (
            <Text
              style={[
                styles.compactDelta,
                scoreDelta >= 0 ? styles.deltaPositive : styles.deltaNegative,
              ]}
            >
              {scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta} pts
            </Text>
          )}
        </View>
        <View style={styles.compactStat}>
          <Text style={styles.compactLabel}>Vitalité</Text>
          <Text style={styles.compactValueSmaller}>{hp}/{hpMax}</Text>
          <View style={styles.slimBar}>
            <View style={[styles.slimFillVital, { width: `${hpRatio * 100}%` }]} />
          </View>
          {hpDelta !== null && (
            <Text
              style={[
                styles.compactDelta,
                hpDelta >= 0 ? styles.deltaPositive : styles.deltaNegative,
              ]}
            >
              {hpDelta >= 0 ? `+${hpDelta}` : `${hpDelta}`} HP
            </Text>
          )}
        </View>
      </View>

      <View style={styles.timerContainer}>
        <View style={styles.timerBar}>
          <View style={[styles.timerFill, { width: `${Math.max(0, timerProgress * 100)}%` }]} />
        </View>
        <Text style={styles.timerValue}>{timeLabel}</Text>
      </View>

      {lastResult && (
        <Animated.View style={{ opacity: resultFadeAnim }}>
          <Pressable style={styles.resultBanner} onPress={openDescription} accessibilityRole="button">
            <Text style={styles.resultBannerTitle}>{resultDiffLabel}</Text>
            <View style={styles.resultDateRow}>
              <Text style={styles.resultDateLabel}>Date correcte :</Text>
              <Text style={styles.resultDateValue}>{lastResult.actualYear}</Text>
            </View>
            <Text style={styles.resultEventTitle}>{currentEvent?.titre}</Text>
            {currentEvent?.description_detaillee && (
              <Text style={styles.resultDescriptionPreview} numberOfLines={2}>
                {currentEvent.description_detaillee}
              </Text>
            )}
            {lastResult.leveledUp && (
              <Text style={styles.levelUpText}>Niveau {lastResult.levelAfter} atteint ! (+{LEVEL_UP_BONUS_HP} PV)</Text>
            )}
            <Text style={styles.resultTapHint}>Toucher pour voir plus de détails</Text>
          </Pressable>
        </Animated.View>
      )}

      {lastResult && (
        <View style={styles.countdownBox}>
          <Pressable
            style={styles.countdownBoxButtonLarge}
            onPress={handleContinue}
            accessibilityRole="button"
          >
            <Text style={styles.countdownBoxButtonText}>Continuer</Text>
          </Pressable>
          {autoAdvanceCountdown !== null && autoAdvanceCountdown > 0 && (
            <Text style={styles.countdownBoxAutoAdvance}>
              Auto dans {Math.max(0, displayedCountdown)}s
            </Text>
          )}
        </View>
      )}

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Chargement des événements…</Text>
        </View>
      )}

      {error && !loading && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.primaryButton} onPress={onReload} accessibilityRole="button">
            <Text style={styles.primaryButtonText}>Réessayer</Text>
          </Pressable>
        </View>
      )}

      {showContent && !isGameOver && (
        <ScrollView
          contentContainerStyle={[styles.scrollContainer, { paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardContainer}>
            {currentEvent?.illustration_url ? (
              <Pressable onPress={openImageLightbox} style={styles.imageClickable}>
                <ImageBackground
                  source={{ uri: currentEvent.illustration_url }}
                  style={styles.eventImage}
                  imageStyle={styles.eventImageStyle}
                  resizeMode="cover"
                >
                  <LinearGradient
                    colors={['rgba(2, 8, 23, 0.0)', 'rgba(2, 8, 23, 0.7)']}
                    style={styles.imageOverlay}
                  />
                  <View style={styles.eventTextContainer}>
                    <Text style={styles.eventTitle}>{currentEvent?.titre}</Text>
                  </View>
                  {urgentLabel && (
                    <View style={styles.countdownOverlay}>
                      <Text style={styles.countdownText}>{urgentLabel}</Text>
                    </View>
                  )}
                  <View style={styles.zoomIconContainer}>
                    <Text style={styles.zoomIcon}>🔍</Text>
                  </View>
                </ImageBackground>
              </Pressable>
            ) : (
              <View style={[styles.eventImage, styles.eventFallback]}>
                <Text style={styles.eventTitle}>{currentEvent?.titre}</Text>
                {urgentLabel && (
                  <View style={styles.countdownOverlay}>
                    <Text style={styles.countdownText}>{urgentLabel}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.inputCard}>
            <View style={[styles.inputDisplay, inputError ? styles.inputError : null]}>
              <Text style={styles.inputDisplayText}>{hasGuess ? guessValue : '____'}</Text>
            </View>
            {inputError && <Text style={styles.inputErrorText}>{inputError}</Text>}

            <View style={[styles.keypadContainer, { paddingBottom: Math.max(0, insets.bottom / 2) }] }>
              {[
                ['1', '2', '3'],
                ['4', '5', '6'],
                ['7', '8', '9'],
              ].map((row, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.keypadRow}>
                  {row.map((key) => (
                    <KeypadButton
                      key={key}
                      label={key}
                      onPress={() => handleDigitPress(key)}
                      disabled={!!lastResult}
                    />
                  ))}
                </View>
              ))}
              <View style={styles.keypadRow}>
                <KeypadButton
                  label="⌫"
                  onPress={handleBackspace}
                  containerStyle={styles.keypadDeleteKey}
                  textStyle={styles.keypadDeleteText}
                  disabled={!!lastResult}
                />
                <KeypadButton
                  label="0"
                  onPress={() => handleDigitPress('0')}
                  disabled={!!lastResult}
                />
                <KeypadButton
                  label="VALIDER"
                  onPress={handleSubmit}
                  containerStyle={[styles.keypadSubmitKey, (!hasGuess || !!lastResult) && styles.keypadDisabled]}
                  textStyle={styles.keypadSubmitText}
                  disabled={!hasGuess || !!lastResult}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      {isGameOver && (
        <View style={styles.resultOverlay}>
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Partie terminée</Text>
            <Text style={styles.resultDifference}>Score final : {score}</Text>
            <Text style={styles.resultDetail}>Tu as atteint le niveau {levelId} ({levelLabel}).</Text>
            <Pressable style={styles.primaryButton} onPress={onRestart} accessibilityRole="button">
              <Text style={styles.primaryButtonText}>Rejouer</Text>
            </Pressable>
            <Pressable style={[styles.primaryButton, styles.secondaryButton]} onPress={onExit} accessibilityRole="button">
              <Text style={[styles.primaryButtonText, styles.secondaryButtonText]}>Menu principal</Text>
            </Pressable>
          </View>
        </View>
      )}

      <Modal
        transparent
        visible={showDescription}
        animationType="fade"
        onRequestClose={closeDescription}
      >
        <View style={styles.descriptionOverlay}>
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionTitle}>{currentEvent?.titre}</Text>
            <ScrollView style={styles.descriptionScroll}>
              <Text style={styles.descriptionText}>{currentEvent?.description_detaillee}</Text>
            </ScrollView>
            <View style={styles.descriptionButtons}>
              {lastResult && !isGameOver && (
                <Pressable style={styles.descriptionNext} onPress={closeDescriptionAndContinue} accessibilityRole="button">
                  <Text style={styles.descriptionNextText}>Événement suivant</Text>
                </Pressable>
              )}
              <Pressable style={styles.descriptionClose} onPress={closeDescription} accessibilityRole="button">
                <Text style={styles.descriptionCloseText}>Fermer</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={showImageLightbox}
        animationType="none"
        onRequestClose={closeImageLightbox}
      >
        <Pressable style={styles.lightboxOverlay} onPress={closeImageLightbox} accessibilityRole="button">
          <Animated.View
            style={[
              styles.lightboxImageContainer,
              {
                opacity: lightboxOpacity,
                transform: [{ scale: lightboxScale }],
              },
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <ImageBackground
                source={{ uri: currentEvent?.illustration_url }}
                style={styles.lightboxImage}
                imageStyle={styles.lightboxImageStyle}
                resizeMode="contain"
              />
            </Pressable>
          </Animated.View>
          <Pressable style={styles.lightboxCloseButton} onPress={closeImageLightbox} accessibilityRole="button">
            <Text style={styles.lightboxCloseText}>✕</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const WIDTH = 340;
const LEVEL_UP_BONUS_HP = 150;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: '#0A0A0A',
  },
  topBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  compactStat: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  compactLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  compactValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  compactValueSmaller: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  compactSub: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },
  compactDelta: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  deltaPositive: {
    color: '#06B6D4',
  },
  deltaNegative: {
    color: '#EC4899',
  },
  slimBar: {
    height: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    marginTop: 6,
  },
  slimFill: {
    flex: 1,
    backgroundColor: '#8B5CF6',
  },
  slimFillVital: {
    flex: 1,
    backgroundColor: '#06B6D4',
  },
  timerContainer: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  timerBar: {
    flex: 1,
    height: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  timerFill: {
    flex: 1,
    backgroundColor: '#EC4899',
  },
  timerValue: {
    marginLeft: 12,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: colors.white,
  },
  errorText: {
    color: colors.white,
    textAlign: 'center',
    marginBottom: 12,
  },
  resultBanner: {
    marginTop: 8,
    marginBottom: 6,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  resultBannerTitle: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  resultDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 8,
  },
  resultDateLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  resultDateValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    textShadowColor: 'rgba(139, 92, 246, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  resultEventTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  resultDescriptionPreview: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  resultTapHint: {
    color: '#06B6D4',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 1,
  },
  countdownBox: {
    marginTop: 6,
    marginBottom: 6,
    padding: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    shadowColor: '#06B6D4',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    alignItems: 'center',
  },
  countdownBoxAutoAdvance: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.8,
  },
  countdownBoxButtonLarge: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 1)',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.7,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  countdownBoxButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 1.5,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  scrollContainer: {
    paddingBottom: 8,
  },
  cardContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 6,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  imageClickable: {
    width: '100%',
  },
  eventImage: {
    width: '100%',
    height: WIDTH * 0.7,
    justifyContent: 'flex-end',
  },
  eventImageStyle: {
    borderRadius: 24,
  },
  eventFallback: {
    backgroundColor: 'rgba(13, 26, 57, 0.85)',
    borderRadius: 16,
    padding: 18,
    justifyContent: 'center',
  },
  zoomIconContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  zoomIcon: {
    fontSize: 20,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  eventTextContainer: {
    padding: 12,
  },
  eventTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  inputCard: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 8,
    width: '94%',
    alignSelf: 'center',
    flex: 1,
  },
  inputDisplay: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  inputDisplayText: {
    color: '#FFFFFF',
    fontSize: 24,
    letterSpacing: 6,
    fontWeight: '800',
    textShadowColor: 'rgba(139, 92, 246, 0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  inputError: {
    borderWidth: 1,
    borderColor: colors.incorrectRed,
  },
  inputErrorText: {
    color: colors.incorrectRed,
    marginTop: 6,
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.darkText,
    fontWeight: '700',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  keypadContainer: {
    flex: 1,
    marginTop: 8,
    justifyContent: 'space-evenly',
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginVertical: 6,
    flex: 1,
  },
  keypadKey: {
    width: '28%',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  keypadKeyText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    textShadowColor: 'rgba(139, 92, 246, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  keypadDeleteKey: {
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
    borderColor: 'rgba(236, 72, 153, 0.3)',
    shadowColor: '#EC4899',
  },
  keypadDeleteText: {
    color: '#EC4899',
    fontSize: 28,
    fontWeight: '800',
  },
  keypadDisabled: {
    opacity: 0.3,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  keypadPressed: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    borderColor: 'rgba(139, 92, 246, 0.6)',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.8,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    transform: [{ scale: 0.96 }],
  },
  keypadSubmitKey: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderColor: 'rgba(6, 182, 212, 0.4)',
    shadowColor: '#06B6D4',
  },
  keypadSubmitText: {
    color: '#06B6D4',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  keypadPressable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    color: '#FFFFFF',
    fontSize: 56,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  resultCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(2, 8, 23, 0.95)',
    borderRadius: 20,
    padding: 24,
  },
  resultTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  resultDifference: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  resultDetail: {
    color: colors.white,
    textAlign: 'center',
    marginBottom: 4,
  },
  resultDescription: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: 10,
    textAlign: 'center',
    fontSize: 13,
  },
  levelUpText: {
    color: '#06B6D4',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.8,
  },
  secondaryButton: {
    marginTop: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  secondaryButtonText: {
    color: colors.white,
  },
  descriptionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  descriptionCard: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    backgroundColor: 'rgba(10, 10, 10, 0.98)',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 24,
  },
  descriptionTitle: {
    color: '#8B5CF6',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 32,
    textShadowColor: 'rgba(139, 92, 246, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  descriptionScroll: {
    maxHeight: 300,
    marginBottom: 20,
  },
  descriptionText: {
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 24,
    fontSize: 15,
    textAlign: 'justify',
  },
  descriptionButtons: {
    marginTop: 8,
    flexDirection: 'column',
    gap: 12,
  },
  descriptionNext: {
    alignSelf: 'stretch',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 1)',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.7,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  descriptionNextText: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
    fontSize: 16,
    textTransform: 'uppercase',
  },
  descriptionClose: {
    alignSelf: 'stretch',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  descriptionCloseText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
    fontSize: 14,
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImageContainer: {
    width: '90%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
    minWidth: 300,
    minHeight: 300,
  },
  lightboxImageStyle: {
    borderRadius: 12,
  },
  lightboxCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  lightboxCloseText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 28,
  },
});

export default PrecisionGameContent;
// FIX: keypad uses Pressable + see-more link fixed + countdown only after answer
