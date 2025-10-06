import { useState, useEffect, useCallback, useRef } from 'react';
import { InterstitialAd, RewardedAd, AdEventType, RewardedAdEventType } from 'react-native-google-mobile-ads';
import { getAdUnitId } from '@/lib/config/adConfig';
import { FirebaseAnalytics } from '@/lib/firebase';

const PRECISION_AD_LOG_ENABLED = (() => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      const flag = process.env.EXPO_PUBLIC_ADS_LOGS ?? process.env.ADS_DEBUG_LOGS;
      return flag === 'verbose';
    }
  } catch {}
  return false;
})();

const precisionAdLog = (level: 'log' | 'warn' | 'error', message: string, ...args: unknown[]) => {
  if (level === 'error') {
    console.error(`[PrecisionAds] ${message}`, ...args);
    return;
  }
  if (!PRECISION_AD_LOG_ENABLED) return;
  if (level === 'warn') {
    console.warn(`[PrecisionAds] ${message}`, ...args);
    return;
  }
  console.log(`[PrecisionAds] ${message}`, ...args);
};

// Instances des pubs pour le mode Précision
const gameOverInterstitial = InterstitialAd.createForAdRequest(
  getAdUnitId('INTERSTITIAL_PRECISION_GAME_OVER'),
  { requestNonPersonalizedAdsOnly: true }
);

const continueRewardedAd = RewardedAd.createForAdRequest(
  getAdUnitId('REWARDED_CONTINUE_PRECISION'),
  { requestNonPersonalizedAdsOnly: true }
);

interface PrecisionAdState {
  gameOverLoaded: boolean;
  continueLoaded: boolean;
  isShowingAd: boolean;
  hasContinued: boolean; // Si le joueur a déjà utilisé le continue
  continueRewardEarned: boolean;
}

export function usePrecisionAds() {
  const [adState, setAdState] = useState<PrecisionAdState>({
    gameOverLoaded: false,
    continueLoaded: false,
    isShowingAd: false,
    hasContinued: false,
    continueRewardEarned: false,
  });

  const continueRewardTimeRef = useRef(0);
  const processingContinueRef = useRef(false);

  useEffect(() => {
    // --- Game Over Interstitial Listeners ---
    const gameOverLoaded = gameOverInterstitial.addAdEventListener(
      AdEventType.LOADED,
      () => {
        precisionAdLog('log', 'Game Over Interstitial loaded');
        setAdState(prev => ({ ...prev, gameOverLoaded: true }));
        FirebaseAnalytics.ad('interstitial', 'loaded', 'precision_game_over', 0);
      }
    );

    const gameOverError = gameOverInterstitial.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        precisionAdLog('warn', 'Game Over failed to load:', error);
        setAdState(prev => ({ ...prev, gameOverLoaded: false }));
        FirebaseAnalytics.ad('interstitial', 'failed', 'precision_game_over', 0);
        setTimeout(() => gameOverInterstitial.load(), 30000);
      }
    );

    const gameOverOpened = gameOverInterstitial.addAdEventListener(
      AdEventType.OPENED,
      () => {
        precisionAdLog('log', 'Game Over Interstitial opened');
        setAdState(prev => ({ ...prev, isShowingAd: true }));
        FirebaseAnalytics.ad('interstitial', 'opened', 'precision_game_over', 0);
      }
    );

    const gameOverClosed = gameOverInterstitial.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        precisionAdLog('log', 'Game Over Interstitial closed');
        setAdState(prev => ({ ...prev, gameOverLoaded: false, isShowingAd: false }));
        gameOverInterstitial.load();
        FirebaseAnalytics.ad('interstitial', 'closed', 'precision_game_over', 0);
      }
    );

    // --- Continue Rewarded Ad Listeners ---
    const continueLoaded = continueRewardedAd.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        precisionAdLog('log', 'Continue Rewarded loaded');
        setAdState(prev => ({ ...prev, continueLoaded: true }));
        FirebaseAnalytics.ad('rewarded', 'loaded', 'precision_continue', 0);
      }
    );

    const continueError = continueRewardedAd.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        precisionAdLog('warn', 'Continue Rewarded failed to load:', error);
        setAdState(prev => ({ ...prev, continueLoaded: false }));
        FirebaseAnalytics.ad('rewarded', 'failed', 'precision_continue', 0);
        setTimeout(() => continueRewardedAd.load(), 30000);
      }
    );

    const continueOpened = continueRewardedAd.addAdEventListener(
      AdEventType.OPENED,
      () => {
        precisionAdLog('log', 'Continue Rewarded opened');
        setAdState(prev => ({ ...prev, isShowingAd: true, continueRewardEarned: false }));
        FirebaseAnalytics.ad('rewarded', 'opened', 'precision_continue', 0);
      }
    );

    const continueClosed = continueRewardedAd.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        precisionAdLog('log', 'Continue Rewarded closed');
        continueRewardTimeRef.current = Date.now();

        setAdState(prev => {
          if (prev.continueRewardEarned) {
            // Récompense gagnée
            return { ...prev, continueLoaded: false, isShowingAd: false, hasContinued: true };
          } else {
            // Pub fermée sans récompense
            FirebaseAnalytics.ad('rewarded', 'closed_without_reward', 'precision_continue', 0);
            return { ...prev, continueLoaded: false, isShowingAd: false };
          }
        });

        continueRewardedAd.load();
      }
    );

    const continueEarned = continueRewardedAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        precisionAdLog('log', 'Continue Reward earned:', reward);
        setAdState(prev => ({ ...prev, continueRewardEarned: true }));
        FirebaseAnalytics.ad('rewarded', 'earned_reward', 'precision_continue', 0);
        FirebaseAnalytics.reward('CONTINUE_PRECISION', 1, 'ad_reward', 'completed', 0, 0);
      }
    );

    // Chargement initial
    gameOverInterstitial.load();
    continueRewardedAd.load();

    return () => {
      gameOverLoaded();
      gameOverError();
      gameOverOpened();
      gameOverClosed();
      continueLoaded();
      continueError();
      continueOpened();
      continueClosed();
      continueEarned();
    };
  }, []);

  const showGameOverAd = useCallback(() => {
    if (!adState.gameOverLoaded) {
      precisionAdLog('warn', 'Game Over ad not loaded');
      return false;
    }
    if (adState.isShowingAd) {
      precisionAdLog('warn', 'Ad already showing');
      return false;
    }
    try {
      FirebaseAnalytics.ad('interstitial', 'triggered', 'precision_game_over', 0);
      gameOverInterstitial.show();
      return true;
    } catch (error) {
      precisionAdLog('error', 'Error showing game over ad:', error);
      FirebaseAnalytics.error('ad_show_error', error instanceof Error ? error.message : 'Unknown', 'usePrecisionAds');
      return false;
    }
  }, [adState.gameOverLoaded, adState.isShowingAd]);

  const showContinueAd = useCallback(() => {
    if (!adState.continueLoaded) {
      precisionAdLog('warn', 'Continue ad not loaded');
      return false;
    }
    if (adState.isShowingAd) {
      precisionAdLog('warn', 'Ad already showing');
      return false;
    }
    if (adState.hasContinued) {
      precisionAdLog('warn', 'Player already continued once');
      return false;
    }
    try {
      FirebaseAnalytics.ad('rewarded', 'triggered', 'precision_continue', 0);
      continueRewardTimeRef.current = 0;
      continueRewardedAd.show();
      return true;
    } catch (error) {
      precisionAdLog('error', 'Error showing continue ad:', error);
      FirebaseAnalytics.error('ad_show_error', error instanceof Error ? error.message : 'Unknown', 'usePrecisionAds');
      return false;
    }
  }, [adState.continueLoaded, adState.isShowingAd, adState.hasContinued]);

  const resetContinueReward = useCallback(() => {
    setAdState(prev => ({ ...prev, continueRewardEarned: false }));
    processingContinueRef.current = false;
  }, []);

  const resetAdsState = useCallback(() => {
    precisionAdLog('log', 'Resetting ads state for new game');
    setAdState({
      gameOverLoaded: false,
      continueLoaded: false,
      isShowingAd: false,
      hasContinued: false,
      continueRewardEarned: false,
    });

    try {
      gameOverInterstitial.load();
      continueRewardedAd.load();
    } catch (error) {
      precisionAdLog('error', 'Error reloading ads:', error);
    }
  }, []);

  return {
    adState: {
      gameOverLoaded: adState.gameOverLoaded,
      continueLoaded: adState.continueLoaded,
      isShowingAd: adState.isShowingAd,
      hasContinued: adState.hasContinued,
      continueRewardEarned: adState.continueRewardEarned,
    },
    showGameOverAd,
    showContinueAd,
    resetContinueReward,
    resetAdsState,
  };
}
