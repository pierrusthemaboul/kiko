import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LeaderboardCarousel from './LeaderboardCarousel';
import MyRankingCarousel from './MyRankingCarousel';
import { LeaderboardData } from '@/hooks/useLeaderboards';
import { MyRankingData } from '@/hooks/useMyRanking';

const COLORS = {
  surface: '#FFFFFF',
  surfaceAlt: '#F8F9FA',
  gold: '#D4AF37',
  goldSoft: 'rgba(212, 175, 55, 0.1)',
  accent: '#002B5B',
  textPrimary: '#212529',
  textMuted: '#6C757D',
  divider: '#EDECEC',
};

interface DualLeaderboardCarouselProps {
  classicLeaderboards: LeaderboardData;
  myRankings: MyRankingData;
  loading?: boolean;
  myRankingLoading?: boolean;
}

export default function DualLeaderboardCarousel({
  classicLeaderboards,
  myRankings,
  loading = false,
  myRankingLoading = false,
}: DualLeaderboardCarouselProps) {
  return (
    <View style={styles.container}>
      {/* Top Explorateurs */}
      <View style={styles.leaderboardSection}>
        <View style={styles.modeHeader}>
          <Ionicons name="flash-outline" size={20} color={COLORS.gold} />
          <Text style={styles.modeTitle}>Top Explorateurs</Text>
        </View>
        <LeaderboardCarousel leaderboards={classicLeaderboards} loading={loading} />
      </View>

      {/* Séparateur */}
      <View style={styles.divider} />

      {/* Mon Classement */}
      <View style={styles.leaderboardSection}>
        <View style={styles.modeHeader}>
          <Ionicons name="person-outline" size={20} color={COLORS.accent} />
          <Text style={[styles.modeTitle, { color: COLORS.accent }]}>Mon Classement</Text>
        </View>
        <MyRankingCarousel rankings={myRankings} loading={myRankingLoading} />
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
