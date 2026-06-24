import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Alert, StatusBar, Text, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase/supabaseClients';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseAnalytics } from '@/lib/firebase';
import { getTutorialEnabled, setTutorialEnabled } from '@/src/features/tutorial/tutorialStorage';

// Components
import AIConsentModal from '@/components/modals/AIConsentModal';
import LeaderboardRewardModal from '@/components/modals/LeaderboardRewardModal';
import { OdysseyHero } from '@/src/features/home/components/OdysseyHero';
import { HomeHeader } from '@/src/features/home/components/HomeHeader';
import { PlaysPill } from '@/src/features/home/components/PlaysPill';
import { ProgressionDrawer } from '@/src/features/home/components/ProgressionDrawer';
import { HomeSettingsModal } from '@/src/features/home/components/HomeSettingsModal';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';

// Hooks
import { useHomeData } from '@/src/features/home/hooks/useHomeData';
import { useHomeAdsFlow } from '@/src/features/home/hooks/useHomeAdsFlow';
import { useAIConsent } from '@/src/features/home/hooks/useAIConsent';

export default function Vue1() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const playsPillTopOffset = insets.top + 82;

  // Custom Hooks qui encapsulent les logiques complexes
  const homeData = useHomeData();
  const { adLoaded, adSuccessLoading, showAd } = useHomeAdsFlow(
    homeData.profile,
    homeData.guestPlaysInfo,
    async () => {
      await homeData.refreshPlaysInfo();
    }
  );
  const { aiConsentGiven, acceptConsent } = useAIConsent();

  // États UI Locaux
  const [showAIInfo, setShowAIInfo] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [rewardModalDismissed, setRewardModalDismissed] = useState(false);
  const [tutorialEnabled, setTutorialEnabledState] = useState(true);
  const [tutorialLoading, setTutorialLoading] = useState(true);

  const {
    volume: musicVolume,
    setVolume: setMusicVolume,
    isEnabled: musicEnabled,
    setEnabled: setMusicEnabled,
  } = useBackgroundMusic({ autoStart: false });

  useEffect(() => {
    FirebaseAnalytics.screen('HomeClean', 'Vue1');
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadTutorialState = async () => {
      try {
        const enabled = await getTutorialEnabled();
        if (mounted) {
          setTutorialEnabledState(enabled);
        }
      } finally {
        if (mounted) {
          setTutorialLoading(false);
        }
      }
    };

    loadTutorialState();

    return () => {
      mounted = false;
    };
  }, []);

  const handleToggleTutorial = useCallback(async (nextValue: boolean) => {
    const previousValue = tutorialEnabled;
    setTutorialEnabledState(nextValue);

    try {
      await setTutorialEnabled(nextValue);
    } catch {
      setTutorialEnabledState(previousValue);
      Alert.alert('Erreur', "Impossible de sauvegarder l'état du tutoriel.");
    }
  }, [tutorialEnabled]);

  const handleStartClassic = useCallback(() => {
    if (!homeData.canPlay && !homeData.loadingPlays && !homeData.guestPlaysInfo.isLoading) {
      Alert.alert('Plus de parties available', "Revenez demain ou regardez une pub pour rejouer !");
      return;
    }
    router.push('/game/classic');
  }, [router, homeData.canPlay, homeData.loadingPlays, homeData.guestPlaysInfo]);

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      await AsyncStorage.removeItem('@timalaus_guest_mode');
      router.replace('/auth/login');
    } catch (error) {}
  }, [router]);

  const handleDeleteAccount = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    Alert.alert(
      'Supprimer le compte',
      'Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible et toutes vos données (scores, progression) seront définitivement effacées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              FirebaseAnalytics.trackEvent('user_account_deletion_requested', {
                user_id: user.id,
                screen: 'vue1',
              });

              // Appel de la fonction RPC Supabase pour une suppression réelle (auth.users)
              const { error: deleteError } = await supabase.rpc('delete_user');
              
              if (deleteError) {
                console.warn("RPC delete_user failed (falling back to simple logout):", deleteError);
              }

              // On déconnecte l'utilisateur
              await supabase.auth.signOut();
              await AsyncStorage.removeItem('@timalaus_guest_mode');

              Alert.alert('Compte supprimé', 'Votre demande de suppression a été prise en compte et vous avez été déconnecté.');
              router.replace('/auth/login');
            } catch (error) {
              console.error("Error during account deletion:", error);
              Alert.alert('Erreur', 'Impossible de supprimer le compte pour le moment.');
            }
          },
        },
      ]
    );
  }, [router]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Layer Principal : Odyssée Temporelle en Plein Écran */}
      <OdysseyHero 
        canPlay={homeData.canPlay} 
        onStart={handleStartClassic} 
        tutorialControl={(
          <View style={styles.tutorialToggleContainer}>
            <Text style={styles.tutorialToggleLabel}>Tutoriel</Text>
            <Switch
              value={tutorialEnabled}
              onValueChange={handleToggleTutorial}
              disabled={tutorialLoading}
              trackColor={{ false: 'rgba(255,255,255,0.25)', true: 'rgba(244, 208, 104, 0.5)' }}
              thumbColor={tutorialEnabled ? '#F4D068' : '#f4f3f4'}
              ios_backgroundColor="rgba(255,255,255,0.25)"
            />
          </View>
        )}
      />

      {/* Layer Overlay Haut : Header de status */}
      <HomeHeader 
        playerName={homeData.playerName}
        headerSubtitle={homeData.headerSubtitle}
        onOpenSettings={() => setSettingsVisible(true)}
      />

      {/* Layer Overlay Milieu : Plays Status Container */}
      <PlaysPill 
        headerPlays={homeData.headerPlays}
        adLoaded={adLoaded}
        adSuccessLoading={adSuccessLoading}
        onShowAd={showAd}
        topOffset={playsPillTopOffset}
      />

      {/* Layer Action Coulissant (Bottom Sheet Custom) */}
      <ProgressionDrawer 
        quests={homeData.quests}
        questsLoading={homeData.questsLoading}
        profileId={homeData.profile?.id}
        rankIndex={homeData.rank?.index ?? 0}
        leaderboards={homeData.leaderboards}
        leaderboardsLoading={homeData.leaderboardsLoading}
        myRankings={homeData.myRankings}
        myRankingLoading={homeData.myRankingLoading}
      />

      {/* Modales Séparées */}
      <HomeSettingsModal 
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        onOpenAIInfo={() => setShowAIInfo(true)}
        onLogout={handleLogout}
        onDeleteAccount={homeData.profile?.id ? handleDeleteAccount : undefined}
        musicVolume={musicVolume}
        onMusicVolumeChange={setMusicVolume}
        musicEnabled={musicEnabled}
        onMusicEnabledChange={(next) => {
          setMusicEnabled(next).catch(() => {
            Alert.alert('Erreur', "Impossible de mettre à jour la musique.");
          });
        }}
      />

      <LeaderboardRewardModal
        visible={homeData.pendingRewards.length > 0 && !rewardModalDismissed}
        rewards={homeData.pendingRewards}
        onClaim={async () => {}}
        onClaimAll={async () => {
          await homeData.claimAll();
          await homeData.refreshPlaysInfo();
          setRewardModalDismissed(true);
        }}
        claiming={homeData.claiming}
        onClose={() => setRewardModalDismissed(true)}
      />

      <AIConsentModal visible={aiConsentGiven === false} onAccept={acceptConsent} />
      <AIConsentModal visible={showAIInfo} onAccept={() => setShowAIInfo(false)} infoOnly />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Fond sombre pour l'immersion
  },
  tutorialToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  tutorialToggleLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
});
