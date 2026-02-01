import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions, Easing, ActivityIndicator, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { QuestWithProgress } from '@/lib/economy/quests';
import { getQuestProgressPercentage } from '@/lib/economy/quests';
import { claimQuestReward, rerollQuest } from '@/lib/economy/apply';
import { FirebaseAnalytics } from '@/lib/firebase';

const COLORS = {
  background: '#FAF7F2',
  surface: '#FFFFFF',
  surfaceAlt: '#F2EDE4',
  primary: '#002B5B',
  accent: '#A67C1F',
  accentSoft: 'rgba(166, 124, 31, 0.1)',
  textPrimary: '#1C1C1C',
  textMuted: '#7A7267',
  divider: '#EDECEC',
  gold: '#D4AF37',
  goldSoft: 'rgba(212, 175, 55, 0.1)',
  green: '#2D6a4f', // Vert émeraude sombre (élégant)
  blue: '#1d3557',  // Bleu profond
  purple: '#4a306d', // Violet noble
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
    icon: 'hourglass-outline' as const,
    color: COLORS.accent,
    gradient: 'rgba(166, 124, 31, 0.05)',
  },
  weekly: {
    title: 'Défis Hebdomadaires',
    icon: 'trophy-outline' as const,
    color: COLORS.primary,
    gradient: 'rgba(0, 43, 91, 0.05)',
  },
  monthly: {
    title: 'Grandes Étapes',
    icon: 'map-outline' as const,
    color: COLORS.purple,
    gradient: 'rgba(74, 48, 109, 0.05)',
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
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animation de pulsation pour le bouton de récompense
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const transitionTo = (newType: QuestType) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setCurrentType(newType);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleClaim = async (questKey: string, id: string) => {
    if (!userId) return;
    setLoadingQuestId(id);
    try {
      const result = await claimQuestReward(userId, questKey);
      if (result.success) {
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

  const hasPendingRewards = (type: QuestType): boolean => {
    const list = type === 'daily' ? dailyQuests : type === 'weekly' ? weeklyQuests : monthlyQuests;
    return (list || []).some(q => q.progress?.completed && !(q.progress as any)?.claimed);
  };

  const getCurrentQuests = (): QuestWithProgress[] => {
    const quests = currentType === 'daily' ? dailyQuests : currentType === 'weekly' ? weeklyQuests : monthlyQuests;
    const list = quests || [];

    // Trier : Terminé mais pas récupéré en premier, puis en cours, puis récupéré en dernier
    return [...list].sort((a, b) => {
      const aDone = a.progress?.completed && !(a.progress as any)?.claimed;
      const bDone = b.progress?.completed && !(b.progress as any)?.claimed;
      if (aDone && !bDone) return -1;
      if (!aDone && bDone) return 1;

      const aClaimed = (a.progress as any)?.claimed;
      const bClaimed = (b.progress as any)?.claimed;
      if (!aClaimed && bClaimed) return -1;
      if (aClaimed && !bClaimed) return 1;

      return 0;
    });
  };

  const currentQuests = getCurrentQuests();
  const config = QUEST_CONFIGS[currentType];

  return (
    <View style={styles.container}>
      {/* Sélecteur de Type (Haut) */}
      <View style={styles.typeSelector}>
        {(['daily', 'weekly', 'monthly'] as QuestType[]).map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => transitionTo(type)}
            style={[
              styles.typeButton,
              currentType === type && { backgroundColor: COLORS.surface, borderColor: COLORS.accent }
            ]}
          >
            <Text style={[
              styles.typeButtonText,
              currentType === type && { color: COLORS.accent, fontWeight: '800' }
            ]}>
              {type === 'daily' ? 'JOUR' : type === 'weekly' ? 'SEMAINE' : 'MOIS'}
            </Text>
            {hasPendingRewards(type) && (
              <View style={[styles.notificationBadge, { backgroundColor: type === 'daily' ? COLORS.accent : type === 'weekly' ? COLORS.primary : COLORS.purple }]}>
                <Text style={styles.notificationBadgeText}>!</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={screenWidth * 0.8 + 16} // Largeur carte + gap
        snapToAlignment="start"
        contentContainerStyle={styles.scrollContent}
        style={{ opacity: fadeAnim }}
      >
        {currentQuests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Exploration terminée pour cette période.</Text>
          </View>
        ) : (
          currentQuests.map((quest) => {
            const progress = quest.progress;
            const currentValue = progress?.current_value ?? 0;
            const isCompleted = progress?.completed ?? false;
            const isClaimed = (progress as any)?.claimed ?? false;
            const progressPercent = getQuestProgressPercentage(currentValue, quest.target_value);

            return (
              <View
                key={quest.id}
                style={[
                  styles.questCard,
                  isCompleted && !isClaimed && styles.questCardReady
                ]}
              >
                {isCompleted && !isClaimed && (
                  <View style={styles.rewardRibbon}>
                    <Text style={styles.rewardRibbonText}>RÉCOMPENSE PRÊTE !</Text>
                  </View>
                )}

                <View style={styles.cardHeader}>
                  <View style={[styles.iconBox, isCompleted && !isClaimed && { backgroundColor: COLORS.goldSoft }]}>
                    <Ionicons name={isCompleted && !isClaimed ? "trophy" : config.icon} size={24} color={isCompleted && !isClaimed ? COLORS.gold : config.color} />
                  </View>
                  <View style={styles.titleContainer}>
                    <Text style={[styles.questTitle, isClaimed && styles.questTitleDone]} numberOfLines={1}>
                      {quest.title}
                    </Text>
                    <Text style={styles.questSubtitle}>{config.title}</Text>
                  </View>
                </View>

                <Text style={styles.questDescription} numberOfLines={2}>
                  {quest.description}
                </Text>

                <View style={styles.progressContainer}>
                  <View style={styles.progressTopRow}>
                    <Text style={[styles.progressValueText, isCompleted && !isClaimed && { color: COLORS.gold }]}>
                      {isCompleted ? 'TERMINÉ !' : `${currentValue} / ${quest.target_value}`}
                    </Text>
                    {!isCompleted && <Text style={styles.progressPercentText}>{Math.round(progressPercent)}%</Text>}
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: isCompleted && !isClaimed ? COLORS.gold : config.color }]} />
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.rewardsRow}>
                    <View style={styles.rewardPill}>
                      <Ionicons name="star" size={14} color={COLORS.gold} />
                      <Text style={styles.rewardText}>{quest.xp_reward} XP</Text>
                    </View>
                    {quest.parts_reward !== null && quest.parts_reward > 0 && (
                      <View style={styles.rewardPill}>
                        <Ionicons name="flash" size={14} color={COLORS.accent} />
                        <Text style={styles.rewardText}>+{quest.parts_reward}</Text>
                      </View>
                    )}
                  </View>

                  {isClaimed ? (
                    <View style={styles.claimedBadge}>
                      <Ionicons name="checkmark-circle" size={16} color={COLORS.textMuted} />
                      <Text style={styles.claimedText}>DÉJÀ RÉCUPÉRÉ</Text>
                    </View>
                  ) : isCompleted ? (
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                      <TouchableOpacity
                        onPress={() => handleClaim(quest.quest_key, quest.id)}
                        style={[styles.premiumClaimButton, { shadowColor: config.color }]}
                        activeOpacity={0.7}
                      >
                        {loadingQuestId === quest.id ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <View style={styles.claimButtonInner}>
                            <Ionicons name="sparkles" size={16} color="#FFF" style={{ marginRight: 8 }} />
                            <Text style={styles.premiumClaimText}>PRÉLEVER LOT</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  ) : (
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>EN COURS</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  typeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(0,0,0,0.03)',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },
  typeButtonText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    letterSpacing: 1,
  },
  scrollContent: {
    paddingLeft: 20,
    paddingRight: 10, // Pour le dernier item
    paddingBottom: 20,
    gap: 16,
  },
  questCard: {
    width: screenWidth * 0.8,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EDECEC',
    // Ombres premium
    shadowColor: '#A67C1F',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  emptyCard: {
    width: screenWidth - 40,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 24,
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  questTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  questTitleDone: {
    textDecorationLine: 'line-through',
    opacity: 0.4,
  },
  questSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  questDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 20,
    height: 36, // Force 2 lignes pour alignement
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressValueText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  progressPercentText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: COLORS.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rewardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rewardText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  questCardReady: {
    borderColor: COLORS.gold,
    borderWidth: 2,
    shadowColor: COLORS.gold,
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  rewardRibbon: {
    position: 'absolute',
    top: 0,
    right: 20,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    zIndex: 10,
  },
  rewardRibbonText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  premiumClaimButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  premiumClaimText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  statusBadge: {
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  claimButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  claimedText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  emptyText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  }
});
