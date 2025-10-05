import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

const { width: screenWidth } = Dimensions.get('window');

type Period = 'daily' | 'weekly' | 'monthly' | 'allTime';

const PERIOD_LABELS: Record<Period, string> = {
  daily: 'Aujourd\'hui',
  weekly: 'Cette semaine',
  monthly: 'Ce mois',
  allTime: 'Tous les temps',
};

const PERIOD_ICONS: Record<Period, any> = {
  daily: 'today-outline',
  weekly: 'calendar-outline',
  monthly: 'calendar-number-outline',
  allTime: 'trophy-outline',
};

interface LeaderboardCarouselProps {
  leaderboards: LeaderboardData;
  loading?: boolean;
}

export default function LeaderboardCarousel({
  leaderboards,
  loading = false,
}: LeaderboardCarouselProps) {
  const [currentPeriod, setCurrentPeriod] = useState<Period>('daily');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const periods: Period[] = ['daily', 'weekly', 'monthly', 'allTime'];
  const currentIndex = periods.indexOf(currentPeriod);

  const changePeriod = (direction: 'next' | 'prev') => {
    const nextIndex =
      direction === 'next'
        ? (currentIndex + 1) % periods.length
        : (currentIndex - 1 + periods.length) % periods.length;

    const nextPeriod = periods[nextIndex];

    // Animation de slide + fade
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: direction === 'next' ? -50 : 50,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentPeriod(nextPeriod);
      slideAnim.setValue(direction === 'next' ? 50 : -50);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const currentData = leaderboards[currentPeriod] || [];
  const hasPlayers = currentData.length > 0;

  // Emojis pour les rangs
  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '🏅';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => changePeriod('prev')}
          style={styles.navButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.gold} />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Ionicons
            name={PERIOD_ICONS[currentPeriod]}
            size={20}
            color={COLORS.gold}
            style={styles.titleIcon}
          />
          <Text style={styles.title}>{PERIOD_LABELS[currentPeriod]}</Text>
        </View>

        <TouchableOpacity
          onPress={() => changePeriod('next')}
          style={styles.navButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-forward" size={24} color={COLORS.gold} />
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {loading ? (
          <Text style={styles.emptyText}>Chargement...</Text>
        ) : !hasPlayers ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Pas encore de classement</Text>
            <Text style={styles.emptySubtext}>
              Soyez le premier à jouer !
            </Text>
          </View>
        ) : (
          currentData.slice(0, 5).map((player, index) => (
            <View
              key={`${currentPeriod}-${player.id}-${index}`}
              style={[
                styles.playerRow,
                index < currentData.length - 1 && styles.playerRowDivider,
              ]}
            >
              <View style={styles.rankContainer}>
                <Text style={styles.rankEmoji}>{getRankEmoji(player.rank)}</Text>
                <Text style={styles.rankText}>{player.rank}</Text>
              </View>

              <View style={styles.playerInfo}>
                <Text style={styles.playerName} numberOfLines={1}>
                  {player.name}
                </Text>
                <Text style={styles.playerScore}>
                  {player.score.toLocaleString('fr-FR')} pts
                </Text>
              </View>

              {player.rank <= 3 && (
                <Ionicons name="star" size={18} color={COLORS.gold} />
              )}
            </View>
          ))
        )}
      </Animated.View>

      <View style={styles.dotsContainer}>
        {periods.map((period, index) => (
          <View
            key={period}
            style={[
              styles.dot,
              currentPeriod === period && styles.dotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    shadowColor: COLORS.gold,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    padding: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleIcon: {
    marginRight: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gold,
    letterSpacing: 0.4,
  },
  content: {
    minHeight: 200,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
    opacity: 0.7,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  playerRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  rankContainer: {
    width: 50,
    alignItems: 'center',
    marginRight: 12,
  },
  rankEmoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  rankText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  playerInfo: {
    flex: 1,
    marginRight: 12,
  },
  playerName: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '500',
    marginBottom: 2,
  },
  playerScore: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.divider,
  },
  dotActive: {
    backgroundColor: COLORS.gold,
    width: 20,
  },
});
