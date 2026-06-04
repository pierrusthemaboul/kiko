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
import { Platform, AppState } from 'react-native';
import { requestTrackingPermissionsAsync, getTrackingPermissionsAsync } from 'expo-tracking-transparency';

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
  const enumValues = Object.values(AdsConsentStatus as unknown as Record<string, unknown>);
  if (enumValues.includes(parsed as unknown)) return parsed as unknown as AdsConsentStatus;
  return null;
};

const requestTrackingPermissionsSafely = async (): Promise<string> => {
  if (Platform.OS !== 'ios') return 'not_applicable';

  try {
    const result = await requestTrackingPermissionsAsync();
    return result?.status ?? 'unavailable';
  } catch (attModuleError) {
    consentLog('warn', 'ExpoTrackingTransparency unavailable on this build', attModuleError);
    return 'unavailable';
  }
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

  // Demande d'autorisation ATT indépendante sur iOS
  // Améliorée pour s'assurer que la pop-up s'affiche correctement même en mode letterbox sur iPad
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let active = true;
    let retryCount = 0;
    const maxRetries = 2;

    const requestATT = async () => {
      if (!active) return;

      try {
        const currentStatus = await getTrackingPermissionsAsync();
        consentLog('log', 'Current ATT status before request:', currentStatus?.status);
        
        // Si déjà déterminé (authorized/denied), ne pas redemander
        if (currentStatus?.status === 'authorized' || currentStatus?.status === 'denied') {
          consentLog('log', 'ATT already determined, skipping request');
          FirebaseAnalytics.trackEvent('att_already_determined', { status: currentStatus.status });
          return;
        }

        consentLog('log', 'Independent ATT request started...');
        const result = await requestTrackingPermissionsAsync();
        consentLog('log', 'Independent ATT result status:', result?.status);
        FirebaseAnalytics.trackEvent('att_prompt_result', { status: result?.status ?? 'unknown', retry_count: retryCount });
      } catch (attError) {
        consentLog('error', 'Independent ATT request failed:', attError);
        FirebaseAnalytics.trackEvent('att_request_error', { error: String(attError), retry_count: retryCount });
        
        // Réessayer si erreur et qu'on n'a pas dépassé le nombre de tentatives
        if (retryCount < maxRetries) {
          retryCount++;
          consentLog('log', `Retrying ATT request (${retryCount}/${maxRetries})...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await requestATT();
        }
      }
    };

    (async () => {
      // Attendre que l'app soit active et stable
      // Délai augmenté à 3 secondes pour s'assurer que l'app est complètement chargée
      await new Promise((resolve) => setTimeout(resolve, 3000));
      
      // Vérifier que l'app est active avant de demander ATT
      if (AppState.currentState !== 'active') {
        consentLog('log', 'App not active, waiting for active state...');
        
        // Attendre que l'app devienne active
        const waitForActive = () => {
          return new Promise<void>((resolve) => {
            const subscription = AppState.addEventListener('change', (nextAppState) => {
              if (nextAppState === 'active') {
                subscription.remove();
                resolve();
              }
            });
            // Timeout de 5 secondes si l'app ne devient jamais active
            setTimeout(() => {
              subscription.remove();
              resolve();
            }, 5000);
          });
        };
        
        await waitForActive();
      }
      
      if (!active) return;
      consentLog('log', 'App is active, requesting ATT...');
      await requestATT();
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      // Sur iOS, on attend 1.5s pour s'assurer que la fenêtre de l'app est active
      // afin que la pop-up système ATT apparaisse correctement.
      if (Platform.OS === 'ios') {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      if (!active) return;
      try {
        await restoreConsent();
        await requestConsent('auto');
      } catch (autoError) {
        consentLog('warn', 'Automatic consent request failed', autoError);
      }
    })();
    return () => {
      active = false;
    };
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
