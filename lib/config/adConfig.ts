import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

// Définir si l'app est en mode développement
export const DEV = __DEV__;

// Identifiants des unités publicitaires de production
const PRODUCTION_AD_UNITS = {
  BANNER_HOME: 'ca-app-pub-7809209690404525/2401416565',
  INTERSTITIAL_GAME_OVER: 'ca-app-pub-7809209690404525/2263906247',
  INTERSTITIAL_GENERIC: 'ca-app-pub-7809209690404525/3617886191',
  INTERSTITIAL_LEVEL_UP: 'ca-app-pub-7809209690404525/5890695588',
  REWARDED_EXTRA_LIFE: 'ca-app-pub-7809209690404525/7365559514'
};

// Fonction qui renvoie l'identifiant approprié en fonction de l'environnement
export const getAdUnitId = (type: keyof typeof PRODUCTION_AD_UNITS) => {
  if (DEV) {
    // En développement, utiliser les identifiants de test
    switch (type) {
      case 'BANNER_HOME':
        return TestIds.BANNER;
      case 'INTERSTITIAL_GAME_OVER':
      case 'INTERSTITIAL_GENERIC':
      case 'INTERSTITIAL_LEVEL_UP':
        return TestIds.INTERSTITIAL;
      case 'REWARDED_EXTRA_LIFE':
        return TestIds.REWARDED;
      default:
        return TestIds.BANNER;
    }
  } else {
    // En production, utiliser les identifiants réels
    return PRODUCTION_AD_UNITS[type];
  }
};