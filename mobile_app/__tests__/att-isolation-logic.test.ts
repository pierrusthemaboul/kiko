import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { useAdConsent } from '../hooks/useAdConsent';
import { Platform } from 'react-native';

// Définir global.__DEV__ pour éviter les erreurs de référence durant le test
(global as any).__DEV__ = true;

// 1. Mock de React Native pour forcer Platform.OS = 'ios' sans charger le vrai module
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: (objs: any) => objs.ios,
  },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  },
}));

// 2. Mock des dépendances pour éviter les plantages hors-contexte
jest.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    multiGet: jest.fn().mockResolvedValue([[null, null], [null, null]]),
    multiSet: jest.fn().mockResolvedValue(null),
    multiRemove: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        EXPO_PUBLIC_ADS_LOGS: 'verbose',
      },
    },
  },
}));

const mockRequestTrackingPermissions = jest.fn().mockResolvedValue({ status: 'granted' });
const mockGetTrackingPermissions = jest.fn().mockResolvedValue({ status: 'undetermined' });
jest.mock('expo-tracking-transparency', () => ({
  requestTrackingPermissionsAsync: () => mockRequestTrackingPermissions(),
  getTrackingPermissionsAsync: () => mockGetTrackingPermissions(),
}));

const mockRequestInfoUpdate = jest.fn();
const mockShowForm = jest.fn();
const mockReset = jest.fn();
jest.mock('react-native-google-mobile-ads', () => ({
  AdsConsent: {
    requestInfoUpdate: () => mockRequestInfoUpdate(),
    showForm: () => mockShowForm(),
    reset: () => mockReset(),
  },
  AdsConsentStatus: {
    UNKNOWN: 0,
    REQUIRED: 1,
    NOT_REQUIRED: 2,
    OBTAINED: 3,
  },
  AdsConsentDebugGeography: {
    DISABLED: 0,
    EEA: 1,
    NOT_EEA: 2,
  },
}));

jest.mock('../lib/firebase', () => ({
  FirebaseAnalytics: {
    trackEvent: jest.fn(),
    setUserProps: jest.fn(),
  },
}));

jest.mock('../lib/config/adConfig', () => ({
  setAdPersonalization: jest.fn(),
}));

// Composant de test minimaliste qui consomme notre hook
function TestConsentComponent() {
  useAdConsent();
  return null;
}

describe('Test de robustesse de la pop-up ATT', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('La pop-up ATT doit s\'afficher indépendamment de l\'échec de Google AdMob', async () => {
    // A. Simuler un échec réseau complet d'AdMob (ce que fait le réseau sécurisé d'Apple)
    mockRequestInfoUpdate.mockRejectedValue(new Error('Network request failed'));

    // B. Rendre notre composant de test pour monter le hook
    let testRenderer;
    await act(async () => {
      testRenderer = renderer.create(React.createElement(TestConsentComponent));
    });

    // C. Avancer le temps de 3,5 secondes pour déclencher le timer indépendant de l'ATT (qui est à 3s désormais)
    await act(async () => {
      jest.advanceTimersByTime(3500);
    });

    // D. Vérifier que la pop-up d'autorisation ATT a bien été appelée
    expect(mockRequestTrackingPermissions).toHaveBeenCalled();
  });
});
