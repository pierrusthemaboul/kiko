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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FirebaseAnalytics } from '@/lib/firebase';
import { useGameLogicA } from '@/hooks/useGameLogicA';
import { usePlays } from '@/hooks/usePlays'; // Importer le nouveau hook
import { useLeaderboards } from '@/hooks/useLeaderboards';
import { rankFromXP } from '@/lib/economy/ranks';
import { getQuestProgressPercentage } from '@/lib/economy/quests';
import QuestCarousel from '@/components/QuestCarousel';
import LeaderboardCarousel from '@/components/LeaderboardCarousel';
import { getAllQuestsWithProgress } from '@/utils/questSelection';
import { supabase } from '@/lib/supabase/supabaseClients';

const COLORS = {
  background: '#050505',
  surface: '#111111',
  surfaceAlt: '#181818',
  gold: '#d4af37',
  goldSoft: 'rgba(212, 175, 55, 0.2)',
  textPrimary: '#f5f1d6',
  textMuted: '#b5b1a0',
  divider: '#2a2a2a',
};

export default function Vue1() {
  const router = useRouter();
  // On utilise useGameLogicA principalement pour le profil
  const { profile } = useGameLogicA();
  // On utilise usePlays spécifiquement pour les infos de parties
  const { playsInfo, canStartRun, loadingPlays } = usePlays();
  // On utilise useLeaderboards pour les classements
  const { leaderboards, loading: leaderboardsLoading } = useLeaderboards();

  // État pour les quêtes (daily, weekly, monthly)
  const [quests, setQuests] = React.useState<{
    daily: any[];
    weekly: any[];
    monthly: any[];
  }>({ daily: [], weekly: [], monthly: [] });
  const [questsLoading, setQuestsLoading] = React.useState(true);

  const xp = profile?.xp_total ?? 0;
  const rank = useMemo(() => rankFromXP(xp), [xp]);
  const playerName = profile?.display_name ?? 'Voyageur';

  const headerSubtitle = useMemo(
    () => `Titre : ${rank.label} · ${xp.toLocaleString('fr-FR')} XP`,
    [rank.label, xp]
  );
  const headerPlays = useMemo(
    () => `${playsInfo?.remaining ?? 0} parties restantes`,
    [playsInfo?.remaining]
  );


  useEffect(() => {
    FirebaseAnalytics.screen('HomeLuxury', 'Vue1');
  }, []);

  // Charger les quêtes au montage et quand le profil change
  useEffect(() => {
    async function loadQuests() {
      if (!profile?.id) {
        setQuestsLoading(false);
        return;
      }

      setQuestsLoading(true);
      try {
        const allQuests = await getAllQuestsWithProgress(profile.id);
        setQuests(allQuests);
      } catch (err) {
        console.error('[QUESTS ERROR] Erreur chargement:', err);
      } finally {
        setQuestsLoading(false);
      }
    }

    loadQuests();
  }, [profile?.id]);

  const handleModePress = useCallback(
    (mode: 'classic' | 'precision') => {
      if (!canStartRun && !loadingPlays) { // Vérifier aussi que le chargement est terminé
        Alert.alert('Plus de parties disponibles', "Vous avez utilisé toutes vos parties pour aujourd'hui.");
        return;
      }

      router.push(`/game/${mode}`);
    },
    [router, canStartRun, loadingPlays],
  );

  const handleLogout = useCallback(async () => {
    try {
      FirebaseAnalytics.logEvent('user_logout', { from_screen: 'vue1' });
      await supabase.auth.signOut();
      router.replace('/auth/login');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de se déconnecter');
      FirebaseAnalytics.error('logout_error', error instanceof Error ? error.message : 'Unknown error', 'Vue1');
    }
  }, [router]);


  return (
    <ImageBackground source={require('@/assets/images/sablier.png')} style={styles.background} resizeMode="cover">
      <StatusBar barStyle="light-content" />
      <View style={styles.overlay} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.headerRow}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.welcome}>Bienvenue, {playerName}</Text>
              <Text style={styles.subtitle}>{headerSubtitle}</Text>
              <Text style={styles.subtitle}>{headerPlays}</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choisissez votre destin</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeCard, !canStartRun && { opacity: 0.5 }]}
              onPress={() => handleModePress('classic')}
              disabled={!canStartRun}
            >
              <View style={styles.modeIconCircle}>
                <Ionicons name="flash-outline" size={26} color={COLORS.gold} />
              </View>
              <View style={styles.modeContent}>
                <Text style={styles.modeTitle}>Mode Classique</Text>
                <Text style={styles.modeDescription}>Flow équilibré, idéal pour progresser avec style.</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={COLORS.gold} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeCard, !canStartRun && { opacity: 0.5 }]}
              onPress={() => handleModePress('precision')}
              disabled={!canStartRun}
            >
              <View style={styles.modeIconCircle}>
                <Ionicons name="analytics-outline" size={26} color={COLORS.gold} />
              </View>
              <View style={styles.modeContent}>
                <Text style={styles.modeTitle}>Mode Précision</Text>
                <Text style={styles.modeDescription}>Chaque date compte. Visez le coup parfait.</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={COLORS.gold} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          {questsLoading ? (
            <Text style={styles.loadingText}>Chargement des quêtes...</Text>
          ) : (
            <QuestCarousel
              dailyQuests={quests.daily || []}
              weeklyQuests={quests.weekly || []}
              monthlyQuests={quests.monthly || []}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Classement</Text>
          <LeaderboardCarousel leaderboards={leaderboards} loading={leaderboardsLoading} />
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 80,
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
  },
  logoutButton: {
    padding: 8,
    marginTop: 4,
  },
  welcome: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.gold,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.gold,
    marginBottom: 16,
    letterSpacing: 0.4,
  },
  modeRow: {
    gap: 16,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    shadowColor: COLORS.gold,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  modeIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.goldSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modeContent: {
    flex: 1,
    marginRight: 12,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  card: {
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
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  questDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  questIcon: {
    width: 28,
    textAlign: 'center',
    marginRight: 12,
    fontSize: 16,
  },
  questText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  questTextDone: {
    color: COLORS.gold,
  },
  questProgressBar: {
    height: 6,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 3,
    marginTop: 6,
    marginBottom: 4,
    overflow: 'hidden',
  },
  questProgressFill: {
    height: '100%',
    backgroundColor: COLORS.gold,
    borderRadius: 3,
  },
  questProgressText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  leaderRank: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    backgroundColor: COLORS.surfaceAlt,
  },
  leaderRankText: {
    color: COLORS.gold,
    fontWeight: '600',
  },
  leaderInfo: {
    flex: 1,
  },
  leaderName: {
    fontSize: 16,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  leaderScore: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  leaderButton: {
    marginTop: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gold,
    paddingVertical: 12,
    alignItems: 'center',
  },
  leaderButtonText: {
    color: COLORS.gold,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  loadingText: {
    color: COLORS.textMuted,
    paddingVertical: 12,
  },
});
