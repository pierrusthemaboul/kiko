import { Alert } from 'react-native';

export const AdService = {
  async initializeMobileAds() {
    console.log('[AdService Web] Mock initialization');
    return { ok: true, configuredTestDevices: false };
  },

  getBannerConfig(placement: string) {
    return {
      unitId: 'mock-unit-id',
      requestOptions: {},
    };
  },

  trackBannerLoaded() {},
  trackBannerFailed() {},

  async resetConsentSafely() {
    return { ok: true };
  },

  showConsentErrorAlert() {
    Alert.alert('Web Mode', 'Les publicités ne sont pas disponibles sur le web.');
  },

  async registerRewardAdOpened() {},
  async registerRewardEarned() {},
  async registerRewardClosedWithoutReward() {},
};
