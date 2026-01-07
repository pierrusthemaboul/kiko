import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions, Easing, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { QuestWithProgress } from '@/lib/economy/quests';
import { getQuestProgressPercentage } from '@/lib/economy/quests';
import { claimQuestReward, rerollQuest } from '@/lib/economy/apply';
import { FirebaseAnalytics } from '@/lib/firebase';

const COLORS = {
  background: '#050505',
  surface: '#111111',
  surfaceAlt: '#181818',
  gold: '#d4af37',
  goldSoft: 'rgba(212, 175, 55, 0.2)',
  textPrimary: '#f5f1d6',
  textMuted: '#b5b1a0',
  divider: '#2a2a2a',
  green: '#4ade80',
  blue: '#60a5fa',
  purple: '#a78bfa',
};

const { width: screenWidth } = Dimensions.get('window');

interface QuestCarouselProps {
  dailyQuests: QuestWithProgress[];
  weeklyQuests: QuestWithProgress[];
  monthlyQuests: QuestWithProgress[];
  userId?: string;
  rankIndex?: number;
  onRefresh?: () => void;
}

type QuestType = 'daily' | 'weekly' | 'monthly';

const QUEST_CONFIGS = {
  daily: {
    title: 'Quêtes du Jour',
    icon: 'today' as const,
    color: COLORS.green,
    gradient: 'rgba(74, 222, 128, 0.15)',
  },
  weekly: {
    title: 'Quêtes de la Semaine',
    icon: 'calendar' as const,
    color: COLORS.blue,
    gradient: 'rgba(96, 165, 250, 0.15)',
  },
  monthly: {
    title: 'Quêtes du Mois',
    icon: 'calendar-outline' as const,
    color: COLORS.purple,
    gradient: 'rgba(167, 139, 250, 0.15)',
  },
};

export default function QuestCarousel({
  dailyQuests,
  weeklyQuests,
  monthlyQuests,
  userId,
  rankIndex = 0,
  onRefresh,
}: QuestCarouselProps) {
  const [currentType, setCurrentType] = useState<QuestType>('daily');
  const [loadingQuestId, setLoadingQuestId] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Animation de brillance répétitive
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Auto-rotation toutes les 12 secondes (ralenti pour laisser le temps de lire/cliquer)
  useEffect(() => {
    const interval = setInterval(() => {
      rotateToNext();
    }, 12000);

    return () => clearInterval(interval);
  }, [currentType]);

  const rotateToNext = () => {
    const types: QuestType[] = ['daily', 'weekly', 'monthly'];
    const currentIndex = types.indexOf(currentType);
    const nextIndex = (currentIndex + 1) % types.length;

    transitionTo(types[nextIndex]);
  };

  const rotateToPrevious = () => {
    const types: QuestType[] = ['daily', 'weekly', 'monthly'];
    const currentIndex = types.indexOf(currentType);
    const prevIndex = (currentIndex - 1 + types.length) % types.length;

    transitionTo(types[prevIndex]);
  };

  const transitionTo = (newType: QuestType) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentType(newType);
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleClaim = async (questKey: string, id: string) => {
    if (!userId) return;
    setLoadingQuestId(id);

    try {
      const result = await claimQuestReward(userId, questKey);
      if (result.success) {
        FirebaseAnalytics.trackEvent('quest_claimed', {
          quest_key: questKey,
          xp_reward: result.xpEarned,
          parts_reward: result.partsEarned,
          quest_type: currentType
        });
        if (onRefresh) onRefresh();
      } else {
        Alert.alert('Erreur', result.error || 'Impossible de réclamer la récompense');
      }
    } catch (err) {
      console.error('Claim error:', err);
    } finally {
      setLoadingQuestId(null);
    }
  };

  const handleReroll = async (questKey: string, id: string) => {
    if (!userId) return;

    Alert.alert(
      'Changer de quête ?',
      'Tu peux changer une quête par jour gratuitement.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Changer',
          onPress: async () => {
            setLoadingQuestId(id);
            try {
              const result = await rerollQuest(userId, questKey, rankIndex);
              if (result.success) {
                FirebaseAnalytics.trackEvent('quest_rerolled', {
                  old_quest_key: questKey,
                  new_quest_key: result.newQuest.quest_key,
                  difficulty_tier: result.newQuest.difficulty
                });
                if (onRefresh) onRefresh();
              } else {
                Alert.alert('Quota atteint', result.error || 'Impossible de changer la quête');
              }
            } catch (err) {
              console.error('Reroll error:', err);
            } finally {
              setLoadingQuestId(null);
            }
          }
        }
      ]
    );
  };

  const getCurrentQuests = (): QuestWithProgress[] => {
    switch (currentType) {
      case 'daily': return dailyQuests || [];
      case 'weekly': return weeklyQuests || [];
      case 'monthly': return monthlyQuests || [];
      default: return [];
    }
  };

  const currentQuests = getCurrentQuests();
  const config = QUEST_CONFIGS[currentType];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={rotateToPrevious} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.gold} />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Ionicons name={config.icon} size={24} color={config.color} style={styles.titleIcon} />
          <Text style={[styles.title, { color: config.color }]}>{config.title}</Text>
        </View>

        <TouchableOpacity onPress={rotateToNext} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color={COLORS.gold} />
        </TouchableOpacity>
      </View>

      <View style={styles.indicators}>
        {(['daily', 'weekly', 'monthly'] as QuestType[]).map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => transitionTo(type)}
            style={[styles.indicator, currentType === type ? styles.indicatorActive : null]}
          />
        ))}
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            backgroundColor: config.gradient,
          },
        ]}
      >
        {!currentQuests || currentQuests.length === 0 ? (
          <Text style={styles.emptyText}>Aucune quête disponible</Text>
        ) : (
          currentQuests.map((quest, index) => {
            const progress = quest.progress;
            const currentValue = progress?.current_value ?? 0;
            const isCompleted = progress?.completed ?? false;
            const isClaimed = (progress as any)?.claimed ?? false;
            const progressPercent = getQuestProgressPercentage(currentValue, quest.target_value);
            const isDaily = currentType === 'daily';

            return (
              <View key={quest.id} style={[styles.questRow, index < currentQuests.length - 1 ? styles.questDivider : null]}>
                <View style={styles.questContent}>
                  <View style={styles.questHeaderRow}>
                    <Text style={[styles.questTitle, isClaimed ? styles.questTitleDone : null]}>
                      {quest.title || 'Sans titre'}
                    </Text>
                    {isDaily && !isCompleted && !isClaimed && userId && (
                      <TouchableOpacity
                        onPress={() => handleReroll(quest.quest_key, quest.id)}
                        style={styles.rerollButton}
                      >
                        <Ionicons name="refresh-circle" size={20} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.questDescription}>{quest.description || 'Pas de description'}</Text>

                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: config.color }]} />
                  </View>

                  <View style={styles.rewardsRow}>
                    <View style={styles.reward}>
                      <Ionicons name="star" size={14} color={COLORS.gold} />
                      <Text style={styles.rewardText}>{quest.xp_reward ?? 0} XP</Text>
                    </View>
                    {quest.parts_reward && quest.parts_reward > 0 ? (
                      <View style={styles.reward}>
                        <Ionicons name="game-controller" size={14} color={COLORS.green} />
                        <Text style={styles.rewardText}>+{quest.parts_reward}</Text>
                      </View>
                    ) : null}
                    <Text style={styles.progressText}>
                      {currentValue} / {quest.target_value ?? 0}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionContainer}>
                  {isClaimed ? (
                    <Ionicons name="checkmark-done-circle" size={32} color={COLORS.textMuted} style={styles.checkIcon} />
                  ) : isCompleted ? (
                    <TouchableOpacity
                      onPress={() => handleClaim(quest.quest_key, quest.id)}
                      disabled={loadingQuestId === quest.id}
                      style={styles.claimButtonContainer}
                    >
                      <Animated.View style={[
                        styles.claimButton,
                        { borderColor: config.color, backgroundColor: config.color + '20' },
                        { transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }] }
                      ]}>
                        {loadingQuestId === quest.id ? (
                          <ActivityIndicator size="small" color={config.color} />
                        ) : (
                          <Text style={[styles.claimText, { color: config.color }]}>LOT</Text>
                        )}
                      </Animated.View>
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="ellipse-outline" size={24} color={COLORS.divider} style={styles.checkIcon} />
                  )}
                </View>
              </View>
            );
          })
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  indicator: {
    width: 24,
    height: 4,
    backgroundColor: COLORS.divider,
    borderRadius: 2,
  },
  indicatorActive: {
    backgroundColor: COLORS.gold,
  },
  content: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    minHeight: 200,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 40,
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  questDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  questContent: {
    flex: 1,
  },
  questHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  questTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  questTitleDone: {
    opacity: 0.6,
    textDecorationLine: 'line-through',
  },
  questDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  rewardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 'auto',
  },
  actionContainer: {
    marginLeft: 12,
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    opacity: 0.8,
  },
  claimButtonContainer: {
    alignItems: 'center',
  },
  claimButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 2,
    minWidth: 44,
    alignItems: 'center',
  },
  claimText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  rerollButton: {
    padding: 2,
  },
});
