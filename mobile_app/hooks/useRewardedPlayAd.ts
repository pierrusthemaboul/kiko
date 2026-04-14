import { useState, useEffect, useCallback, useRef } from 'react';
import { RewardedAd, RewardedAdEventType, AdEventType } from 'react-native-google-mobile-ads';
import { getAdRequestOptions, getAdUnitId } from '@/lib/config/adConfig';
import { FirebaseAnalytics } from '@/lib/firebase';
import Constants from 'expo-constants';
import { Logger } from '@/utils/logger';
import { RemoteLogger } from '@/lib/remoteLogger';
import { AdService } from '@/src/features/ads/AdService';
import { AD_UNIT_IDS } from '@/src/features/ads/AdConstants';

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
  getAdUnitId(AD_UNIT_IDS.rewardedExtraPlay),
  getAdRequestOptions(),
);

// État global pour partager entre toutes les instances du hook
let globalIsLoaded = false;
let globalIsShowing = false;
let globalIsProcessing = false; // Verrou pour éviter les doublons de récompense
let globalAdStartTime = 0; // Heure de début de la pub
let globalRewardReceived = false; // Flag pour savoir si on a reçu la récompense
let globalCallbackFired = false; // Flag pour éviter double callback
const stateListeners = new Set<() => void>();

interface UseRewardedPlayAdOptions {
  onRewardEarned?: () => void;
}

export function useRewardedPlayAd(options?: UseRewardedPlayAdOptions) {
  const [isLoaded, setIsLoaded] = useState(globalIsLoaded);
  const [isShowing, setIsShowing] = useState(globalIsShowing);
  const [rewardEarned, setRewardEarned] = useState(false);

  // Stocker le callback dans une ref pour éviter les closures stale
  const onRewardEarnedRef = useRef<(() => void) | undefined>(options?.onRewardEarned);
  useEffect(() => {
    onRewardEarnedRef.current = options?.onRewardEarned;
  }, [options?.onRewardEarned]);

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
        RemoteLogger.error('Ads', `Failed to load ad: [${errorCode}] ${errorMessage}`);
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
        globalAdStartTime = Date.now();
        globalRewardReceived = false;
        globalCallbackFired = false;
        void AdService.registerRewardAdOpened();
        stateListeners.forEach(listener => listener());
        setRewardEarned(false);
        FirebaseAnalytics.ad('rewarded', 'opened', 'extra_play', 0);
      }
    );

    const closedListener = rewardedPlayAd.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        const duration = Math.round((Date.now() - globalAdStartTime) / 1000);
        rewardedLog('log', `Ad closed after ${duration}s`);

        // État natif modifié immédiatement
        globalIsLoaded = false;
        globalIsShowing = false;
        stateListeners.forEach(listener => listener());
        FirebaseAnalytics.ad('rewarded', 'closed', 'extra_play', 0);
        
        // Reload for next time
        rewardedPlayAd.load();

        // 🟢 CORRECTION: On retarde la décision d'octroi de 450ms
        // Cela laisse le temps à EARNED_REWARD d'arriver (comportement fréquent sur Android)
        setTimeout(() => {
          void (async () => {
          let shouldGrant = false;
          let ticketReason: 'earned' | 'fallback' | null = null;

          if (globalRewardReceived) {
            // Cas normal : EARNED_REWARD a été reçu
            shouldGrant = true;
            ticketReason = 'earned';
          } else if (duration >= 20) {
            // FALLBACK
            shouldGrant = true;
            ticketReason = 'fallback';
            globalRewardReceived = true;
            globalIsProcessing = true;
            RemoteLogger.warn('Ads', `Fallback reward applied after ad duration ${duration}s`, { duration });
            FirebaseAnalytics.trackEvent('ad_fallback_reward_granted', { duration });
          } else {
            await AdService.registerRewardClosedWithoutReward();
          }

          if (shouldGrant && ticketReason) {
            await AdService.registerRewardEarned(ticketReason);
          }

          // CRITICAL: Appeler le callback avec garantie
          if (shouldGrant && !globalCallbackFired) {
            globalCallbackFired = true;
            setRewardEarned(true); // Pour l'UI (indicateur de chargement)

            try {
              onRewardEarnedRef.current?.();
            } catch (err) {
              RemoteLogger.error('Ads', `onRewardEarned callback error: ${err instanceof Error ? err.message : String(err)}`);
            }
          }
          })();
        }, 450);
      }
    );

    const earnedListener = rewardedPlayAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        if (globalIsProcessing) {
          rewardedLog('warn', 'Reward already being processed, ignoring duplicate event');
          RemoteLogger.warn('Ads', 'Duplicate reward earned event ignored');
          return;
        }
        globalIsProcessing = true;
        globalRewardReceived = true;
        void AdService.registerRewardEarned('earned');
        rewardedLog('log', 'Reward earned:', reward);
        FirebaseAnalytics.ad('rewarded', 'earned_reward', 'extra_play', 0);
        FirebaseAnalytics.reward('EXTRA_PLAY', 1, 'ad_reward', 'completed', 0, 0);

        // Note: On ne set PAS rewardEarned ici et on n'appelle PAS le callback.
        // Tout se fait dans le CLOSED handler, qui est garanti de fire.
        // Cela évite les problèmes de timing où EARNED_REWARD fire avant CLOSED
        // et le state React ne propage pas correctement.
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
    // Vérifier l'instance native directement (plus fiable que le state React)
    if (!rewardedPlayAd.loaded) {
      rewardedLog('warn', 'Ad not loaded yet (native check)');
      // Tenter de recharger si pas en cours
      if (!globalIsShowing) {
        rewardedPlayAd.load();
      }
      return false;
    }
    if (globalIsShowing) {
      rewardedLog('warn', 'Ad already showing');
      return false;
    }
    try {
      // Réinitialiser les verrous avant de montrer une nouvelle pub
      globalIsProcessing = false;
      globalRewardReceived = false;
      globalCallbackFired = false;

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
    globalIsProcessing = false;
    globalCallbackFired = false;
  }, []);

  return {
    isLoaded,
    isShowing,
    rewardEarned,
    showAd,
    resetReward,
  };
}
