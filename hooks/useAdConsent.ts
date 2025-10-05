import { useEffect, useState, useCallback } from 'react';
import {
  AdsConsent,
  AdsConsentStatus,
  AdsConsentDebugGeography,
} from 'react-native-google-mobile-ads';

/**
 * Hook pour gérer le consentement RGPD (UMP - User Messaging Platform)
 *
 * Utilisation :
 * - Demande automatiquement le consentement au premier lancement
 * - Respecte le RGPD en Europe
 * - Permet des pubs personnalisées si consentement accepté
 */
export function useAdConsent() {
  const [consentStatus, setConsentStatus] = useState<AdsConsentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Demander le consentement
  const requestConsent = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Configuration pour le testing (à désactiver en production)
      const consentInfo = await AdsConsent.requestInfoUpdate({
        debugGeography: __DEV__
          ? AdsConsentDebugGeography.EEA // Simuler l'Europe en dev
          : AdsConsentDebugGeography.DISABLED,
        testDeviceIdentifiers: __DEV__ ? ['TEST_DEVICE_ID'] : [],
      });

      console.log('[AdConsent] Consent info:', {
        isConsentFormAvailable: consentInfo.isConsentFormAvailable,
        status: consentInfo.status,
      });

      // Si un formulaire de consentement est disponible et que le statut est REQUIRED
      if (
        consentInfo.isConsentFormAvailable &&
        consentInfo.status === AdsConsentStatus.REQUIRED
      ) {
        console.log('[AdConsent] Showing consent form...');
        const { status } = await AdsConsent.showForm();
        console.log('[AdConsent] Consent form result:', status);
        setConsentStatus(status);
      } else {
        // Pas besoin de formulaire (hors EU ou déjà donné)
        console.log('[AdConsent] No form needed, status:', consentInfo.status);
        setConsentStatus(consentInfo.status);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[AdConsent] Error requesting consent:', errorMessage);
      setError(errorMessage);
      // En cas d'erreur, on considère que le consentement n'est pas obtenu
      setConsentStatus(AdsConsentStatus.UNKNOWN);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Réinitialiser le consentement (pour testing ou si l'utilisateur veut changer d'avis)
  const resetConsent = useCallback(async () => {
    try {
      await AdsConsent.reset();
      console.log('[AdConsent] Consent reset');
      setConsentStatus(null);
      await requestConsent();
    } catch (err) {
      console.error('[AdConsent] Error resetting consent:', err);
    }
  }, [requestConsent]);

  // Demander le consentement au montage du hook
  useEffect(() => {
    requestConsent();
  }, [requestConsent]);

  // Déterminer si on peut afficher des pubs personnalisées
  const canShowPersonalizedAds = consentStatus === AdsConsentStatus.OBTAINED;

  return {
    consentStatus,
    isLoading,
    error,
    canShowPersonalizedAds,
    requestConsent,
    resetConsent,
  };
}
