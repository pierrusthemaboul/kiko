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

  useEffect(() => {
    if (isVisible) {
      scaleAnim.setValue(0);
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7
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
            {/* Header simplifié sans icône */}
            <View style={styles.header}>
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
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(224, 180, 87, 0.4)',
    borderRadius: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: steampunkTheme.primaryText,
    textAlign: 'center',
    marginBottom: 6,
  },
  congratsText: {
    fontSize: 14,
    color: steampunkTheme.goldAccent,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  levelSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    color: steampunkTheme.secondaryText,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  levelBadge: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    minWidth: 160,
    borderWidth: 2,
    borderColor: 'rgba(224, 180, 87, 0.3)',
  },
  levelNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: steampunkTheme.mainBg,
    marginBottom: 2,
  },
  levelLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: steampunkTheme.mainBg,
  },
  statsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statLabel: {
    flex: 1,
    fontSize: 14,
    color: steampunkTheme.secondaryText,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: steampunkTheme.primaryText,
  },
  hpValue: {
    color: '#4CAF50',
  },
  nextLevelSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  arrowContainer: {
    marginBottom: 6,
  },
  nextLevelText: {
    fontSize: 12,
    color: steampunkTheme.secondaryText,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  nextLevelBadge: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    minWidth: 140,
    borderWidth: 2,
    borderColor: 'rgba(224, 180, 87, 0.5)',
  },
  nextLevelNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  nextLevelLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  continueButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  continueButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default PrecisionLevelCompleteModal;
