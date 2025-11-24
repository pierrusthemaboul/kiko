import { useState, useEffect, useCallback, useRef } from 'react';
import { InterstitialAd, RewardedAd, AdEventType, RewardedAdEventType } from 'react-native-google-mobile-ads';
import { getAdRequestOptions, getAdUnitId } from '@/lib/config/adConfig';
import { FirebaseAnalytics } from '@/lib/firebase';
import Constants from 'expo-constants';

const ADS_LOG_ENABLED = (() => {
  try {
    const flag = Constants.expoConfig?.extra?.EXPO_PUBLIC_ADS_LOGS;
    return flag === 'verbose';
  } catch { }
  return false;
})();

const precisionAdLog = (level: 'log' | 'warn' | 'error', message: string, ...args: unknown[]) => {
  if (level === 'error') {
    return;
  }
  if (!ADS_LOG_ENABLED) return;
  if (level === 'warn') {
    return;
  }
};

// Instances des pubs pour le mode Précision
const gameOverInterstitial = InterstitialAd.createForAdRequest(
  getAdUnitId('INTERSTITIAL_PRECISION_GAME_OVER'),
  getAdRequestOptions(),
);

const continueRewardedAd = RewardedAd.createForAdRequest(
  getAdUnitId('REWARDED_CONTINUE_PRECISION'),
  getAdRequestOptions(),
);

interface PrecisionAdState {
  gameOverLoaded: boolean;
  continueLoaded: boolean;
  continueLoading: boolean; // Nouveau : indique si la pub est en train de charger
  isShowingAd: boolean;
  hasContinued: boolean; // Si le joueur a déjà utilisé le continue
  continueRewardEarned: boolean;
}

export function usePrecisionAds() {
  const [adState, setAdState] = useState<PrecisionAdState>({
    gameOverLoaded: false,
    continueLoaded: false,
    continueLoading: false,
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
        console.log('[PrecisionAds DIAG] ✅ Continue Rewarded ad LOADED!');
        precisionAdLog('log', 'Continue Rewarded loaded');
        setAdState(prev => ({ ...prev, continueLoaded: true, continueLoading: false }));
        FirebaseAnalytics.ad('rewarded', 'loaded', 'precision_continue', 0);
      }
    );

    const continueError = continueRewardedAd.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        console.error('[PrecisionAds DIAG] ❌ Continue Rewarded FAILED to load:', error);
        console.log('[PrecisionAds DIAG] Error details:', {
          message: error.message,
          code: error.code,
          domain: error.domain
        });
        precisionAdLog('warn', 'Continue Rewarded failed to load:', error);
        setAdState(prev => ({ ...prev, continueLoaded: false, continueLoading: false }));
        FirebaseAnalytics.ad('rewarded', 'failed', 'precision_continue', 0);
        // Retry plus rapidement (5s au lieu de 30s)
        setTimeout(() => {
          console.log('[PrecisionAds DIAG] 🔄 Retry: tentative de rechargement dans 5s...');
          setAdState(prev => ({ ...prev, continueLoading: true }));
          continueRewardedAd.load();
        }, 5000);
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
    console.log('[PrecisionAds DIAG] 🚀 Initialisation des pubs...');
    gameOverInterstitial.load();
    setAdState(prev => ({ ...prev, continueLoading: true }));
    console.log('[PrecisionAds DIAG] 📲 Chargement initial de la pub Continue...');
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
    // DIAGNOSTIC LOGS
    console.log('[PrecisionAds DIAG] showContinueAd appelé');
    console.log('[PrecisionAds DIAG] État actuel:', {
      continueLoaded: adState.continueLoaded,
      continueLoading: adState.continueLoading,
      isShowingAd: adState.isShowingAd,
      hasContinued: adState.hasContinued,
      nativeAdLoaded: continueRewardedAd.loaded
    });

    if (!adState.continueLoaded) {
      console.warn('[PrecisionAds DIAG] ❌ PROBLÈME: Continue ad not loaded');
      console.log('[PrecisionAds DIAG] Instance native loaded?', continueRewardedAd.loaded);
      console.log('[PrecisionAds DIAG] continueLoading?', adState.continueLoading);
      precisionAdLog('warn', 'Continue ad not loaded');
      return false;
    }
    if (adState.isShowingAd) {
      console.warn('[PrecisionAds DIAG] ❌ PROBLÈME: Ad already showing');
      precisionAdLog('warn', 'Ad already showing');
      return false;
    }
    if (adState.hasContinued) {
      console.warn('[PrecisionAds DIAG] ❌ PROBLÈME: Player already continued once');
      precisionAdLog('warn', 'Player already continued once');
      return false;
    }
    try {
      console.log('[PrecisionAds DIAG] ✅ Tentative d\'affichage de la pub...');
      FirebaseAnalytics.ad('rewarded', 'triggered', 'precision_continue', 0);
      continueRewardTimeRef.current = 0;
      continueRewardedAd.show();
      console.log('[PrecisionAds DIAG] ✅ show() appelé avec succès');
      return true;
    } catch (error) {
      console.error('[PrecisionAds DIAG] ❌ ERREUR lors du show():', error);
      precisionAdLog('error', 'Error showing continue ad:', error);
      FirebaseAnalytics.error('ad_show_error', error instanceof Error ? error.message : 'Unknown', 'usePrecisionAds');
      return false;
    }
  }, [adState.continueLoaded, adState.isShowingAd, adState.hasContinued, adState.continueLoading]);

  const resetContinueReward = useCallback(() => {
    setAdState(prev => ({ ...prev, continueRewardEarned: false }));
    processingContinueRef.current = false;
  }, []);

  const resetAdsState = useCallback(() => {
    precisionAdLog('log', 'Resetting ads state for new game');
    setAdState({
      gameOverLoaded: false,
      continueLoaded: false,
      continueLoading: true, // Mise directement à true ici
      isShowingAd: false,
      hasContinued: false,
      continueRewardEarned: false,
    });

    try {
      gameOverInterstitial.load();
      continueRewardedAd.load();
    } catch (error) {
      precisionAdLog('error', 'Error reloading ads:', error);
      setAdState(prev => ({ ...prev, continueLoading: false }));
    }
  }, []);

  const forceContinueAdLoad = useCallback(() => {
    console.log('[PrecisionAds DIAG] forceContinueAdLoad appelé');
    console.log('[PrecisionAds DIAG] État avant force load:', {
      continueLoaded: adState.continueLoaded,
      isShowingAd: adState.isShowingAd,
      continueLoading: adState.continueLoading
    });

    if (adState.continueLoaded || adState.isShowingAd || adState.continueLoading) {
      console.log('[PrecisionAds DIAG] ⏭ Skip force load: déjà loaded/showing/loading');
      precisionAdLog('log', 'Continue ad already loaded, showing, or loading');
      return;
    }
    try {
      console.log('[PrecisionAds DIAG] 🔄 Force loading continue ad...');
      precisionAdLog('log', 'Force loading continue ad');
      setAdState(prev => ({ ...prev, continueLoading: true }));
      continueRewardedAd.load();
    } catch (error) {
      console.error('[PrecisionAds DIAG] ❌ Error force loading:', error);
      precisionAdLog('error', 'Error force loading continue ad:', error);
      setAdState(prev => ({ ...prev, continueLoading: false }));
    }
  }, [adState.continueLoaded, adState.isShowingAd, adState.continueLoading]);

  return {
    adState: {
      gameOverLoaded: adState.gameOverLoaded,
      continueLoaded: adState.continueLoaded,
      continueLoading: adState.continueLoading,
      isShowingAd: adState.isShowingAd,
      hasContinued: adState.hasContinued,
      continueRewardEarned: adState.continueRewardEarned,
    },
    showGameOverAd,
    showContinueAd,
    resetContinueReward,
    resetAdsState,
    forceContinueAdLoad,
  };
}
