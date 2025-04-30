// lib/config/adConfig.ts
import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

// Récupérer la variable d'environnement définie dans eas.json
// Elle sera 'internalTesting', 'production', 'development', ou undefined si non définie/pas via EAS build
const APP_VARIANT = process.env.EXPO_PUBLIC_APP_VARIANT;

// Déterminer si on doit utiliser les IDs de test AdMob
// On utilise les IDs de test si:
// 1. On est en mode développement local (__DEV__ est true)
// OU
// 2. Le build a été fait avec le profil 'preview' (APP_VARIANT est 'internalTesting')
const USE_TEST_IDS = __DEV__ || APP_VARIANT === 'internalTesting';

// Log pour vérifier quelle configuration est utilisée (utile pour le débogage)
console.log(`[adConfig] Using Test Ads: ${USE_TEST_IDS} (Reason: __DEV__=${__DEV__}, APP_VARIANT=${APP_VARIANT})`);

// Identifiants des unités publicitaires de production (INCHANGÉ)
const PRODUCTION_AD_UNITS = {
  BANNER_HOME: 'ca-app-pub-7809209690404525/2401416565',
  INTERSTITIAL_GAME_OVER: 'ca-app-pub-7809209690404525/2263906247',
  INTERSTITIAL_GENERIC: 'ca-app-pub-7809209690404525/3617886191',
  INTERSTITIAL_LEVEL_UP: 'ca-app-pub-7809209690404525/5890695588',
  REWARDED_EXTRA_LIFE: 'ca-app-pub-7809209690404525/7365559514'
};

// Fonction qui renvoie l'identifiant approprié en fonction de la configuration (MODIFIÉE)
export const getAdUnitId = (type: keyof typeof PRODUCTION_AD_UNITS) => {
  if (USE_TEST_IDS) { // <-- Utilise la nouvelle logique
    // En développement OU pour le build de test interne, utiliser les identifiants de test
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
      default:
        // Fallback sur une bannière de test si le type est inconnu
        console.warn(`[adConfig] Unknown ad type "${type}" requested in test mode, returning TestIds.BANNER`);
        return TestIds.BANNER;
    }
  } else {
    // En production (build fait avec --profile production), utiliser les identifiants réels
    console.log(`[adConfig] Providing PRODUCTION AdUnitId for type: ${type}`);
    return PRODUCTION_AD_UNITS[type];
  }
};

// Optionnel: Exporter la constante si vous en avez besoin ailleurs (remplace l'ancien 'DEV')
export const IS_TEST_BUILD = USE_TEST_IDS;