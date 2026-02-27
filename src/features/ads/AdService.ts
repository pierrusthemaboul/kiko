import { Alert } from 'react-native';
import type { RequestOptions } from 'react-native-google-mobile-ads';
import MobileAds, { type RequestConfiguration } from 'react-native-google-mobile-ads';

import { FirebaseAnalytics } from '@/lib/firebase';
import { getAdRequestOptions, getAdUnitId } from '@/lib/config/adConfig';
import { supabase } from '@/lib/supabase/supabaseClients';
import type { Database } from '@/lib/supabase/database.types';
import { Logger } from '@/utils/logger';
import { RemoteLogger } from '@/lib/remoteLogger';

export type AdUnitKey = Parameters<typeof getAdUnitId>[0];

export type BannerPlacement = 'HOME';

export type BannerConfig = {
  unitId: string;
  requestOptions: RequestOptions;
};

export type AdLoadError = {
  code: string;
  message: string;
};

export type ConsentResetFn = () => Promise<void>;

export type ConsentResetResult =
  | { ok: true }
  | { ok: false; message: string };

export type AdInitResult =
  | { ok: true; configuredTestDevices: boolean }
  | { ok: false; message: string };

export type GrantExtraPlayResult =
  | { ok: true; userType: 'registered' | 'guest' }
  | { ok: false; message: string };

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

type ProfilesSelectRow = Pick<Database['public']['Tables']['profiles']['Row'], 'parties_per_day'>;
type ProfilesUpdateRow = Database['public']['Tables']['profiles']['Update'];

type SupabasePostgrestError = { message: string };

type ProfilesSelectResult = {
  data: ProfilesSelectRow | null;
  error: SupabasePostgrestError | null;
};

type ProfilesUpdateResult = {
  error: SupabasePostgrestError | null;
};

function profilesRepo() {
  // Adaptation strict-typing: certains fichiers du repo déclenchent un `never` sur `.from('profiles')`
  // On garde un contrat minimal, sans `any`, et on limite le cast à cette frontière.
  const table = supabase.from('profiles') as unknown;

  return {
    async selectPartiesPerDayByUserId(userId: string): Promise<ProfilesSelectResult> {
      const builder = table as {
        select: (columns: string) => { eq: (col: string, value: string) => { single: () => Promise<ProfilesSelectResult> } };
      };
      return builder.select('parties_per_day').eq('id', userId).single();
    },

    async updatePartiesPerDayByUserId(userId: string, payload: ProfilesUpdateRow): Promise<ProfilesUpdateResult> {
      const builder = table as {
        update: (values: ProfilesUpdateRow) => { eq: (col: string, value: string) => Promise<ProfilesUpdateResult> };
      };
      return builder.update(payload).eq('id', userId);
    },
  };
}

export const AdService = {
  async initializeMobileAds(): Promise<AdInitResult> {
    if (mobileAdsInitPromise) return mobileAdsInitPromise;

    mobileAdsInitPromise = (async () => {
      try {
        await MobileAds().initialize();

        // Petit délai pour laisser le SDK se stabiliser (évite certains comportements non déterministes au cold start)
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
        unitId: getAdUnitId('BANNER_HOME'),
        requestOptions: buildRequestOptions(),
      };
    }

    return {
      unitId: getAdUnitId('BANNER_HOME'),
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
      const message = toErrorMessage(err);
      return { ok: false, message };
    }
  },

  showConsentErrorAlert(): void {
    Alert.alert(
      'Erreur',
      "Impossible de mettre à jour votre consentement pour le moment. Réessayez plus tard.",
    );
  },

  async grantExtraPlayFromRewardedAd(params: {
    guestGrantExtraPlay: () => Promise<void>;
    refreshPlaysInfo: () => Promise<void>;
  }): Promise<GrantExtraPlayResult> {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        await params.guestGrantExtraPlay();
        await params.refreshPlaysInfo();
        RemoteLogger.info('Ads', '✅ Guest extra play granted via rewarded ad');
        return { ok: true, userType: 'guest' };
      }

      type ProfilePlaysRow = { parties_per_day: number | null };

      const profiles = profilesRepo();

      let success = false;
      let lastErrorMessage = 'Unknown error';

      for (let attempt = 1; attempt <= 3 && !success; attempt++) {
        try {
          RemoteLogger.info('Ads', `🔄 Granting extra play for user ${authUser.id} (attempt ${attempt})`);

          const { data: freshProfile, error: fetchError } = await profiles.selectPartiesPerDayByUserId(authUser.id);

          if (fetchError) {
            lastErrorMessage = fetchError.message;
            RemoteLogger.error('Ads', `Attempt ${attempt}: Failed to fetch profile: ${fetchError.message}`);
            if (attempt < 3) {
              await delay(1000 * attempt);
              continue;
            }
            break;
          }

          const currentAllowed = freshProfile?.parties_per_day ?? 3;
          const newAllowed = currentAllowed + 1;

          const updatePayload: ProfilesUpdateRow = { parties_per_day: newAllowed };

          const { error: updateError } = await profiles.updatePartiesPerDayByUserId(authUser.id, updatePayload);

          if (updateError) {
            lastErrorMessage = updateError.message;
            RemoteLogger.error('Ads', `Attempt ${attempt}: Failed to update: ${updateError.message}`);
            if (attempt < 3) {
              await delay(1000 * attempt);
              continue;
            }
            break;
          }

          const { data: verifyProfile, error: verifyError } = await profiles.selectPartiesPerDayByUserId(authUser.id);

          if (verifyError) {
            lastErrorMessage = verifyError.message;
            RemoteLogger.warn('Ads', `Attempt ${attempt}: Verification fetch failed: ${verifyError.message}`);
          }

          const verifiedAllowed = verifyProfile?.parties_per_day ?? newAllowed;

          if (verifiedAllowed >= newAllowed) {
            success = true;
            RemoteLogger.info('Ads', `✅ Extra play granted & verified: ${currentAllowed} → ${newAllowed}`);
            FirebaseAnalytics.trackEvent('extra_play_granted', {
              source: 'rewarded_ad',
              user_id: authUser.id,
              old_allowed: currentAllowed,
              new_allowed: newAllowed,
              attempt,
            });
          } else {
            lastErrorMessage = `Verification failed (got ${verifiedAllowed}, expected >= ${newAllowed})`;
            RemoteLogger.warn('Ads', `Attempt ${attempt}: ${lastErrorMessage}`);
            if (attempt < 3) {
              await delay(1000 * attempt);
            }
          }
        } catch (attemptErr) {
          lastErrorMessage = toErrorMessage(attemptErr);
          RemoteLogger.error('Ads', `Attempt ${attempt} error: ${lastErrorMessage}`);
          if (attempt < 3) {
            await delay(1000 * attempt);
          }
        }
      }

      if (!success) {
        RemoteLogger.error('Ads', '❌ All 3 attempts to grant extra play failed');
        FirebaseAnalytics.trackEvent('extra_play_grant_failed', {
          user_id: authUser.id,
          reason: 'all_attempts_failed',
        });
        return { ok: false, message: lastErrorMessage };
      }

      await params.refreshPlaysInfo();
      return { ok: true, userType: 'registered' };
    } catch (err) {
      const message = toErrorMessage(err);
      Logger.error('Ads', 'Error in grantExtraPlayFromRewardedAd', err);
      RemoteLogger.error('Ads', `❌ grantExtraPlayFromRewardedAd error: ${message}`);
      return { ok: false, message };
    }
  },
};
