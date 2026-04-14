import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import QuestCarousel from '@/components/QuestCarousel';
import DualLeaderboardCarousel from '@/components/DualLeaderboardCarousel';

interface Props {
  quests: any;
  questsLoading: boolean;
  profileId: string | undefined;
  rankIndex: number;
  leaderboards: any;
  leaderboardsLoading: boolean;
  myRankings: any;
  myRankingLoading: boolean;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// 0 = Full open, value > 0 = Closed (pushed down)
const CLOSED_OFFSET = SCREEN_HEIGHT * 0.7;

export function ProgressionDrawer({
  quests, questsLoading, profileId, rankIndex,
  leaderboards, leaderboardsLoading, myRankings, myRankingLoading
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [translateY] = useState(new Animated.Value(CLOSED_OFFSET));

  const toggleDrawer = () => {
    const toValue = isOpen ? CLOSED_OFFSET : 0;
    Animated.spring(translateY, {
      toValue,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
    setIsOpen(!isOpen);
  };

  return (
    <Animated.View style={[styles.drawerContainer, { transform: [{ translateY }] }]}>
      <TouchableOpacity style={styles.handleContainer} onPress={toggleDrawer} activeOpacity={0.8}>
        <View style={styles.handle} />
        <Text style={styles.handleText}>{isOpen ? "Fermer la progression" : "Voir votre progression"}</Text>
        <Ionicons name={isOpen ? "chevron-down" : "chevron-up"} size={20} color={COLORS.textMuted} />
      </TouchableOpacity>

      <ScrollView style={styles.drawerContent} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Quêtes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Objectifs de Progression</Text>
          </View>
          {questsLoading ? (
            <View style={styles.skeletonQuest} />
          ) : (
            <QuestCarousel
              dailyQuests={quests?.daily || []}
              weeklyQuests={quests?.weekly || []}
              monthlyQuests={quests?.monthly || []}
              userId={profileId}
              rankIndex={rankIndex}
              onRefresh={() => {}}
            />
          )}
        </View>

        {/* Classement */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Explorateurs</Text>
            <Text style={styles.sectionLink}>Voir tout</Text>
          </View>
          <DualLeaderboardCarousel
            classicLeaderboards={leaderboards?.classic || []}
            myRankings={myRankings}
            loading={leaderboardsLoading}
            myRankingLoading={myRankingLoading}
          />
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.82, // Prend 82% de l'écran une fois ouvert
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 20,
    zIndex: 20,
  },
  handleContainer: {
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: COLORS.divider,
    borderRadius: 3,
    marginBottom: 8,
  },
  handleText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  drawerContent: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionLink: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
  },
  skeletonQuest: {
    height: 100,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 18,
  },
});
