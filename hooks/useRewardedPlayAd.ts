import { useState, useEffect, useCallback } from 'react';
import { RewardedAd, RewardedAdEventType, AdEventType } from 'react-native-google-mobile-ads';
import { getAdUnitId } from '@/lib/config/adConfig';
import { FirebaseAnalytics } from '@/lib/firebase';

const rewardedPlayAd = RewardedAd.createForAdRequest(
  getAdUnitId('REWARDED_EXTRA_PLAY'),
  { requestNonPersonalizedAdsOnly: true }
);

export function useRewardedPlayAd() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isShowing, setIsShowing] = useState(false);
  const [rewardEarned, setRewardEarned] = useState(false);

  useEffect(() => {
    const loadedListener = rewardedPlayAd.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        console.log('[RewardedPlayAd] Ad loaded');
        setIsLoaded(true);
        FirebaseAnalytics.ad('rewarded', 'loaded', 'extra_play', 0);
      }
    );

    const errorListener = rewardedPlayAd.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        console.warn('[RewardedPlayAd] Failed to load:', error);
        setIsLoaded(false);
        FirebaseAnalytics.ad('rewarded', 'failed', 'extra_play', 0);
        // Retry after 30s
        setTimeout(() => rewardedPlayAd.load(), 30000);
      }
    );

    const openedListener = rewardedPlayAd.addAdEventListener(
      AdEventType.OPENED,
      () => {
        console.log('[RewardedPlayAd] Ad opened');
        setIsShowing(true);
        setRewardEarned(false);
        FirebaseAnalytics.ad('rewarded', 'opened', 'extra_play', 0);
      }
    );

    const closedListener = rewardedPlayAd.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        console.log('[RewardedPlayAd] Ad closed');
        setIsLoaded(false);
        setIsShowing(false);
        FirebaseAnalytics.ad('rewarded', 'closed', 'extra_play', 0);
        // Reload for next time
        rewardedPlayAd.load();
      }
    );

    const earnedListener = rewardedPlayAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        console.log('[RewardedPlayAd] Reward earned:', reward);
        setRewardEarned(true);
        FirebaseAnalytics.ad('rewarded', 'earned_reward', 'extra_play', 0);
        FirebaseAnalytics.reward('EXTRA_PLAY', 1, 'ad_reward', 'completed', 0, 0);
      }
    );

    // Load initial ad
    rewardedPlayAd.load();

    return () => {
      loadedListener();
      errorListener();
      openedListener();
      closedListener();
      earnedListener();
    };
  }, []);

  const showAd = useCallback(() => {
    if (!isLoaded) {
      console.warn('[RewardedPlayAd] Ad not loaded yet');
      return false;
    }
    if (isShowing) {
      console.warn('[RewardedPlayAd] Ad already showing');
      return false;
    }
    try {
      FirebaseAnalytics.ad('rewarded', 'triggered', 'extra_play', 0);
      rewardedPlayAd.show();
      return true;
    } catch (error) {
      console.error('[RewardedPlayAd] Error showing ad:', error);
      FirebaseAnalytics.error('ad_show_error', error instanceof Error ? error.message : 'Unknown', 'useRewardedPlayAd');
      return false;
    }
  }, [isLoaded, isShowing]);

  const resetReward = useCallback(() => {
    setRewardEarned(false);
  }, []);

  return {
    isLoaded,
    isShowing,
    rewardEarned,
    showAd,
    resetReward,
  };
}
