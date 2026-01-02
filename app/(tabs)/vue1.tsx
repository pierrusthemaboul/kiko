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
  // On utilise useGameLogicA principalement pour le profil et les infos invité
  const { profile, guestPlaysInfo } = useGameLogicA();
  // On utilise usePlays spécifiquement pour les infos de parties (utilisateurs connectés)
  const { playsInfo, canStartRun, loadingPlays, refreshPlaysInfo } = usePlays();
  // On utilise useLeaderboardsByMode pour les classements séparés par mode
  const { leaderboards, loading: leaderboardsLoading } = useLeaderboardsByMode();
  // Hook pour la pub récompensée (gagner 1 partie)
  const { isLoaded: adLoaded, rewardEarned, showAd, resetReward } = useRewardedPlayAd();
  // Hook audio pour les sons
  const { playSound } = useAudioContext();

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

  // Afficher les parties restantes : invité ou connecté
  const headerPlays = useMemo(() => {
    if (!profile?.id) {
      // Mode invité
      return `${guestPlaysInfo.remaining} parties restantes (mode invité)`;
    }
    // Mode connecté
    return `${playsInfo?.remaining ?? 0} parties restantes`;
  }, [profile?.id, playsInfo?.remaining, guestPlaysInfo.remaining]);

  // Déterminer si on peut jouer : invité ou connecté
  const canPlay = useMemo(() => {
    if (!profile?.id) {
      // Mode invité : utiliser guestPlaysInfo
      return guestPlaysInfo.canStart;
    }
    // Mode connecté : utiliser canStartRun
    return canStartRun;
  }, [profile?.id, guestPlaysInfo.canStart, canStartRun]);


  useEffect(() => {
    FirebaseAnalytics.screen('HomeLuxury', 'Vue1');
  }, []);

  // Charger les quêtes au montage et quand le profil change
  useEffect(() => {
    async function loadQuests() {
      if (!profile?.id) {
        // Réinitialiser les quêtes si l'utilisateur se déconnecte
        setQuests({ daily: [], weekly: [], monthly: [] });
        setQuestsLoading(false);
        return;
      }

      setQuestsLoading(true);
      try {
        // NOUVEAU: Passer le rank index pour le scaling des quêtes
        const allQuests = await getAllQuestsWithProgress(profile.id, rank.index);
        setQuests(allQuests);
      } catch (err) {
        console.error('[QUESTS ERROR] Erreur chargement:', err);
        FirebaseAnalytics.trackError('quests_load_error', {
          message: err instanceof Error ? err.message : String(err),
          screen: 'vue1',
          context: 'loadQuests',
        });
      } finally {
        setQuestsLoading(false);
      }
    }

    loadQuests();
  }, [profile?.id, rank.index]);

  const handleModePress = useCallback(
    (mode: 'classic' | 'precision') => {
      // Déterminer si on peut démarrer : invité ou connecté
      const canStart = !profile?.id ? guestPlaysInfo.canStart : canStartRun;
      const remaining = !profile?.id ? guestPlaysInfo.remaining : (playsInfo?.remaining ?? 0);

      if (!canStart && !loadingPlays && !guestPlaysInfo.isLoading) {
        const message = !profile?.id
          ? "Vous avez utilisé vos 3 parties gratuites pour aujourd'hui.\n\nCréez un compte pour débloquer jusqu'à 8 parties par jour et sauvegarder votre progression !"
          : "Vous avez utilisé toutes vos parties pour aujourd'hui.";

        Alert.alert('Plus de parties disponibles', message, [
          { text: 'OK', style: 'cancel' },
          ...(!profile?.id ? [{
            text: 'Créer un compte',
            onPress: () => {
              FirebaseAnalytics.trackEvent('guest_convert_prompt', {
                source: 'no_plays_left',
                screen: 'vue1',
              });
              router.push('/auth/signup');
            }
          }] : [])
        ]);

        FirebaseAnalytics.trackEvent('mode_selection_blocked', {
          mode,
          remaining_plays: remaining,
          is_guest: !profile?.id,
          screen: 'vue1',
        });
        return;
      }

      // Jouer le son de sélection de mode
      playSound('modeSelect');

      // Track la sélection du mode
      FirebaseAnalytics.trackEvent('mode_selected', {
        mode,
        remaining_plays: remaining,
        is_guest: !profile?.id,
        screen: 'vue1',
      });

      router.push(`/game/${mode}`);
    },
    [router, canStartRun, loadingPlays, playSound, playsInfo?.remaining, profile?.id, guestPlaysInfo],
  );

  const handleLogout = useCallback(async () => {
    try {
      FirebaseAnalytics.trackEvent('user_logout', { from_screen: 'vue1' });
      await supabase.auth.signOut();

      // Désactiver le mode invité
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.removeItem('@timalaus_guest_mode');
      console.log('[Guest Mode] Mode invité désactivé');

      router.replace('/auth/login');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de se déconnecter');
      FirebaseAnalytics.trackError('logout_error', {
        message: error instanceof Error ? error.message : 'Unknown error',
        screen: 'Vue1',
      });
    }
  }, [router]);

  const handleWatchAdForPlay = useCallback(() => {
    if (!adLoaded) {
      Alert.alert('Publicité non disponible', 'La publicité n\'est pas encore chargée. Réessayez dans quelques instants.');
      FirebaseAnalytics.trackEvent('rewarded_play_ad_not_loaded', {
        screen: 'vue1',
        remaining_plays: playsInfo?.remaining ?? 0,
      });
      return;
    }

    FirebaseAnalytics.trackEvent('rewarded_play_ad_requested', {
      screen: 'vue1',
      remaining_plays: playsInfo?.remaining ?? 0,
    });

    const success = showAd();
    if (!success) {
      Alert.alert('Erreur', 'Impossible de lancer la publicité pour le moment.');
      FirebaseAnalytics.trackError('rewarded_play_ad_show_error', {
        message: 'Failed to show rewarded ad for extra play',
        screen: 'vue1',
      });
    }
  }, [adLoaded, showAd, playsInfo?.remaining]);

  // Gérer la récompense gagnée
  useEffect(() => {
    if (rewardEarned && profile?.id) {
      // Incrémenter parties_per_day dans la base de données
      const grantExtraPlay = async () => {
        try {
          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('parties_per_day')
            .eq('id', profile.id)
            .single();

          if (currentProfile) {
            const newPartiesPerDay = (currentProfile.parties_per_day ?? 3) + 1;
            const { error } = await supabase
              .from('profiles')
              .update({ parties_per_day: newPartiesPerDay })
              .eq('id', profile.id);

            if (!error) {
              Alert.alert('Partie gagnée ! 🎉', 'Vous avez gagné 1 partie supplémentaire !');
              refreshPlaysInfo(); // Rafraîchir les infos de parties
              FirebaseAnalytics.trackEvent('rewarded_play_granted', {
                screen: 'vue1',
                new_parties_per_day: newPartiesPerDay,
                previous_remaining: playsInfo?.remaining ?? 0,
              });
            } else {
              console.error('[RewardedPlay] Error updating profile:', error);
              Alert.alert('Erreur', 'Impossible d\'ajouter la partie. Contactez le support.');
              FirebaseAnalytics.trackError('rewarded_play_grant_error', {
                message: error.message,
                screen: 'vue1',
                context: 'update_profile',
              });
            }
          }
        } catch (error) {
          console.error('[RewardedPlay] Error granting play:', error);
          Alert.alert('Erreur', 'Une erreur est survenue.');
          FirebaseAnalytics.trackError('rewarded_play_grant_error', {
            message: error instanceof Error ? error.message : String(error),
            screen: 'vue1',
            context: 'catch_block',
          });
        } finally {
          resetReward();
        }
      };

      grantExtraPlay();
    }
  }, [rewardEarned, profile?.id, refreshPlaysInfo, resetReward]);


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

        <View style={styles.adButtonContainer}>
          <TouchableOpacity
            style={[styles.rewardedAdButton, !adLoaded && styles.rewardedAdButtonDisabled]}
            onPress={handleWatchAdForPlay}
            disabled={!adLoaded}
          >
            <Ionicons name="play-circle" size={20} color={adLoaded ? COLORS.gold : COLORS.textMuted} />
            <Text style={[styles.rewardedAdButtonText, !adLoaded && styles.rewardedAdButtonTextDisabled]}>
              Gagner 1 partie
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choisissez votre destin</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeCard, !canPlay && { opacity: 0.5 }]}
              onPress={() => handleModePress('classic')}
              disabled={!canPlay}
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
              style={[styles.modeCard, !canPlay && { opacity: 0.5 }]}
              onPress={() => handleModePress('precision')}
              disabled={!canPlay}
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

        <View style={styles.bannerContainer}>
          <BannerAd
            unitId={getAdUnitId('BANNER_HOME')}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            requestOptions={getAdRequestOptions()}
            onAdLoaded={() => {
              console.log('[BANNER_HOME] Ad loaded successfully');
              FirebaseAnalytics.trackEvent('banner_ad_loaded', { screen: 'vue1', position: 'home' });
            }}
            onAdFailedToLoad={(error) => {
              console.error('[BANNER_HOME] Failed to load ad:', error);
              FirebaseAnalytics.trackError('banner_ad_failed', {
                screen: 'vue1',
                position: 'home',
                error_code: error.code,
                error_message: error.message,
              });
            }}
          />
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
          <Text style={styles.sectionTitle}>Classements</Text>
          <DualLeaderboardCarousel
            classicLeaderboards={leaderboards.classic}
            precisionLeaderboards={leaderboards.precision}
            loading={leaderboardsLoading}
          />
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
  bannerContainer: {
    alignItems: 'center',
    marginBottom: 24,
    overflow: 'hidden',
    borderRadius: 12,
  },
  adButtonContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  rewardedAdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.goldSoft,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    gap: 8,
  },
  rewardedAdButtonDisabled: {
    backgroundColor: COLORS.surfaceAlt,
    borderColor: COLORS.divider,
    opacity: 0.6,
  },
  rewardedAdButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gold,
    letterSpacing: 0.3,
  },
  rewardedAdButtonTextDisabled: {
    color: COLORS.textMuted,
  },
});
