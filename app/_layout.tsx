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

const CURRENT_APP_VERSION = Application.nativeApplicationVersion || '1.0.0';
const APP_VERSION_STORAGE_KEY = '@app_version';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [initialSetupDone, setInitialSetupDone] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const router = useRouter();
  const segments = useSegments(); // Donne les parties de l'URL actuelle

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
        await FirebaseAnalytics.initialize(undefined, true);
        await FirebaseAnalytics.appOpen();
        const previousVersion = await AsyncStorage.getItem(APP_VERSION_STORAGE_KEY);
        if (previousVersion && previousVersion !== CURRENT_APP_VERSION) {
          await FirebaseAnalytics.logEvent('app_update', {});
          // console.log(`[RootLayout] Analytics: app_update detected from ${previousVersion} to ${CURRENT_APP_VERSION}`);
          await AsyncStorage.setItem(APP_VERSION_STORAGE_KEY, CURRENT_APP_VERSION);
        } else if (!previousVersion) {
          await AsyncStorage.setItem(APP_VERSION_STORAGE_KEY, CURRENT_APP_VERSION);
          // console.log(`[RootLayout] Analytics: First time storing app version: ${CURRENT_APP_VERSION}`);
        }
      } catch (e) {
        console.error("[RootLayout] Failed during initial app setup:", e);
        FirebaseAnalytics.error('app_initialization_error', e instanceof Error ? e.message : 'Unknown setup error', 'RootLayout');
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
      // ... (code AdMob inchangé) ...
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
          FirebaseAnalytics.error('admob_config_warning', configError instanceof Error ? configError.message : 'Unknown request config error', 'RootLayout AdMob Setup');
        }
      } catch (error) {
        console.error("[AdMob Config] Failed to initialize AdMob:", error);
        FirebaseAnalytics.error('admob_init_error', error instanceof Error ? error.message : 'Unknown AdMob init error', 'RootLayout AdMob Setup');
      }
    };
    configureAdMob();
  }, []);

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
        FirebaseAnalytics.error('auth_get_session_error', error.message, 'RootLayout');
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

  // --- Gestion Erreur Polices ---
  useEffect(() => {
    if (fontError) {
      console.error("RootLayout: Font loading error:", fontError);
      FirebaseAnalytics.error('font_load_error', fontError.message, 'RootLayout');
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

    const inAuthGroup = segments[0] === '(auth)';

    // Vérifier si on essaie d'accéder à un groupe protégé
    const isTryingProtectedGroup = segments[0] === '(tabs)' || segments[0] === 'game';

    // Vérifier si on essaie d'accéder SPÉCIFIQUEMENT à l'écran d'accueil (index) dans (tabs)
    // segments = ['(tabs)'] ou ['(tabs)', 'index'] pour l'écran d'accueil
    const isTryingTabsIndex = segments[0] === '(tabs)' && (segments.length === 1 || segments[1] === 'index');

    // console.log(`[Auth Guard] Checking: Session=${session ? 'Yes' : 'No'}, Segments=${segments.join('/')}, InAuth=${inAuthGroup}, IsTryingProtected=${isTryingProtectedGroup}, IsTryingTabsIndex=${isTryingTabsIndex}`);

    // Condition de redirection vers Login :
    // 1. PAS de session
    // 2. ET on essaie d'accéder à un groupe protégé ((tabs) ou game)
    // 3. ET ce n'est PAS l'écran d'accueil (tabs)/index
    if (!session && isTryingProtectedGroup && !isTryingTabsIndex) {
      // console.log('[Auth Guard] Condition Met: No session & trying protected area (NOT index) -> Redirecting to /auth/login');
      router.replace('/auth/login');
    }
    // Condition de redirection vers l'accueil si on est connecté et dans le groupe (auth)
    else if (session && inAuthGroup) {
      // console.log('[Auth Guard] Condition Met: Session exists & in auth area -> Redirecting to /(tabs)');
      // Redirige vers l'écran d'accueil par défaut du groupe (tabs)
      router.replace('/(tabs)');
    }
    // Dans tous les autres cas (session existe et on est dans (tabs), ou pas de session et on est sur (tabs)/index), on ne fait rien.
    else {
      // console.log('[Auth Guard] Condition Not Met: No redirect needed.');
    }

  }, [appReady, session, segments, router]); // Dépendances de l'effet
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
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="game" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
