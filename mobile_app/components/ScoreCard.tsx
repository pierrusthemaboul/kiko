import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { ShareData } from '../types/sharing';
import { colors } from '../constants/Colors';
import { getModeDisplayName, formatScore } from '../utils/generateScoreImage';

interface ScoreCardProps {
  data: ShareData;
}

/**
 * Score card component designed for sharing on social media
 * This component will be captured as an image using react-native-view-shot
 */
export const ScoreCard = React.forwardRef<View, ScoreCardProps>(({ data }, ref) => {
  const isClassique = data.mode === 'classique';
  const mainValue = isClassique ? data.streak || 0 : data.score;
  const mainLabel = isClassique ? 'STREAK' : 'SCORE';

  return (
    <View ref={ref} style={styles.container}>
      {/* Background gradient effect */}
      <View style={styles.backgroundGradient} />

      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Main content */}
      <View style={styles.content}>
        {/* Game mode badge */}
        <View style={styles.modeBadge}>
          <Text style={styles.modeText}>{getModeDisplayName(data.mode)}</Text>
        </View>

        {/* Score/Streak display */}
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>{mainLabel}</Text>
          <Text style={styles.scoreValue}>{formatScore(mainValue)}</Text>
        </View>

        {/* Additional stats */}
        {data.userStats && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{data.userStats.totalGames}</Text>
              <Text style={styles.statLabel}>Parties</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatScore(data.userStats.bestScore)}</Text>
              <Text style={styles.statLabel}>Meilleur</Text>
            </View>
          </View>
        )}

        {/* Call to action */}
        <View style={styles.ctaContainer}>
          <Text style={styles.ctaText}>Peux-tu faire mieux ?</Text>
          <Text style={styles.appName}>TIMALAUS</Text>
        </View>
      </View>

      {/* Decorative elements */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: 1080,
    height: 1920,
    backgroundColor: colors.background.dark,
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background.dark,
    opacity: 0.95,
  },
  logoContainer: {
    marginTop: 120,
    alignItems: 'center',
    zIndex: 10,
  },
  logo: {
    width: 180,
    height: 180,
  },
  content: {
    flex: 1,
    paddingHorizontal: 80,
    justifyContent: 'center',
    zIndex: 10,
  },
  modeBadge: {
    alignSelf: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 60,
  },
  modeText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 1,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  scoreLabel: {
    color: colors.accent,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 16,
  },
  scoreValue: {
    color: colors.white,
    fontSize: 140,
    fontWeight: '900',
    textShadowColor: colors.primary,
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 100,
    paddingVertical: 40,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.transparencies.light,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: colors.white,
    fontSize: 48,
    fontWeight: '800',
    marginBottom: 8,
  },
  statLabel: {
    color: colors.lightText,
    fontSize: 20,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statDivider: {
    width: 2,
    height: 60,
    backgroundColor: colors.transparencies.light,
  },
  ctaContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  ctaText: {
    color: colors.white,
    fontSize: 32,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  appName: {
    color: colors.accent,
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowColor: colors.primary,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -200,
    right: -200,
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: colors.primary,
    opacity: 0.1,
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -250,
    left: -250,
    width: 700,
    height: 700,
    borderRadius: 350,
    backgroundColor: colors.accent,
    opacity: 0.08,
  },
});
