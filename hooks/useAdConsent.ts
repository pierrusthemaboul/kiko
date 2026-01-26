import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AdsConsent,
  AdsConsentStatus,
  AdsConsentDebugGeography,
} from 'react-native-google-mobile-ads';
import { FirebaseAnalytics } from '../lib/firebase';
import { setAdPersonalization } from '../lib/config/adConfig';
import Constants from 'expo-constants';

const AD_CONSENT_LOG_ENABLED = (() => {
  try {
    const flag = Constants.expoConfig?.extra?.EXPO_PUBLIC_ADS_LOGS;
    return flag === 'verbose';
  } catch { }
  return false;
})();

const STORAGE_STATUS_KEY = '@ad_consent_status';
const STORAGE_PERSONALIZED_KEY = '@ad_can_personalize';

const consentLog = (level: 'log' | 'warn' | 'error', message: string, ...args: unknown[]) => {
  if (level === 'error') {
    console.error(`[AdConsent] ${message}`, ...args);
    return;
  }
  if (!AD_CONSENT_LOG_ENABLED) return;
  if (level === 'warn') {
    console.warn(`[AdConsent] ${message}`, ...args);
    return;
  }
  console.log(`[AdConsent] ${message}`, ...args);
};

const consentStatusLabel = (status: AdsConsentStatus | null) => {
  switch (status) {
    case AdsConsentStatus.OBTAINED:
      return 'obtained';
    case AdsConsentStatus.REQUIRED:
      return 'required';
    case AdsConsentStatus.NOT_REQUIRED:
      return 'not_required';
    case AdsConsentStatus.UNKNOWN:
    default:
      return 'unknown';
  }
};

const toStorageValue = (status: AdsConsentStatus) => String(status);

const fromStorageValue = (value: string | null): AdsConsentStatus | null => {
  if (!value) return null;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;
  if (parsed in AdsConsentStatus) return parsed as AdsConsentStatus;
  return null;
};

export function useAdConsent() {
  const [consentStatus, setConsentStatus] = useState<AdsConsentStatus | null>(null);
  const [canShowPersonalizedAds, setCanShowPersonalizedAds] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousStatusRef = useRef<AdsConsentStatus | null>(null);

  const persistConsent = useCallback(async (status: AdsConsentStatus, personalized: boolean) => {
    await AsyncStorage.multiSet([
      [STORAGE_STATUS_KEY, toStorageValue(status)],
      [STORAGE_PERSONALIZED_KEY, personalized ? 'true' : 'false'],
    ]);
  }, []);

  const broadcastStatus = useCallback(
    async (status: AdsConsentStatus, source: 'restore' | 'update', forceEmit = false) => {
      const personalized = status === AdsConsentStatus.OBTAINED;
      setConsentStatus(status);
      setCanShowPersonalizedAds(personalized);
      setAdPersonalization(personalized);
      await persistConsent(status, personalized);

      const previous = previousStatusRef.current;
      const shouldEmit = forceEmit || source === 'restore' || previous !== status;
      if (shouldEmit) {
        FirebaseAnalytics.trackEvent('consent_status_updated', {
          status: consentStatusLabel(status),
          can_show_personalized_ads: personalized,
          source,
        });
        FirebaseAnalytics.setUserProps({ has_personalized_ads: personalized ? 'true' : 'false' });
      }
      previousStatusRef.current = status;
    },
    [persistConsent],
  );

  const restoreConsent = useCallback(async () => {
    try {
      const entries = await AsyncStorage.multiGet([STORAGE_STATUS_KEY, STORAGE_PERSONALIZED_KEY]);
      const storedStatus = fromStorageValue(entries[0]?.[1] ?? null);
      if (storedStatus !== null) {
        await broadcastStatus(storedStatus, 'restore');
        return;
      }
      const storedPersonalized = entries[1]?.[1] === 'true';
      setCanShowPersonalizedAds(storedPersonalized);
      setAdPersonalization(storedPersonalized);
      if (storedPersonalized) {
        FirebaseAnalytics.setUserProps({ has_personalized_ads: 'true' });
      }
    } catch (restoreError) {
      consentLog('warn', 'Failed to restore consent from storage', restoreError);
    }
  }, [broadcastStatus]);

  const requestConsent = useCallback(
    async (origin: 'auto' | 'manual' = 'auto'): Promise<AdsConsentStatus> => {
      try {
        setIsLoading(true);
        setError(null);

        const consentInfo = await AdsConsent.requestInfoUpdate({
          debugGeography: __DEV__ ? AdsConsentDebugGeography.EEA : AdsConsentDebugGeography.DISABLED,
          testDeviceIdentifiers: __DEV__ ? ['TEST_DEVICE_ID'] : [],
        });

        consentLog('log', 'Consent info', consentInfo);

        if (consentInfo.isConsentFormAvailable && consentInfo.status === AdsConsentStatus.REQUIRED) {
          FirebaseAnalytics.trackEvent('consent_form_shown', {
            status: consentStatusLabel(consentInfo.status),
            source: origin,
          });
          const { status } = await AdsConsent.showForm();
          consentLog('log', 'Consent form result', status);
          await broadcastStatus(status, 'update', origin === 'manual');
          return status;
        }
        await broadcastStatus(consentInfo.status, 'update', origin === 'manual');
        return consentInfo.status;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        consentLog('error', 'Error requesting consent', message);
        setError(message);
        FirebaseAnalytics.trackEvent('consent_form_error', {
          status: consentStatusLabel(consentStatus),
          error_code: message,
        });
        await broadcastStatus(AdsConsentStatus.UNKNOWN, 'update', origin === 'manual');
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [broadcastStatus, consentStatus],
  );

  const resetConsent = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      await AdsConsent.reset();
      await AsyncStorage.multiRemove([STORAGE_STATUS_KEY, STORAGE_PERSONALIZED_KEY]);
      previousStatusRef.current = null;
      consentLog('log', 'Consent reset');
      await requestConsent('manual');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      consentLog('error', 'Error resetting consent', message);
      setError(message);
      setIsLoading(false);
      throw err instanceof Error ? err : new Error(message);
    }
  }, [requestConsent]);

  useEffect(() => {
    (async () => {
      try {
        await restoreConsent();
        await requestConsent('auto');
      } catch (autoError) {
        consentLog('warn', 'Automatic consent request failed', autoError);
      }
    })();
  }, [restoreConsent, requestConsent]);

  const statusLabel = useMemo(() => consentStatusLabel(consentStatus), [consentStatus]);

  return {
    consentStatus,
    consentStatusLabel: statusLabel,
    isLoading,
    error,
    canShowPersonalizedAds,
    requestConsent,
    resetConsent,
  };
}
