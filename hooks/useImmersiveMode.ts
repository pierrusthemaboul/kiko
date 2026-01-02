import { useEffect, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';

/**
 * Hook pour activer le mode immersif (plein écran) sur Android
 * Masque automatiquement les barres système (navigation bar et status bar)
 * et les réapplique quand l'utilisateur les fait réapparaître
 */
export function useImmersiveMode(enabled: boolean = true) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') {
      return;
    }

    const applyImmersiveMode = async () => {
      try {
        console.log('[useImmersiveMode] 🔄 Application du mode immersif...');

        // Configuration de la status bar (transparente et translucide)
        await SystemUI.setBackgroundColorAsync('transparent');
        console.log('[useImmersiveMode] ✅ SystemUI background set');

        // Masquer complètement la navigation bar
        await NavigationBar.setVisibilityAsync('hidden');
        console.log('[useImmersiveMode] ✅ Navigation bar hidden');

        await NavigationBar.setBehaviorAsync('inset-swipe');
        console.log('[useImmersiveMode] ✅ Behavior set to inset-swipe');

        await NavigationBar.setBackgroundColorAsync('#000000');
        console.log('[useImmersiveMode] ✅ Background color set');

        await NavigationBar.setPositionAsync('absolute');
        console.log('[useImmersiveMode] ✅ Position set to absolute');

        console.log('[useImmersiveMode] ✅ Mode immersif appliqué avec succès');
      } catch (error) {
        console.error('[useImmersiveMode] ❌ Erreur lors de l\'application du mode immersif:', error);
      }
    };

    // Appliquer immédiatement
    applyImmersiveMode();

    // Réappliquer régulièrement (toutes les 2 secondes)
    // pour réagir aux swipes utilisateur qui font réapparaître les barres
    intervalRef.current = setInterval(applyImmersiveMode, 2000);

    // Écouter les changements d'état de l'app
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // L'app revient au premier plan, réappliquer le mode immersif
        setTimeout(applyImmersiveMode, 100);
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      subscription.remove();
    };
  }, [enabled]);
}
