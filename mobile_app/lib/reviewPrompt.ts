/************************************************************************************
 * reviewPrompt.ts
 *
 * Demande d'avis native (App Store / Google Play) après un moment de réussite.
 * Throttlée : au maximum 1 fois tous les 30 jours, et Apple/Play plafonnent
 * eux-mêmes l'affichage (~3 fois/an sur iOS).
 ************************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_REQUEST_KEY = '@timalaus/review_last_request';
const MIN_DAYS_BETWEEN_REQUESTS = 30;

// Le module natif ExpoStoreReview peut être absent des anciens dev-clients /
// Expo Go. On vérifie le registre natif expo (globalThis.expo.modules, le même
// que requireNativeModule utilise en interne) avant de charger le JS : ainsi
// l'import d'expo-store-review, qui lève l'erreur si le natif manque, n'a
// jamais lieu — pas de crash, pas d'ERROR dans Metro.
interface StoreReviewNative {
  isAvailableAsync?: () => Promise<boolean>;
  requestReview?: () => Promise<void>;
}

function getStoreReview(): StoreReviewNative | null {
  try {
    const registry = (globalThis as any)?.expo?.modules;
    if (registry && !registry.ExpoStoreReview) {
      if (__DEV__) console.log('[reviewPrompt] module natif absent de ce build');
      return null;
    }
    return require('expo-store-review');
  } catch {
    if (__DEV__) console.log('[reviewPrompt] module natif absent de ce build');
    return null;
  }
}

/**
 * Affiche la feuille d'avis native si le moment est opportun.
 * Silencieuse par design : ne doit jamais bloquer ni perturber le jeu.
 */
export async function maybeRequestReview(): Promise<void> {
  try {
    if (__DEV__) console.log('[reviewPrompt] déclenchement demandé');
    const StoreReview = getStoreReview();
    if (!StoreReview) return;

    const available = (await StoreReview.isAvailableAsync?.()) ?? false;
    if (!available) return;

    const last = await AsyncStorage.getItem(LAST_REQUEST_KEY);
    if (last && (Date.now() - Number(last)) / 86400000 < MIN_DAYS_BETWEEN_REQUESTS) return;

    await AsyncStorage.setItem(LAST_REQUEST_KEY, String(Date.now()));
    await StoreReview.requestReview?.();
  } catch {
    // La demande d'avis ne doit jamais faire échouer le jeu.
  }
}
