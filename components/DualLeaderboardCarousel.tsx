import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LeaderboardCarousel from './LeaderboardCarousel';
import { LeaderboardData } from '@/hooks/useLeaderboards';

const COLORS = {
  surface: '#111111',
  surfaceAlt: '#181818',
  gold: '#d4af37',
  goldSoft: 'rgba(212, 175, 55, 0.2)',
  textPrimary: '#f5f1d6',
  textMuted: '#b5b1a0',
  divider: '#2a2a2a',
};

interface DualLeaderboardCarouselProps {
  classicLeaderboards: LeaderboardData;
  precisionLeaderboards: LeaderboardData;
  loading?: boolean;
}

export default function DualLeaderboardCarousel({
  classicLeaderboards,
  precisionLeaderboards,
  loading = false,
}: DualLeaderboardCarouselProps) {
  return (
    <View style={styles.container}>
      {/* Mode Classique */}
      <View style={styles.leaderboardSection}>
        <View style={styles.modeHeader}>
          <Ionicons name="flash-outline" size={20} color={COLORS.gold} />
          <Text style={styles.modeTitle}>Mode Classique</Text>
        </View>
        <LeaderboardCarousel leaderboards={classicLeaderboards} loading={loading} />
      </View>

      {/* Séparateur */}
      <View style={styles.divider} />

      {/* Mode Précision */}
      <View style={styles.leaderboardSection}>
        <View style={styles.modeHeader}>
          <Ionicons name="analytics-outline" size={20} color={COLORS.gold} />
          <Text style={styles.modeTitle}>Mode Précision</Text>
        </View>
        <LeaderboardCarousel leaderboards={precisionLeaderboards} loading={loading} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  leaderboardSection: {
    gap: 12,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gold,
    letterSpacing: 0.4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 8,
  },
});
