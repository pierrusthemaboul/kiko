import { Alert } from 'react-native';
import type { RequestOptions } from 'react-native-google-mobile-ads';
import MobileAds, { type RequestConfiguration } from 'react-native-google-mobile-ads';

import { FirebaseAnalytics } from '@/lib/firebase';
import { getAdRequestOptions, getAdUnitId } from '@/lib/config/adConfig';
import { AdTicketManager } from '@/src/features/ads/AdTicketManager';
import {
  AD_UNIT_IDS,
  type AdInitResult,
  type AdLoadError,
  type BannerPlacement,
  type ConsentResetFn,
  type ConsentResetResult,
} from '@/src/features/ads/AdConstants';

export type AdUnitKey = Parameters<typeof getAdUnitId>[0];

export type BannerConfig = {
  unitId: string;
  requestOptions: RequestOptions;
};

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Unknown error';
}

function buildRequestOptions(): RequestOptions {
  const opts = getAdRequestOptions();
  return {
    requestNonPersonalizedAdsOnly: !!opts.requestNonPersonalizedAdsOnly,
  };
}

let mobileAdsInitPromise: Promise<AdInitResult> | null = null;

async function delay(ms: number): Promise<void> {
  await new Promise<void>(resolve => setTimeout(resolve, ms));
}

export const AdService = {
  async initializeMobileAds(): Promise<AdInitResult> {
    if (mobileAdsInitPromise) return mobileAdsInitPromise;

    mobileAdsInitPromise = (async () => {
      try {
        await MobileAds().initialize();
        await delay(500);

        if (__DEV__) {
          const testDeviceIdentifiers = ['3D55CC0D2A3E4E6EB5D0F1231DE2E59C'];
          const requestConfig: RequestConfiguration = { testDeviceIdentifiers };
          try {
            await MobileAds().setRequestConfiguration(requestConfig);
            return { ok: true, configuredTestDevices: true };
          } catch (configError) {
            FirebaseAnalytics.trackError('admob_config_warning', {
              message: configError instanceof Error ? configError.message : 'Unknown request config error',
              screen: 'AdService MobileAds Setup',
              severity: 'warning',
            });
            return { ok: true, configuredTestDevices: false };
          }
        }

        return { ok: true, configuredTestDevices: false };
      } catch (err) {
        const message = toErrorMessage(err);
        FirebaseAnalytics.trackError('admob_init_error', {
          message,
          screen: 'AdService MobileAds Setup',
        });
        return { ok: false, message };
      }
    })();

    return mobileAdsInitPromise;
  },

  getBannerConfig(placement: BannerPlacement): BannerConfig {
    if (placement === 'HOME') {
      return {
        unitId: getAdUnitId(AD_UNIT_IDS.bannerHome),
        requestOptions: buildRequestOptions(),
      };
    }

    return {
      unitId: getAdUnitId(AD_UNIT_IDS.bannerHome),
      requestOptions: buildRequestOptions(),
    };
  },

  trackBannerLoaded(params: { placement: BannerPlacement }): void {
    FirebaseAnalytics.ad('banner', 'loaded', `${params.placement.toLowerCase()}_banner`, 0);
  },

  trackBannerFailed(params: { placement: BannerPlacement; error: AdLoadError }): void {
    FirebaseAnalytics.ad('banner', 'failed', `${params.placement.toLowerCase()}_banner`, 0);
    FirebaseAnalytics.trackError('ad_load_failed', {
      message: `Banner Ad Error: ${params.error.message} (Code: ${params.error.code})`,
      screen: 'HomeScreen',
      severity: 'warning',
    });
  },

  async resetConsentSafely(params: {
    resetConsent: ConsentResetFn;
    consentStatusLabel: string | null;
    fromScreen: string;
  }): Promise<ConsentResetResult> {
    FirebaseAnalytics.trackEvent('consent_manage_clicked', {
      from_screen: params.fromScreen,
      section: 'privacy',
      consent_status: params.consentStatusLabel ?? 'unknown',
    });

    try {
      await params.resetConsent();
      return { ok: true };
    } catch (err) {
      return { ok: false, message: toErrorMessage(err) };
    }
  },

  showConsentErrorAlert(): void {
    Alert.alert(
      'Erreur',
      "Impossible de mettre à jour votre consentement pour le moment. Réessayez plus tard.",
    );
  },

  async registerRewardAdOpened(): Promise<void> {
    await AdTicketManager.create({ status: 'watching' });
  },

  async registerRewardEarned(reason: 'earned' | 'fallback'): Promise<void> {
    const pending = await AdTicketManager.getPending();
    await AdTicketManager.create({
      status: 'earned_pending_sync',
      transactionId: pending?.id,
      reason,
    });
  },

  async registerRewardClosedWithoutReward(): Promise<void> {
    const pending = await AdTicketManager.getPending();
    if (!pending) return;

    await AdTicketManager.updateStatus({
      status: 'aborted',
      transactionId: pending.id,
      reason: 'closed_without_reward',
      lastError: 'closed_without_reward',
    });
    await AdTicketManager.clear(pending.id);
  },
};
