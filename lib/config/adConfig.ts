// lib/config/adConfig.ts
import Constants from 'expo-constants';
import { TestIds } from 'react-native-google-mobile-ads';

// Type assertion pour plus de sécurité avec TypeScript
interface AppExtraConfig {
  APP_VARIANT?: string; // Rendre optionnel pour gérer le cas où il ne serait pas défini
  // Ajoute ici d'autres propriétés de 'extra' si tu en as et veux y accéder de manière typée
}

// Récupérer la valeur APP_VARIANT injectée via app.config.js -> extra
// Le 'as any as AppExtraConfig' est une manière de typer l'objet 'extra' qui est 'any' par défaut.
const extraConfig = Constants.expoConfig?.extra as AppExtraConfig | undefined;
const APP_VARIANT = extraConfig?.APP_VARIANT;

// Déterminer si on doit utiliser les IDs de test AdMob
// On utilise les IDs de test si:
// 1. On est en mode développement local (__DEV__ est true)
// OU
// 2. Le build a été fait avec le profil 'preview' (APP_VARIANT est 'internalTesting' via eas.json -> app.config.js -> extra)
// OU
// 3. Si APP_VARIANT est 'development' (cas d'un 'expo start' local où EXPO_PUBLIC_APP_VARIANT n'est pas explicitement 'internalTesting' mais on veut quand même des tests)
const USE_TEST_IDS = __DEV__ || APP_VARIANT === 'internalTesting' || APP_VARIANT === 'development';

console.log(
  `[adConfig] Using Test Ads: ${USE_TEST_IDS} (Reason: __DEV__=${__DEV__}, APP_VARIANT via expo-constants=${APP_VARIANT})`
);

// Identifiants des unités publicitaires de production (INCHANGÉ)
const PRODUCTION_AD_UNITS = {
  BANNER_HOME: 'ca-app-pub-7809209690404525/2401416565',
  INTERSTITIAL_GAME_OVER: 'ca-app-pub-7809209690404525/2263906247',
  INTERSTITIAL_GENERIC: 'ca-app-pub-7809209690404525/3617886191',
  INTERSTITIAL_LEVEL_UP: 'ca-app-pub-7809209690404525/5890695588',
  REWARDED_EXTRA_LIFE: 'ca-app-pub-7809209690404525/7365559514'
};

// Fonction qui renvoie l'identifiant approprié en fonction de la configuration
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
      default:
        // Fallback sur une bannière de test si le type est inconnu
        // Il est bon de s'assurer que 'type' est toujours une clé valide,
        // mais un fallback est une sécurité.
        console.warn(`[adConfig] Unknown ad type "${String(type)}" requested in test mode, returning TestIds.BANNER`);
        return TestIds.BANNER;
    }
  } else {
    // En production (build fait avec --profile production, donc APP_VARIANT devrait être 'production'),
    // utiliser les identifiants réels.
    console.log(`[adConfig] Providing PRODUCTION AdUnitId for type: ${type}`);
    return PRODUCTION_AD_UNITS[type];
  }
};

// Optionnel: Exporter la constante si vous en avez besoin ailleurs
export const IS_TEST_BUILD = USE_TEST_IDS;

// Pour le débogage, tu peux aussi exporter APP_VARIANT pour l'afficher dans ton UI
export const CURRENT_APP_VARIANT = APP_VARIANT;