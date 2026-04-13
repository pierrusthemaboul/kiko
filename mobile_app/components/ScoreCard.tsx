import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { ShareData } from '../types/sharing';
import { colors, steampunkTheme } from '../constants/Colors';
import { getModeDisplayName, formatScore } from '../utils/generateScoreImage';
import { LinearGradient } from 'expo-linear-gradient';

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
      {/* Premium Gradient Background */}
      <LinearGradient
        colors={[steampunkTheme.mainBg, '#1a181e', steampunkTheme.mainBg]}
        style={styles.backgroundGradient}
      />

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
        <LinearGradient
          colors={['#FFD700', '#B8860B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.modeBadge}
        >
          <Text style={styles.modeText}>{getModeDisplayName(data.mode)}</Text>
        </LinearGradient>

        {/* Score/Streak display with Glow */}
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreLabel}>{mainLabel}</Text>
          <View style={styles.valueWrapper}>
             <Text style={styles.scoreValue}>{formatScore(mainValue)}</Text>
          </View>
        </View>

        {/* Additional stats in a Glass Panel */}
        {data.userStats && (
          <View style={styles.glassPanel}>
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
          <Text style={styles.ctaText}>PEUX-TU FAIRE MIEUX ?</Text>
          <View style={styles.footerBranding}>
             <Text style={styles.appName}>TIMALAUS</Text>
             <View style={styles.urlBadge}>
                <Text style={styles.urlText}>DISPO SUR IOS / ANDROID</Text>
             </View>
          </View>
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
    backgroundColor: steampunkTheme.mainBg,
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  logoContainer: {
    marginTop: 150,
    alignItems: 'center',
    zIndex: 10,
  },
  logo: {
    width: 280,
    height: 280,
    shadowColor: steampunkTheme.goldGlow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 80,
    justifyContent: 'center',
    zIndex: 10,
    marginTop: -100,
  },
  modeBadge: {
    alignSelf: 'center',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 40,
    marginBottom: 80,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    elevation: 10,
  },
  modeText: {
    color: '#000',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 100,
  },
  scoreLabel: {
    color: steampunkTheme.goldAccent,
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 8,
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  valueWrapper: {
    padding: 20,
  },
  scoreValue: {
    color: steampunkTheme.primaryText,
    fontSize: 240,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: steampunkTheme.goldGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 40,
  },
  glassPanel: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 32,
    paddingVertical: 50,
    borderWidth: 1,
    borderColor: 'rgba(200, 160, 74, 0.2)',
    marginBottom: 120,
    marginHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: steampunkTheme.goldAccent,
    fontSize: 64,
    fontWeight: '900',
    marginBottom: 4,
  },
  statLabel: {
    color: steampunkTheme.secondaryText,
    fontSize: 22,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  statDivider: {
    width: 2,
    height: 80,
    backgroundColor: 'rgba(200, 160, 74, 0.3)',
  },
  ctaContainer: {
    alignItems: 'center',
  },
  ctaText: {
    color: steampunkTheme.secondaryText,
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 40,
    textAlign: 'center',
    letterSpacing: 2,
  },
  footerBranding: {
    alignItems: 'center',
    width: '100%',
  },
  appName: {
    color: steampunkTheme.goldAccent,
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: 12,
    marginBottom: 20,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  urlBadge: {
    backgroundColor: 'rgba(224, 180, 87, 0.15)',
    paddingHorizontal: 30,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: steampunkTheme.goldBorderTransparent,
  },
  urlText: {
    color: steampunkTheme.goldAccent,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -300,
    right: -250,
    width: 800,
    height: 800,
    borderRadius: 400,
    backgroundColor: steampunkTheme.goldAccent,
    opacity: 0.03,
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -350,
    left: -300,
    width: 900,
    height: 900,
    borderRadius: 450,
    backgroundColor: steampunkTheme.goldAccent,
    opacity: 0.05,
  },
});
