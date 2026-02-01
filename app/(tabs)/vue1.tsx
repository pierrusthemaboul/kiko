import React, { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BannerAd, BannerAdSize, AdEventType } from 'react-native-google-mobile-ads';
import { FirebaseAnalytics } from '@/lib/firebase';
import { useGameLogicA } from '@/hooks/useGameLogicA';
import { usePlays } from '@/hooks/usePlays'; // Importer le nouveau hook
import { useLeaderboardsByMode } from '@/hooks/useLeaderboardsByMode';
import { rankFromXP } from '@/lib/economy/ranks';
import { getQuestProgressPercentage } from '@/lib/economy/quests';
import QuestCarousel from '@/components/QuestCarousel';
import DualLeaderboardCarousel from '@/components/DualLeaderboardCarousel';
import { getAllQuestsWithProgress } from '@/utils/questSelection';
import { supabase } from '@/lib/supabase/supabaseClients';
import { getAdRequestOptions, getAdUnitId } from '@/lib/config/adConfig';
import { useRewardedPlayAd } from '@/hooks/useRewardedPlayAd';
import { useAudioContext } from '@/contexts/AudioContext';
import { Logger } from '@/utils/logger';
import { RemoteLogger } from '@/lib/remoteLogger';

const COLORS = {
  background: '#FAF7F2',     // Crème / Parchemin (Chaleureux)
  surface: '#FFFFFF',        // Blanc pur
  surfaceAlt: '#F2EDE4',     // Beige doux pour contraste
  primary: '#002B5B',        // Bleu Marine Royal
  accent: '#A67C1F',         // Bronze / Or vieilli
  accentSoft: 'rgba(166, 124, 31, 0.1)',
  textPrimary: '#1C1C1C',    // Anthracite profond
  textMuted: '#7A7267',      // Gris chaud
  divider: '#E8E1D5',        // Bordures discrètes
  gold: '#D4AF37',           // Or pur
};

export default function Vue1() {
  const router = useRouter();
  const { profile, guestPlaysInfo } = useGameLogicA();
  const { playsInfo, canStartRun, loadingPlays, refreshPlaysInfo } = usePlays();
  const { leaderboards, loading: leaderboardsLoading } = useLeaderboardsByMode();
  const { isLoaded: adLoaded, rewardEarned, showAd, resetReward } = useRewardedPlayAd();
  const { playSound } = useAudioContext();

  const [quests, setQuests] = React.useState<{
    daily: any[];
    weekly: any[];
    monthly: any[];
  }>({ daily: [], weekly: [], monthly: [] });
  const [questsLoading, setQuestsLoading] = React.useState(true);
  const [adSuccessLoading, setAdSuccessLoading] = React.useState(false);
  const grantProcessingRef = React.useRef(false);

  const xp = profile?.xp_total ?? 0;
  const rank = useMemo(() => rankFromXP(xp), [xp]);
  const playerName = profile?.display_name ?? 'Voyageur';

  const headerSubtitle = useMemo(
    () => `${rank.label} · ${xp.toLocaleString('fr-FR')} XP`,
    [rank.label, xp]
  );

  const headerPlays = useMemo(() => {
    if (!profile?.id) {
      return `${guestPlaysInfo.remaining} parties restantes (invité)`;
    }
    return `${playsInfo?.remaining ?? 0} parties restantes`;
  }, [profile?.id, playsInfo?.remaining, guestPlaysInfo.remaining]);

  const canPlay = useMemo(() => {
    if (!profile?.id) return guestPlaysInfo.canStart;
    return canStartRun;
  }, [profile?.id, guestPlaysInfo.canStart, canStartRun]);

  useEffect(() => {
    FirebaseAnalytics.screen('HomeClean', 'Vue1');
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshPlaysInfo();
      return () => { };
    }, [refreshPlaysInfo])
  );

  useEffect(() => {
    async function loadQuests() {
      if (!profile?.id) {
        setQuests({ daily: [], weekly: [], monthly: [] });
        setQuestsLoading(false);
        return;
      }

      setQuestsLoading(true);
      try {
        const allQuests = await getAllQuestsWithProgress(profile.id, rank.index);
        setQuests(allQuests);
      } catch (err) {
        console.error('[QUESTS ERROR]', err);
      } finally {
        setQuestsLoading(false);
      }
    }
    loadQuests();
  }, [profile?.id, rank.index]);

  const handleStartClassic = useCallback(() => {
    const canStart = !profile?.id ? guestPlaysInfo.canStart : canStartRun;
    if (!canStart && !loadingPlays && !guestPlaysInfo.isLoading) {
      Alert.alert('Plus de parties available', "Revenez demain ou regardez une pub pour rejouer !");
      return;
    }
    router.push('/game/classic');
  }, [router, canStartRun, loadingPlays, profile?.id, guestPlaysInfo]);

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.removeItem('@timalaus_guest_mode');
      router.replace('/auth/login');
    } catch (error) { }
  }, [router]);

  return (
    <View style={styles.background}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header Moderne & Épuré */}
        <View style={styles.headerSection}>
          <View style={styles.headerInfo}>
            <Text style={styles.welcomeText}>Bonjour, {playerName}</Text>
            <Text style={styles.rankBadge}>{headerSubtitle}</Text>
          </View>
          <TouchableOpacity style={styles.logoutIcon} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Status des parties - Style "Pill" */}
        <View style={styles.playsStatusContainer}>
          <View style={styles.playsPill}>
            <Ionicons name="time-outline" size={16} color={COLORS.primary} />
            <Text style={styles.playsPillText}>{headerPlays}</Text>
          </View>
          <TouchableOpacity
            style={[styles.addPlayButton, (!adLoaded || adSuccessLoading) && { opacity: 0.5 }]}
            onPress={() => showAd()}
            disabled={!adLoaded || adSuccessLoading}
          >
            <Ionicons name="gift-outline" size={18} color={COLORS.accent} />
            <Text style={styles.addPlayText}>Extra Play</Text>
          </TouchableOpacity>
        </View>

        {/* THE CORE GAME CARD - Focus sur le mode classique */}
        <View style={styles.heroSection}>
          <TouchableOpacity
            style={[styles.heroCard, !canPlay && styles.heroCardDisabled]}
            onPress={handleStartClassic}
            disabled={!canPlay}
            activeOpacity={0.8}
          >
            <ImageBackground
              source={require('@/assets/images/bg-level-1.png')}
              style={styles.heroImage}
              imageStyle={{ borderRadius: 24 }}
            >
              <View style={styles.heroOverlay}>
                <View style={styles.heroContent}>
                  <Text style={styles.heroLabel}>MODE PRINCIPAL</Text>
                  <Text style={styles.heroTitle}>L'Odyssée Temporelle</Text>
                  <Text style={styles.heroDesc}>Explorez les époques et replacez l'histoire dans le bon ordre.</Text>
                </View>
                <View style={styles.playButtonCircle}>
                  <Ionicons name="play" size={32} color={COLORS.primary} />
                </View>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        </View>

        {/* Quêtes - Nouvelle Section Raffinée */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Objectifs de Progression</Text>
          </View>
          {questsLoading ? (
            <View style={styles.skeletonQuest} />
          ) : (
            <QuestCarousel
              dailyQuests={quests.daily || []}
              weeklyQuests={quests.weekly || []}
              monthlyQuests={quests.monthly || []}
              userId={profile?.id}
              rankIndex={rank.index}
              onRefresh={() => { }}
            />
          )}
        </View>

        {/* Classement - On ne montre plus que le mode Classique */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Explorateurs</Text>
            <Text style={styles.sectionLink}>Voir tout</Text>
          </View>
          {/* Note: Dans un second temps on pourra simplifier DualLeaderboardCarousel */}
          <DualLeaderboardCarousel
            classicLeaderboards={leaderboards.classic}
            precisionLeaderboards={{ daily: [], weekly: [], monthly: [], allTime: [] }} // Format correct
            loading={leaderboardsLoading}
          />
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  rankBadge: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  logoutIcon: {
    padding: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  playsStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  playsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.divider,
    gap: 6,
  },
  playsPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  addPlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.accent,
    gap: 6,
  },
  addPlayText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accent,
  },
  heroSection: {
    marginBottom: 32,
  },
  heroCard: {
    height: 220,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  heroCardDisabled: {
    opacity: 0.6,
  },
  heroImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)', // Overlay sombre neutre plus profond
    borderRadius: 24,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  heroContent: {
    flex: 1,
    paddingRight: 10,
  },
  heroLabel: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroDesc: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    lineHeight: 18,
  },
  playButtonCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
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
