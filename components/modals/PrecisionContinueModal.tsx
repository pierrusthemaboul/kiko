import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, StyleSheet, Animated, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { steampunkTheme } from '../../constants/Colors';

interface PrecisionContinueModalProps {
  isVisible: boolean;
  currentScore: number;
  onWatchAd: () => void;
  onDecline: () => void;
  adLoaded: boolean;
}

const PrecisionContinueModal: React.FC<PrecisionContinueModalProps> = ({
  isVisible,
  currentScore,
  onWatchAd,
  onDecline,
  adLoaded,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      scaleAnim.setValue(0);
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [isVisible, scaleAnim]);

  return (
    <Modal transparent visible={isVisible} animationType="none" statusBarTranslucent>
      <BlurView intensity={Platform.OS === 'ios' ? 20 : 0} tint="dark" style={styles.overlay}>
        <View style={styles.overlayDark} />
        <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient
            colors={[steampunkTheme.cardGradient.start, steampunkTheme.cardGradient.end]}
            style={styles.containerGradient}
          >
            {/* Header */}
            <View style={styles.header}>
              <Ionicons name="heart-half" size={56} color={steampunkTheme.goldAccent} />
              <Text style={styles.title}>Continue?</Text>
            </View>

            {/* Score actuel */}
            <View style={styles.scoreSection}>
              <Text style={styles.scoreLabel}>Score actuel</Text>
              <Text style={styles.scoreValue}>{currentScore.toLocaleString()}</Text>
            </View>

            {/* Message */}
            <View style={styles.messageSection}>
              <Text style={styles.message}>
                Vos HP sont épuisés ! Regardez une publicité pour récupérer 500 HP et continuer votre partie.
              </Text>
              <View style={styles.rewardBox}>
                <Ionicons name="gift" size={24} color={steampunkTheme.goldAccent} />
                <Text style={styles.rewardText}>+500 HP</Text>
              </View>
            </View>

            {/* Boutons */}
            <View style={styles.buttonsContainer}>
              <Pressable
                style={[styles.button, styles.watchButton, !adLoaded && styles.buttonDisabled]}
                onPress={onWatchAd}
                disabled={!adLoaded}
              >
                <LinearGradient
                  colors={adLoaded ? ['#D4AF37', '#C9A831'] : ['#666', '#555']}
                  style={styles.buttonGradient}
                >
                  <Ionicons name="play-circle" size={24} color="#0a0a0a" />
                  <Text style={styles.watchButtonText}>
                    {adLoaded ? 'Regarder la publicité' : 'Chargement...'}
                  </Text>
                </LinearGradient>
              </Pressable>

              <Pressable style={[styles.button, styles.declineButton]} onPress={onDecline}>
                <Text style={styles.declineButtonText}>Abandonner</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </Animated.View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayDark: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  container: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: steampunkTheme.goldAccent,
  },
  containerGradient: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: steampunkTheme.goldAccent,
    marginTop: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(212, 175, 55, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  scoreSection: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  scoreLabel: {
    fontSize: 14,
    color: steampunkTheme.textMuted,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: steampunkTheme.goldAccent,
  },
  messageSection: {
    marginBottom: 24,
  },
  message: {
    fontSize: 16,
    color: steampunkTheme.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  rewardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderRadius: 10,
    gap: 8,
  },
  rewardText: {
    fontSize: 18,
    fontWeight: '600',
    color: steampunkTheme.goldAccent,
  },
  buttonsContainer: {
    gap: 12,
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  watchButton: {
    shadowColor: steampunkTheme.goldAccent,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  watchButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a0a0a',
  },
  declineButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: steampunkTheme.textMuted,
    paddingVertical: 14,
    alignItems: 'center',
  },
  declineButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: steampunkTheme.textMuted,
  },
});

export default PrecisionContinueModal;
