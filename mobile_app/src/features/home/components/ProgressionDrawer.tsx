import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import QuestCarousel from '@/components/QuestCarousel';
import DualLeaderboardCarousel from '@/components/DualLeaderboardCarousel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

export function ProgressionDrawer({
  quests, questsLoading, profileId, rankIndex,
  leaderboards, leaderboardsLoading, myRankings, myRankingLoading
}: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const drawerHeight = useMemo(() => Math.round(height * 0.82), [height]);
  const closedOffset = useMemo(() => Math.round(height * 0.7), [height]);

  const [isOpen, setIsOpen] = useState(false);
  const translateY = useRef(new Animated.Value(closedOffset)).current;

  useEffect(() => {
    translateY.setValue(isOpen ? 0 : closedOffset);
  }, [closedOffset, isOpen, translateY]);

  const toggleDrawer = () => {
    const toValue = isOpen ? closedOffset : 0;
    Animated.spring(translateY, {
      toValue,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
    setIsOpen(!isOpen);
  };

  return (
    <Animated.View style={[styles.drawerContainer, { height: drawerHeight, transform: [{ translateY }] }]}>
      <TouchableOpacity style={styles.handleContainer} onPress={toggleDrawer} activeOpacity={0.8}>
        <View style={styles.handle} />
        <Text style={styles.handleText}>{isOpen ? "Fermer la progression" : "Voir votre progression"}</Text>
        <Ionicons name={isOpen ? "chevron-down" : "chevron-up"} size={20} color={COLORS.textMuted} />
      </TouchableOpacity>

      <ScrollView
        style={styles.drawerContent}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 36 }]}
        showsVerticalScrollIndicator={false}
      >
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
