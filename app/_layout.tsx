// /home/pierre/sword/kiko/app/_layout.tsx
// ----- FICHIER CORRIGÉ AVEC LOGIQUE DE REDIRECTION AJUSTÉE + NAVBAR -----

import React, { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { Session } from '@supabase/supabase-js';
import { Stack, SplashScreen } from 'expo-router';
import { useFonts } from 'expo-font';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import * as NavigationBar from 'expo-navigation-bar';

import { FirebaseAnalytics } from '../lib/firebase';
import { supabase } from '../lib/supabase/supabaseClients';
import MobileAds from 'react-native-google-mobile-ads';
import { useAdConsent } from '../hooks/useAdConsent';

const CURRENT_APP_VERSION = Application.nativeApplicationVersion || '1.0.0';
const APP_VERSION_STORAGE_KEY = '@app_version';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [initialSetupDone, setInitialSetupDone] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [splashShown, setSplashShown] = useState(false);
  const router = useRouter();
  const segments = useSegments(); // Donne les parties de l'URL actuelle

  const { canShowPersonalizedAds, isLoading: consentLoading } = useAdConsent();

  const [fontsLoaded, fontError] = useFonts({
    'Montserrat-Regular': require('../assets/fonts/Montserrat-Regular.ttf'),
    'Montserrat-Medium': require('../assets/fonts/Montserrat-Medium.ttf'),
    'Montserrat-Bold': require('../assets/fonts/Montserrat-Bold.ttf'),
  });

  // --- NOUVEAU: Cacher la barre de navigation Android ---
  useEffect(() => {
    const hideNavigationBar = async () => {
      if (Platform.OS === 'android') {
        try {
          // console.log('🔧 [NAVBAR] Tentative avec SystemUI...');
          await SystemUI.setBackgroundColorAsync('#020817');
          // console.log('✅ [NAVBAR] SystemUI background color set');
          await NavigationBar.setVisibilityAsync('hidden');
          await NavigationBar.setBehaviorAsync('overlay-swipe');
          await NavigationBar.setBackgroundColorAsync('#020817');
          // console.log('✅ [NAVBAR] Navigation bar hidden');
        } catch (error) {
          // console.log('❌ [NAVBAR] Erreur SystemUI:', error);
        }
      }
    };
    hideNavigationBar();
  }, []);

  // --- Initialisation (Firebase, Version Check) ---
  useEffect(() => {
    const initializeApp = async () => {
      // console.log('[RootLayout] Initializing App Setup (Firebase, Version)...');
      try {
        // Réinitialiser le flag splash à chaque démarrage
        await AsyncStorage.removeItem('@splash_shown_session');

        await FirebaseAnalytics.initialize(undefined, true);
        await FirebaseAnalytics.appOpen();
        const previousVersion = await AsyncStorage.getItem(APP_VERSION_STORAGE_KEY);
        if (previousVersion && previousVersion !== CURRENT_APP_VERSION) {
          await FirebaseAnalytics.trackEvent('app_update', {
            from_version: previousVersion,
            to_version: CURRENT_APP_VERSION,
          });
          // console.log(`[RootLayout] Analytics: app_update detected from ${previousVersion} to ${CURRENT_APP_VERSION}`);
          await AsyncStorage.setItem(APP_VERSION_STORAGE_KEY, CURRENT_APP_VERSION);
        } else if (!previousVersion) {
          await AsyncStorage.setItem(APP_VERSION_STORAGE_KEY, CURRENT_APP_VERSION);
          // console.log(`[RootLayout] Analytics: First time storing app version: ${CURRENT_APP_VERSION}`);
        }
      } catch (e) {
        console.error("[RootLayout] Failed during initial app setup:", e);
        FirebaseAnalytics.trackError('app_initialization_error', {
          message: e instanceof Error ? e.message : 'Unknown setup error',
          screen: 'RootLayout',
        });
      } finally {
        // console.log('[RootLayout] Initial App Setup Done.');
        setInitialSetupDone(true);
      }
    };
    initializeApp();
  }, []);

  // --- Configuration AdMob ---
  useEffect(() => {
    const configureAdMob = async () => {
      try {
        // console.log('[AdMob Config] Starting AdMob initialization...');
        await MobileAds().initialize();
        // console.log('[AdMob Config] AdMob SDK Initialized successfully.');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Délai
        try {
          if (__DEV__) {
            const myTestDeviceIds = ['3D55CC0D2A3E4E6EB5D0F1231DE2E59C'];
            // console.log('[AdMob Config] DEV MODE - Configuring test devices:', myTestDeviceIds);
            const requestConfig = { testDeviceIdentifiers: myTestDeviceIds };
            await MobileAds().setRequestConfiguration(requestConfig);
            // console.log('[AdMob Config] Test Devices Configured successfully.');
          } else {
            // console.log('[AdMob Config] PROD MODE - Skipping test device configuration.');
          }
        } catch (configError) {
          console.warn('[AdMob Config] Failed to set AdMob request configuration:', configError);
          FirebaseAnalytics.trackError('admob_config_warning', {
            message: configError instanceof Error ? configError.message : 'Unknown request config error',
            screen: 'RootLayout AdMob Setup',
            severity: 'warning',
          });
        }
      } catch (error) {
        console.error("[AdMob Config] Failed to initialize AdMob:", error);
        FirebaseAnalytics.trackError('admob_init_error', {
          message: error instanceof Error ? error.message : 'Unknown AdMob init error',
          screen: 'RootLayout AdMob Setup',
        });
      }
    };
    configureAdMob();
  }, []);

  // --- Appliquer le consentement RGPD ---

  // --- Écoute de l'état d'authentification ---
  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session: initialSession } }) => {
        // console.log('[Auth Listener] Initial session check:', initialSession ? 'Exists' : 'Null');
        setSession(initialSession);
        FirebaseAnalytics.initialize(initialSession?.user?.id, !initialSession);
      })
      .catch(error => {
        console.error("[Auth Listener] Error getting initial session:", error);
        setSession(null);
        FirebaseAnalytics.initialize(undefined, true);
        FirebaseAnalytics.trackError('auth_get_session_error', {
          message: error.message,
          screen: 'RootLayout',
        });
      });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      // console.log(`[Auth Listener] Auth state changed: Event=${_event}, Session=${session ? `Exists (User: ${session.user.id})` : 'Null'}`);
      setSession(session);
      FirebaseAnalytics.initialize(session?.user?.id, !session);
    });

    return () => {
      authListener?.subscription.unsubscribe();
      // console.log('[Auth Listener] Unsubscribed.');
    };
  }, []);

  // --- Vérifier si le splash a été montré ---
  useEffect(() => {
    const checkSplashShown = async () => {
      try {
        const shown = await AsyncStorage.getItem('@splash_shown_session');
        if (shown === 'true') {
          setSplashShown(true);
        }
      } catch (e) {
        console.warn('Failed to check splash shown state:', e);
      }
    };

    // Vérifier régulièrement si le splash a été montré
    const interval = setInterval(checkSplashShown, 500);
    checkSplashShown();

    return () => clearInterval(interval);
  }, []);

  // --- Gestion Erreur Polices ---
  useEffect(() => {
    if (fontError) {
      console.error("RootLayout: Font loading error:", fontError);
      FirebaseAnalytics.trackError('font_load_error', {
        message: fontError.message,
        screen: 'RootLayout',
      });
    }
  }, [fontError]);

  // --- Décision App Prête ---
  useEffect(() => {
    if ((fontsLoaded || fontError) && initialSetupDone) {
      setAppReady(true);
      // console.log('[RootLayout] App is marked as ready.');
    }
  }, [fontsLoaded, fontError, initialSetupDone]);


  // --- CORRECTION DE LA LOGIQUE DE REDIRECTION (Auth Guard) ---
  useEffect(() => {
    // Ne rien faire tant que l'app n'est pas prête ou que les infos de route ne sont pas dispo
    if (!appReady || !router || !segments || segments.length === 0) {
      return;
    }

    const inAuthGroup = segments[0] === 'auth';

    // Vérifier si on essaie d'accéder à un groupe protégé
    const isTryingProtectedGroup = segments[0] === '(tabs)' || segments[0] === 'game';

    // Vérifier si on essaie d'accéder à l'écran d'accueil (index) dans (tabs)
    const isTryingTabsIndex = segments[0] === '(tabs)' && (segments.length === 1 || segments[1] === 'index');

    // console.log(`[Auth Guard] Checking: Session=${session ? 'Yes' : 'No'}, Segments=${segments.join('/')}, InAuth=${inAuthGroup}, IsTryingProtected=${isTryingProtectedGroup}, IsTryingTabsIndex=${isTryingTabsIndex}`);

    // Si connecté et sur index, attendre que le splash soit montré puis rediriger vers vue1
    if (session && isTryingTabsIndex && splashShown) {
      // console.log('[Auth Guard] Session exists & on index & splash shown -> Redirecting to vue1');
      router.replace('/(tabs)/vue1');
      return;
    }

    // Si connecté et dans auth, rediriger vers vue1
    if (session && inAuthGroup) {
      // console.log('[Auth Guard] Session exists & in auth area -> Redirecting to vue1');
      router.replace('/(tabs)/vue1');
      return;
    }

    // Si pas de session et essai d'accéder à une zone protégée (sauf index)
    if (!session && isTryingProtectedGroup && !isTryingTabsIndex) {
      // console.log('[Auth Guard] No session & trying protected area -> Redirecting to /auth/login');
      router.replace('/auth/login');
      return;
    }

    // Si pas de session et pas sur auth, rediriger vers login
    if (!session && !inAuthGroup && !isTryingTabsIndex) {
      // console.log('[Auth Guard] No session & not on auth/index -> Redirecting to /auth/login');
      router.replace('/auth/login');
      return;
    }

  }, [appReady, session, segments, router, splashShown]);
  // --- FIN CORRECTION REDIRECTION ---


  // --- Cacher Splash Screen ---
  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync().catch(e => console.warn("[SplashScreen] Error hiding splash screen:", e));
      // console.log('[RootLayout] App is ready, hiding splash screen.');
    }
  }, [appReady]);

  // --- Rendu ---
  if (!appReady) {
    // console.log('[RootLayout] Rendering null (App not ready)');
    return null; // Affiche le splash screen natif tant que pas prêt
  }

  // console.log('[RootLayout] Rendering Stack Navigator');
  // Le Stack Navigator principal
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="game" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
