import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Alert, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase/supabaseClients';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseAnalytics } from '@/lib/firebase';

// Components
import AIConsentModal from '@/components/modals/AIConsentModal';
import LeaderboardRewardModal from '@/components/modals/LeaderboardRewardModal';
import { OdysseyHero } from '@/src/features/home/components/OdysseyHero';
import { HomeHeader } from '@/src/features/home/components/HomeHeader';
import { PlaysPill } from '@/src/features/home/components/PlaysPill';
import { ProgressionDrawer } from '@/src/features/home/components/ProgressionDrawer';
import { HomeSettingsModal } from '@/src/features/home/components/HomeSettingsModal';

// Hooks
import { useHomeData } from '@/src/features/home/hooks/useHomeData';
import { useHomeAdsFlow } from '@/src/features/home/hooks/useHomeAdsFlow';
import { useAIConsent } from '@/src/features/home/hooks/useAIConsent';

export default function Vue1() {
  const router = useRouter();

  // Custom Hooks qui encapsulent les logiques complexes
  const homeData = useHomeData();
  const { adLoaded, adSuccessLoading, showAd } = useHomeAdsFlow(
    homeData.profile,
    homeData.guestPlaysInfo,
    homeData.refreshPlaysInfo
  );
  const { aiConsentGiven, acceptConsent } = useAIConsent();

  // États UI Locaux
  const [showAIInfo, setShowAIInfo] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [rewardModalDismissed, setRewardModalDismissed] = useState(false);

  useEffect(() => {
    FirebaseAnalytics.screen('HomeClean', 'Vue1');
  }, []);

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Layer Principal : Odyssée Temporelle en Plein Écran */}
      <OdysseyHero 
        canPlay={homeData.canPlay} 
        onStart={handleStartClassic} 
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
});
