import { useState, useEffect, useCallback } from 'react';
import { RewardedAd, RewardedAdEventType, AdEventType } from 'react-native-google-mobile-ads';
import { getAdRequestOptions, getAdUnitId } from '@/lib/config/adConfig';
import { FirebaseAnalytics } from '@/lib/firebase';

const REWARDED_PLAY_LOG_ENABLED = (() => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      const flag = process.env.EXPO_PUBLIC_ADS_LOGS ?? process.env.ADS_DEBUG_LOGS;
      return flag === 'verbose';
    }
  } catch {}
  return false;
})();

const rewardedLog = (level: 'log' | 'warn' | 'error', message: string, ...args: unknown[]) => {
  if (level === 'error') {
    console.error(`[RewardedPlayAd] ${message}`, ...args);
    return;
  }
  if (!REWARDED_PLAY_LOG_ENABLED) return;
  if (level === 'warn') {
    console.warn(`[RewardedPlayAd] ${message}`, ...args);
    return;
  }
  console.log(`[RewardedPlayAd] ${message}`, ...args);
};

const rewardedPlayAd = RewardedAd.createForAdRequest(
  getAdUnitId('REWARDED_EXTRA_PLAY'),
  getAdRequestOptions(),
);

// État global pour partager entre toutes les instances du hook
let globalIsLoaded = false;
let globalIsShowing = false;
const stateListeners = new Set<() => void>();

export function useRewardedPlayAd() {
  const [isLoaded, setIsLoaded] = useState(globalIsLoaded);
  const [isShowing, setIsShowing] = useState(globalIsShowing);
  const [rewardEarned, setRewardEarned] = useState(false);

  useEffect(() => {
    // Sync with global state on mount
    setIsLoaded(globalIsLoaded);
    setIsShowing(globalIsShowing);

    // Subscribe to state changes
    const updateState = () => {
      setIsLoaded(globalIsLoaded);
      setIsShowing(globalIsShowing);
    };
    stateListeners.add(updateState);

    const loadedListener = rewardedPlayAd.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        rewardedLog('log', 'Ad loaded');
        globalIsLoaded = true;
        stateListeners.forEach(listener => listener());
        FirebaseAnalytics.ad('rewarded', 'loaded', 'extra_play', 0);
      }
    );

    const errorListener = rewardedPlayAd.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        rewardedLog('warn', 'Failed to load:', error);
        globalIsLoaded = false;
        stateListeners.forEach(listener => listener());
        FirebaseAnalytics.ad('rewarded', 'failed', 'extra_play', 0);
        // Retry after 30s
        setTimeout(() => rewardedPlayAd.load(), 30000);
      }
    );

    const openedListener = rewardedPlayAd.addAdEventListener(
      AdEventType.OPENED,
      () => {
        rewardedLog('log', 'Ad opened');
        globalIsShowing = true;
        stateListeners.forEach(listener => listener());
        setRewardEarned(false);
        FirebaseAnalytics.ad('rewarded', 'opened', 'extra_play', 0);
      }
    );

    const closedListener = rewardedPlayAd.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        rewardedLog('log', 'Ad closed');
        globalIsLoaded = false;
        globalIsShowing = false;
        stateListeners.forEach(listener => listener());
        FirebaseAnalytics.ad('rewarded', 'closed', 'extra_play', 0);
        // Reload for next time
        rewardedPlayAd.load();
      }
    );

    const earnedListener = rewardedPlayAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        rewardedLog('log', 'Reward earned:', reward);
        setRewardEarned(true);
        FirebaseAnalytics.ad('rewarded', 'earned_reward', 'extra_play', 0);
        FirebaseAnalytics.reward('EXTRA_PLAY', 1, 'ad_reward', 'completed', 0, 0);
      }
    );

    // Try to load the ad, but it may already be loaded or loading
    // The load() method is safe to call even if already loading
    try {
      rewardedPlayAd.load();
    } catch (error) {
      // Ignore if already loading
      rewardedLog('log', 'Ad already loading or loaded');
    }

    return () => {
      stateListeners.delete(updateState);
      loadedListener();
      errorListener();
      openedListener();
      closedListener();
      earnedListener();
    };
  }, []);

  const showAd = useCallback(() => {
    if (!isLoaded) {
      rewardedLog('warn', 'Ad not loaded yet');
      return false;
    }
    if (isShowing) {
      rewardedLog('warn', 'Ad already showing');
      return false;
    }
    try {
      FirebaseAnalytics.ad('rewarded', 'triggered', 'extra_play', 0);
      rewardedPlayAd.show();
      return true;
    } catch (error) {
      rewardedLog('error', 'Error showing ad:', error);
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
