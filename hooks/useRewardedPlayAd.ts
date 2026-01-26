import { useState, useEffect, useCallback } from 'react';
import { RewardedAd, RewardedAdEventType, AdEventType } from 'react-native-google-mobile-ads';
import { getAdRequestOptions, getAdUnitId } from '@/lib/config/adConfig';
import { FirebaseAnalytics } from '@/lib/firebase';
import Constants from 'expo-constants';
import { Logger } from '@/utils/logger';

const ADS_LOG_ENABLED = (() => {
  try {
    const flag = Constants.expoConfig?.extra?.EXPO_PUBLIC_ADS_LOGS;
    return flag === 'verbose';
  } catch { }
  return false;
})();

const rewardedLog = (level: 'log' | 'warn' | 'error', message: string, ...args: unknown[]) => {
  if (level === 'error') {
    Logger.error('Ads', message, args);
    return;
  }
  if (!ADS_LOG_ENABLED) return;
  if (level === 'warn') {
    Logger.warn('Ads', message, args);
    return;
  }
  Logger.debug('Ads', message, args);
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
        const errorCode = (error as any)?.code ?? 'unknown_code';
        const errorMessage = error?.message ?? 'unknown_message';
        rewardedLog('warn', `Failed to load: [Code: ${errorCode}] ${errorMessage}`);
        globalIsLoaded = false;
        stateListeners.forEach(listener => listener());
        FirebaseAnalytics.trackEvent('ad_load_error_detailed', {
          ad_type: 'rewarded',
          ad_unit: 'extra_play',
          error_code: String(errorCode),
          error_message: errorMessage,
          level: 0,
        });
        FirebaseAnalytics.ad('rewarded', 'failed', 'extra_play', 0);
        FirebaseAnalytics.error('ad_load_error', `Rewarded Play Ad [${errorCode}]: ${errorMessage}`, 'useRewardedPlayAd');
        // Retry after 30s
        setTimeout(() => {
          FirebaseAnalytics.trackEvent('ad_load_attempt', {
            ad_type: 'rewarded',
            ad_unit: 'extra_play',
            trigger: 'retry_after_error',
            previous_error_code: String(errorCode),
            level: 0,
          });
          rewardedPlayAd.load();
        }, 30000);
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
    const loadIfNeeded = () => {
      if (!globalIsLoaded && !globalIsShowing) {
        try {
          rewardedLog('log', 'Attempting initial load');
          FirebaseAnalytics.trackEvent('ad_load_attempt', {
            ad_type: 'rewarded',
            ad_unit: 'extra_play',
            trigger: 'initial_load',
            level: 0,
          });
          rewardedPlayAd.load();
        } catch (error) {
          rewardedLog('log', 'Ad load error or already loading', error);
        }
      }
    };

    loadIfNeeded();

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
      FirebaseAnalytics.trackEvent('ad_show_attempt', {
        ad_type: 'rewarded',
        ad_unit: 'extra_play',
        is_loaded: true,
        level: 0,
      });
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
