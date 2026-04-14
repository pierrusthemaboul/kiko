import { useRef, useState, useEffect, useCallback } from 'react';
import { useRewardedPlayAd } from '@/hooks/useRewardedPlayAd';
import { grantExtraPlayFromRewardedAd } from '@/hooks/usePendingRewardSync';
import { Logger } from '@/utils/logger';
import { RemoteLogger } from '@/lib/remoteLogger';

export function useHomeAdsFlow(
  profile: any,
  guestPlaysInfo: any,
  refreshPlaysInfo: () => Promise<void>
) {
  const [adSuccessLoading, setAdSuccessLoading] = useState(false);
  const grantProcessingRef = useRef(false);

  const profileRef = useRef(profile);
  const guestPlaysInfoRef = useRef(guestPlaysInfo);
  const refreshPlaysInfoRef = useRef(refreshPlaysInfo);

  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { guestPlaysInfoRef.current = guestPlaysInfo; }, [guestPlaysInfo]);
  useEffect(() => { refreshPlaysInfoRef.current = refreshPlaysInfo; }, [refreshPlaysInfo]);

  const handleRewardEarned = useCallback(async () => {
    if (grantProcessingRef.current) {
      RemoteLogger.warn('Ads', '⚠️ Grant already in progress, skipping duplicate');
      return;
    }
    grantProcessingRef.current = true;
    setAdSuccessLoading(true);

    try {
      const result = await grantExtraPlayFromRewardedAd({
        guestGrantExtraPlay: async () => {
          await guestPlaysInfoRef.current.grantExtraPlay();
        },
        refreshPlaysInfo: async () => {
          await refreshPlaysInfoRef.current();
        },
      });

      if (!result.ok) {
        RemoteLogger.error('Ads', `❌ extra play grant failed: ${result.message}`);
      }
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

  useEffect(() => {
    if (rewardEarned && !grantProcessingRef.current && !adSuccessLoading) {
      const timeout = setTimeout(() => {
        if (!grantProcessingRef.current) {
          resetReward();
        }
      }, 10000);
      return () => clearTimeout(timeout);
    }
  }, [rewardEarned, adSuccessLoading, resetReward]);

  return {
    adLoaded,
    adSuccessLoading,
    showAd
  };
}
