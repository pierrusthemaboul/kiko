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
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AIConsentModal from '@/components/modals/AIConsentModal';
import LeaderboardRewardModal from '@/components/modals/LeaderboardRewardModal';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BannerAd, BannerAdSize, AdEventType } from 'react-native-google-mobile-ads';
import { FirebaseAnalytics } from '@/lib/firebase';
import { useGameLogicA } from '@/hooks/useGameLogicA';
import { usePlays } from '@/hooks/usePlays';
import { useLeaderboardsByMode } from '@/hooks/useLeaderboardsByMode';
import { useMyRanking } from '@/hooks/useMyRanking';
import { useLeaderboardRewards } from '@/hooks/useLeaderboardRewards';
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
  const { rankings: myRankings, loading: myRankingLoading } = useMyRanking(profile?.id);
  const { pendingRewards, claimAll, claiming } = useLeaderboardRewards(profile?.id);
  const [quests, setQuests] = React.useState<{
    daily: any[];
    weekly: any[];
    monthly: any[];
  }>({ daily: [], weekly: [], monthly: [] });
  const [questsLoading, setQuestsLoading] = React.useState(true);
  const [adSuccessLoading, setAdSuccessLoading] = React.useState(false);
  const grantProcessingRef = React.useRef(false);
  const [aiConsentGiven, setAiConsentGiven] = React.useState<boolean | null>(null);
  const [showAIInfo, setShowAIInfo] = React.useState(false);
  const [settingsVisible, setSettingsVisible] = React.useState(false);
  const [rewardModalDismissed, setRewardModalDismissed] = React.useState(false);

  // Refs stables pour le callback (évite les closures stale dans le callback ad)
  const profileRef = React.useRef(profile);
  const guestPlaysInfoRef = React.useRef(guestPlaysInfo);
  const refreshPlaysInfoRef = React.useRef(refreshPlaysInfo);
  React.useEffect(() => { profileRef.current = profile; }, [profile]);
  React.useEffect(() => { guestPlaysInfoRef.current = guestPlaysInfo; }, [guestPlaysInfo]);
  React.useEffect(() => { refreshPlaysInfoRef.current = refreshPlaysInfo; }, [refreshPlaysInfo]);

  // --- Callback direct appelé par le hook quand la récompense est confirmée ---
  // Ce callback est appelé directement depuis le handler CLOSED de l'ad (pas via React state)
  // ce qui est beaucoup plus fiable en production.
  const handleRewardEarned = React.useCallback(async () => {
    if (grantProcessingRef.current) {
      RemoteLogger.warn('Ads', '⚠️ Grant already in progress, skipping duplicate');
      return;
    }
    grantProcessingRef.current = true;
    setAdSuccessLoading(true);

    try {
      // Vérifier l'auth directement (pas de closure stale)
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (authUser) {
        // Utilisateur connecté : fetch-then-increment avec données fraîches
        RemoteLogger.info('Ads', `🔄 Granting extra play for user ${authUser.id}`);

        let success = false;
        for (let attempt = 1; attempt <= 3 && !success; attempt++) {
          try {
            // 1. Lire la valeur actuelle FRAÎCHE depuis la DB
            const { data: freshProfile, error: fetchError } = await (supabase
              .from('profiles')
              .select('parties_per_day')
              .eq('id', authUser.id)
              .single() as any);

            if (fetchError) {
              RemoteLogger.error('Ads', `Attempt ${attempt}: Failed to fetch profile: ${fetchError.message}`);
              if (attempt < 3) { await new Promise(r => setTimeout(r, 1000 * attempt)); continue; }
              break;
            }

            const currentAllowed = freshProfile?.parties_per_day ?? 3;
            const newAllowed = currentAllowed + 1;

            // 2. Incrémenter avec la valeur fraîche
            const { error: updateError } = await (supabase
              .from('profiles') as any)
              .update({ parties_per_day: newAllowed })
              .eq('id', authUser.id);

            if (updateError) {
              RemoteLogger.error('Ads', `Attempt ${attempt}: Failed to update: ${updateError.message}`);
              if (attempt < 3) { await new Promise(r => setTimeout(r, 1000 * attempt)); continue; }
              break;
            }

            // 3. Vérifier que l'update a pris effet
            const { data: verifyProfile } = await (supabase
              .from('profiles')
              .select('parties_per_day')
              .eq('id', authUser.id)
              .single() as any);

            if (verifyProfile?.parties_per_day >= newAllowed) {
              success = true;
              RemoteLogger.info('Ads', `✅ Extra play granted & verified: ${currentAllowed} → ${newAllowed}`);
              FirebaseAnalytics.trackEvent('extra_play_granted', {
                source: 'rewarded_ad',
                user_id: authUser.id,
                old_allowed: currentAllowed,
                new_allowed: newAllowed,
                attempt,
              });
            } else {
              RemoteLogger.warn('Ads', `Attempt ${attempt}: Verification failed (got ${verifyProfile?.parties_per_day}, expected >= ${newAllowed})`);
              if (attempt < 3) { await new Promise(r => setTimeout(r, 1000 * attempt)); }
            }
          } catch (attemptErr) {
            RemoteLogger.error('Ads', `Attempt ${attempt} error: ${attemptErr instanceof Error ? attemptErr.message : String(attemptErr)}`);
            if (attempt < 3) { await new Promise(r => setTimeout(r, 1000 * attempt)); }
          }
        }

        if (!success) {
          RemoteLogger.error('Ads', '❌ All 3 attempts to grant extra play failed');
          FirebaseAnalytics.trackEvent('extra_play_grant_failed', {
            user_id: authUser.id,
            reason: 'all_attempts_failed',
          });
        }
      } else {
        // Mode invité
        await guestPlaysInfoRef.current.grantExtraPlay();
        RemoteLogger.info('Ads', '✅ Guest extra play granted via ad');
      }

      // Rafraîchir l'affichage des parties
      await refreshPlaysInfoRef.current();
    } catch (err) {
      Logger.error('Ads', 'Error in handleRewardEarned', err);
      RemoteLogger.error('Ads', `❌ handleRewardEarned error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      grantProcessingRef.current = false;
      setAdSuccessLoading(false);
    }
  }, []);

  const { isLoaded: adLoaded, rewardEarned, showAd, resetReward } = useRewardedPlayAd({
    onRewardEarned: handleRewardEarned,
  });
  const { playSound } = useAudioContext();

  // Cleanup: reset reward state quand rewardEarned redevient false naturellement
  useEffect(() => {
    if (rewardEarned && !grantProcessingRef.current && !adSuccessLoading) {
      // rewardEarned est true mais le grant n'est pas en cours - reset pour éviter un état bloqué
      const timeout = setTimeout(() => {
        if (!grantProcessingRef.current) {
          resetReward();
        }
      }, 10000); // Safety timeout: si après 10s le grant n'a pas démarré, reset
      return () => clearTimeout(timeout);
    }
  }, [rewardEarned, adSuccessLoading, resetReward]);

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

  // --- Vérifier le consentement IA au premier lancement ---
  useEffect(() => {
    AsyncStorage.getItem('@ai_consent_accepted').then((value) => {
      setAiConsentGiven(value === 'true');
    });
  }, []);

  const handleAIConsent = useCallback(async () => {
    await AsyncStorage.setItem('@ai_consent_accepted', 'true');
    setAiConsentGiven(true);
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
          <TouchableOpacity style={styles.settingsIcon} onPress={() => setSettingsVisible(true)}>
            <Ionicons name="settings-outline" size={24} color={COLORS.textMuted} />
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
          <DualLeaderboardCarousel
            classicLeaderboards={leaderboards.classic}
            myRankings={myRankings}
            loading={leaderboardsLoading}
            myRankingLoading={myRankingLoading}
          />
        </View>
      </ScrollView>

      {/* Modal de Réglages */}
      <Modal
        visible={settingsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Paramètres</Text>
              <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                setSettingsVisible(false);
                setShowAIInfo(true);
              }}
            >
              <View style={styles.modalItemIcon}>
                <Ionicons name="sparkles-outline" size={20} color={COLORS.accent} />
              </View>
              <Text style={styles.modalItemText}>À propos de l'IA</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                const { openBrowserAsync } = require('expo-web-browser');
                openBrowserAsync('https://timalaus.fr/terms');
              }}
            >
              <View style={styles.modalItemIcon}>
                <Ionicons name="document-text-outline" size={20} color={COLORS.textMuted} />
              </View>
              <Text style={styles.modalItemText}>Conditions d'Utilisation</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                const { openBrowserAsync } = require('expo-web-browser');
                openBrowserAsync('https://timalaus.fr/privacy');
              }}
            >
              <View style={styles.modalItemIcon}>
                <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.textMuted} />
              </View>
              <Text style={styles.modalItemText}>Confidentialité</Text>
            </TouchableOpacity>

            <View style={styles.modalDivider} />

            <TouchableOpacity
              style={[styles.modalItem, styles.logoutItem]}
              onPress={() => {
                setSettingsVisible(false);
                handleLogout();
              }}
            >
              <View style={styles.modalItemIcon}>
                <Ionicons name="log-out-outline" size={20} color="#DC3545" />
              </View>
              <Text style={[styles.modalItemText, { color: '#DC3545' }]}>Déconnexion</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de récompenses de classement */}
      <LeaderboardRewardModal
        visible={pendingRewards.length > 0 && !rewardModalDismissed}
        rewards={pendingRewards}
        onClaim={async (periodType, periodKey) => {}}
        onClaimAll={async () => {
          await claimAll();
          await refreshPlaysInfo();
          setRewardModalDismissed(true);
        }}
        claiming={claiming}
        onClose={() => setRewardModalDismissed(true)}
      />

      {/* Modal de consentement IA (bloquant au premier lancement) */}
      <AIConsentModal visible={aiConsentGiven === false} onAccept={handleAIConsent} />

      {/* Modal info IA (relecture) */}
      <AIConsentModal visible={showAIInfo} onAccept={() => setShowAIInfo(false)} infoOnly />
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
  settingsIcon: {
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
  // --- Styles Modal de Réglages ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  modalItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 12,
  },
  logoutItem: {
    marginTop: 4,
  },
});
