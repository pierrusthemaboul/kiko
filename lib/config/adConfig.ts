// lib/config/adConfig.ts
import { TestIds } from 'react-native-google-mobile-ads';
import Constants from 'expo-constants';

const USE_TEST_IDS = __DEV__;
// Logs activés uniquement si EXPO_PUBLIC_AD_CONFIG_LOGS=verbose
const AD_CONFIG_LOG_ENABLED = (() => {
  try {
    const flag = Constants.expoConfig?.extra?.EXPO_PUBLIC_AD_CONFIG_LOGS;
    return flag === 'verbose';
  } catch { }
  return false;
})();

// Variable globale pour stocker le consentement
let _canShowPersonalizedAds = false;

export function setAdPersonalization(canPersonalize: boolean) {
  _canShowPersonalizedAds = canPersonalize;
  if (AD_CONFIG_LOG_ENABLED) {
    console.log('[adConfig] Ad personalization:', canPersonalize ? 'ENABLED' : 'DISABLED');
  }
}

export function getAdRequestOptions() {
  return {
    requestNonPersonalizedAdsOnly: !_canShowPersonalizedAds,
  };
}

// Tes vrais IDs de prod
const PRODUCTION_AD_UNITS = {
  BANNER_HOME: 'ca-app-pub-7809209690404525/2401416565',
  INTERSTITIAL_GAME_OVER: 'ca-app-pub-7809209690404525/2263906247',
  INTERSTITIAL_LEVEL_UP: 'ca-app-pub-7809209690404525/5890695588',
  REWARDED_EXTRA_LIFE: 'ca-app-pub-7809209690404525/7365559514',
  REWARDED_EXTRA_PLAY: 'ca-app-pub-7809209690404525/9909124779',
  INTERSTITIAL_PRECISION_GAME_OVER: 'ca-app-pub-7809209690404525/9234461062',
  REWARDED_CONTINUE_PRECISION: 'ca-app-pub-7809209690404525/2884675132',
  // Fallback generic interstitial (uses GAME_OVER ID)
  INTERSTITIAL_GENERIC: 'ca-app-pub-7809209690404525/2263906247',
};

export const getAdUnitId = (type: keyof typeof PRODUCTION_AD_UNITS): string => {
  if (USE_TEST_IDS) {
    // console.log(`[adConfig] Providing TEST AdUnitId for type: ${type}`);
    switch (type) {
      case 'BANNER_HOME':
        return TestIds.BANNER;
      case 'INTERSTITIAL_GAME_OVER':
      case 'INTERSTITIAL_LEVEL_UP':
      case 'INTERSTITIAL_PRECISION_GAME_OVER':
      case 'INTERSTITIAL_GENERIC':
        return TestIds.INTERSTITIAL;
      case 'REWARDED_EXTRA_LIFE':
      case 'REWARDED_EXTRA_PLAY':
      case 'REWARDED_CONTINUE_PRECISION':
        return TestIds.REWARDED;
    }
    // Fallback
    return TestIds.BANNER;
  } else {
    // console.log(`[adConfig] Providing PRODUCTION AdUnitId for type: ${type}`);
    return PRODUCTION_AD_UNITS[type];
  }
};

export const IS_TEST_BUILD = USE_TEST_IDS;
