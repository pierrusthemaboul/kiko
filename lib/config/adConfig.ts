// lib/config/adConfig.ts
import { TestIds } from 'react-native-google-mobile-ads';

// Récupération automatique du profil de build EAS (preview, production, etc.)
const BUILD_PROFILE = process.env.EAS_BUILD_PROFILE;

// On force les TestIds si on est en DEV, ou en preview, ou si on a explicitement passé APP_VARIANT=internalTesting
const USE_TEST_IDS =
  __DEV__ ||
  BUILD_PROFILE === 'preview' ||
  process.env.EXPO_PUBLIC_APP_VARIANT === 'internalTesting';

console.log(
  `[adConfig] Using Test Ads: ${USE_TEST_IDS}`
  + ` (DEV=${__DEV__}, EAS_PROFILE=${BUILD_PROFILE}, APP_VARIANT=${process.env.EXPO_PUBLIC_APP_VARIANT})`
);

// Tes vrais IDs de prod
const PRODUCTION_AD_UNITS = {
  BANNER_HOME: 'ca-app-pub-7809209690404525/2401416565',
  INTERSTITIAL_GAME_OVER: 'ca-app-pub-7809209690404525/2263906247',
  INTERSTITIAL_GENERIC: 'ca-app-pub-7809209690404525/3617886191',
  INTERSTITIAL_LEVEL_UP: 'ca-app-pub-7809209690404525/5890695588',
  REWARDED_EXTRA_LIFE: 'ca-app-pub-7809209690404525/7365559514',
};

export const getAdUnitId = (type: keyof typeof PRODUCTION_AD_UNITS): string => {
  if (USE_TEST_IDS) {
    console.log(`[adConfig] Providing TEST AdUnitId for type: ${type}`);
    switch (type) {
      case 'BANNER_HOME':
        return TestIds.BANNER;
      case 'INTERSTITIAL_GAME_OVER':
      case 'INTERSTITIAL_GENERIC':
      case 'INTERSTITIAL_LEVEL_UP':
        return TestIds.INTERSTITIAL;
      case 'REWARDED_EXTRA_LIFE':
        return TestIds.REWARDED;
    }
    // Fallback
    return TestIds.BANNER;
  } else {
    console.log(`[adConfig] Providing PRODUCTION AdUnitId for type: ${type}`);
    return PRODUCTION_AD_UNITS[type];
  }
};

export const IS_TEST_BUILD = USE_TEST_IDS;
