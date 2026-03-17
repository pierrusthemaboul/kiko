import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MyRankingData, RankingPlayer } from '@/hooks/useMyRanking';

const COLORS = {
  surface: '#FFFFFF',
  surfaceAlt: '#F8F9FA',
  gold: '#B8860B',
  goldSoft: 'rgba(184, 134, 11, 0.1)',
  accent: '#002B5B',
  accentSoft: 'rgba(0, 43, 91, 0.08)',
  textPrimary: '#1A1A1A',
  textMuted: '#707070',
  divider: '#EEEEEE',
};

type Period = 'daily' | 'weekly' | 'monthly' | 'allTime';

const PERIOD_LABELS: Record<Period, string> = {
  daily: "Aujourd'hui",
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

interface MyRankingCarouselProps {
  rankings: MyRankingData;
  loading?: boolean;
}

export default function MyRankingCarousel({
  rankings,
  loading = false,
}: MyRankingCarouselProps) {
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

  const currentData = rankings[currentPeriod] || [];
  const hasPlayers = currentData.length > 0;

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
            <Ionicons name="podium-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>Pas encore classé</Text>
            <Text style={styles.emptySubtext}>
              Jouez pour apparaître au classement !
            </Text>
          </View>
        ) : (
          currentData.map((player, index) => (
            <View
              key={`${currentPeriod}-${player.id}-${index}`}
              style={[
                styles.playerRow,
                player.isMe && styles.playerRowMe,
                index < currentData.length - 1 && styles.playerRowDivider,
              ]}
            >
              <View style={styles.rankContainer}>
                <Text style={[styles.rankNumber, player.isMe && styles.rankNumberMe]}>
                  #{player.rank}
                </Text>
              </View>

              <View style={styles.playerInfo}>
                <Text
                  style={[styles.playerName, player.isMe && styles.playerNameMe]}
                  numberOfLines={1}
                >
                  {player.isMe ? `${player.name} (moi)` : player.name}
                </Text>
                <Text style={styles.playerScore}>
                  {player.score.toLocaleString('fr-FR')} pts
                </Text>
              </View>

              {player.isMe && (
                <Ionicons name="person" size={18} color={COLORS.accent} />
              )}
            </View>
          ))
        )}
      </Animated.View>

      <View style={styles.dotsContainer}>
        {periods.map((period) => (
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
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  playerRowMe: {
    backgroundColor: COLORS.accentSoft,
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
  rankNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  rankNumberMe: {
    color: COLORS.accent,
    fontSize: 20,
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
  playerNameMe: {
    fontWeight: '700',
    color: COLORS.accent,
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
