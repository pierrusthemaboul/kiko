import React, { useEffect, useRef } from 'react';
import { View, Text, Modal, StyleSheet, Animated, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { steampunkTheme } from '../../constants/Colors';

interface PrecisionLevelCompleteModalProps {
  isVisible: boolean;
  completedLevel: number;
  completedLevelLabel: string;
  newLevel: number;
  newLevelLabel: string;
  currentScore: number;
  hpRestored: number;
  newHpCap: number;
  onContinue: () => void;
}

const PrecisionLevelCompleteModal: React.FC<PrecisionLevelCompleteModalProps> = ({
  isVisible,
  completedLevel,
  completedLevelLabel,
  newLevel,
  newLevelLabel,
  currentScore,
  hpRestored,
  newHpCap,
  onContinue,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      scaleAnim.setValue(0);
      glowAnim.setValue(0);
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      glowAnim.setValue(0);
    }
  }, [isVisible, scaleAnim, glowAnim]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <Modal transparent visible={isVisible} animationType="none" statusBarTranslucent>
      <BlurView intensity={Platform.OS === 'ios' ? 20 : 0} tint="dark" style={styles.overlay}>
        <View style={styles.overlayDark} />
        <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient
            colors={[steampunkTheme.cardGradient.start, steampunkTheme.cardGradient.end]}
            style={styles.containerGradient}
          >
            {/* Header avec icône de succès */}
            <View style={styles.header}>
              <Animated.View style={[styles.iconGlow, { opacity: glowOpacity }]} />
              <LinearGradient
                colors={['#4CAF50', '#45a049']}
                style={styles.successIcon}
              >
                <Ionicons name="trophy" size={56} color="#FFD700" />
              </LinearGradient>
              <Text style={styles.title}>Niveau Terminé !</Text>
              <Text style={styles.congratsText}>Félicitations !</Text>
            </View>

            {/* Niveau complété */}
            <View style={styles.levelSection}>
              <Text style={styles.sectionLabel}>Niveau Accompli</Text>
              <LinearGradient
                colors={[steampunkTheme.goldGradient.start, steampunkTheme.goldGradient.end]}
                style={styles.levelBadge}
              >
                <Text style={styles.levelNumber}>{completedLevel}</Text>
                <Text style={styles.levelLabel}>{completedLevelLabel}</Text>
              </LinearGradient>
            </View>

            {/* Statistiques */}
            <View style={styles.statsContainer}>
              <View style={styles.statRow}>
                <Ionicons name="star" size={24} color={steampunkTheme.goldAccent} />
                <Text style={styles.statLabel}>Score Actuel</Text>
                <Text style={styles.statValue}>{currentScore.toLocaleString()}</Text>
              </View>
              <View style={styles.statRow}>
                <Ionicons name="heart" size={24} color="#4CAF50" />
                <Text style={styles.statLabel}>Vitalité Restaurée</Text>
                <Text style={[styles.statValue, styles.hpValue]}>+{hpRestored} HP</Text>
              </View>
              <View style={styles.statRow}>
                <Ionicons name="flash" size={24} color={steampunkTheme.goldAccent} />
                <Text style={styles.statLabel}>Vitalité Max</Text>
                <Text style={styles.statValue}>{newHpCap} HP</Text>
              </View>
            </View>

            {/* Prochain niveau */}
            <View style={styles.nextLevelSection}>
              <View style={styles.arrowContainer}>
                <Ionicons name="arrow-down" size={32} color={steampunkTheme.goldAccent} />
              </View>
              <Text style={styles.nextLevelText}>Niveau Suivant</Text>
              <LinearGradient
                colors={['#E0B457', '#8C6B2B']}
                style={styles.nextLevelBadge}
              >
                <Text style={styles.nextLevelNumber}>{newLevel}</Text>
                <Text style={styles.nextLevelLabel}>{newLevelLabel}</Text>
              </LinearGradient>
            </View>

            {/* Bouton Continuer */}
            <Pressable
              onPress={onContinue}
              style={({ pressed }) => [
                styles.continueButton,
                { opacity: pressed ? 0.8 : 1 }
              ]}
            >
              <LinearGradient
                colors={['#4CAF50', '#45a049']}
                style={styles.continueButtonGradient}
              >
                <Text style={styles.continueButtonText}>Continuer</Text>
                <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>
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
    width: '90%',
    maxWidth: 450,
    borderRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#E0B457',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  containerGradient: {
    padding: 24,
    borderWidth: 2,
    borderColor: 'rgba(224, 180, 87, 0.4)',
    borderRadius: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFD700',
    top: 0,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: steampunkTheme.primaryText,
    textAlign: 'center',
    marginBottom: 8,
  },
  congratsText: {
    fontSize: 16,
    color: steampunkTheme.goldAccent,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  levelSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    color: steampunkTheme.secondaryText,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  levelBadge: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 200,
    borderWidth: 2,
    borderColor: 'rgba(224, 180, 87, 0.3)',
  },
  levelNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: steampunkTheme.mainBg,
    marginBottom: 4,
  },
  levelLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: steampunkTheme.mainBg,
  },
  statsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statLabel: {
    flex: 1,
    fontSize: 15,
    color: steampunkTheme.secondaryText,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: steampunkTheme.primaryText,
  },
  hpValue: {
    color: '#4CAF50',
  },
  nextLevelSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  arrowContainer: {
    marginBottom: 8,
  },
  nextLevelText: {
    fontSize: 14,
    color: steampunkTheme.secondaryText,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  nextLevelBadge: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 180,
    borderWidth: 2,
    borderColor: 'rgba(224, 180, 87, 0.5)',
  },
  nextLevelNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  nextLevelLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  continueButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  continueButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default PrecisionLevelCompleteModal;
