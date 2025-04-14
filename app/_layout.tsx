// /home/pierre/sword/kiko/app/_layout.tsx
// ----- FICHIER CORRIGÉ AVEC LOGIQUE DE REDIRECTION ET LOGS DE DEBUG -----

import React, { useEffect, useState } from 'react';
// --- AJOUT: Imports pour la redirection ---
import { useRouter, useSegments } from 'expo-router';
import { Session } from '@supabase/supabase-js';
// -----------------------------------------
import { Stack, SplashScreen } from 'expo-router';
import { useFonts } from 'expo-font';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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
  // --- AJOUT: Hooks de navigation DANS le composant ---
  const router = useRouter();
  const segments = useSegments();
  // --------------------------------------------------

  const [fontsLoaded, fontError] = useFonts({
    'Montserrat-Regular': require('../assets/fonts/Montserrat-Regular.ttf'),
    'Montserrat-Medium': require('../assets/fonts/Montserrat-Medium.ttf'),
    'Montserrat-Bold': require('../assets/fonts/Montserrat-Bold.ttf'),
  });

  // Log initial pour vérifier l'état du module MobileAds
  useEffect(() => {
    console.log('[DEBUG] MobileAds module:', MobileAds);
  }, []);

  // Effet pour l'initialisation (Firebase, Version Check)
  useEffect(() => {
    const initializeApp = async () => {
      console.log('[RootLayout] Initializing App Setup (Firebase, Version)...');
      try {
        await FirebaseAnalytics.initialize(undefined, true); // Init anonyme au début
        await FirebaseAnalytics.appOpen();
        const previousVersion = await AsyncStorage.getItem(APP_VERSION_STORAGE_KEY);
        if (previousVersion && previousVersion !== CURRENT_APP_VERSION) {
          await FirebaseAnalytics.logEvent('app_update', {});
          console.log(`[RootLayout] Analytics: app_update detected from ${previousVersion} to ${CURRENT_APP_VERSION}`);
          await AsyncStorage.setItem(APP_VERSION_STORAGE_KEY, CURRENT_APP_VERSION);
        } else if (!previousVersion) {
          await AsyncStorage.setItem(APP_VERSION_STORAGE_KEY, CURRENT_APP_VERSION);
          console.log(`[RootLayout] Analytics: First time storing app version: ${CURRENT_APP_VERSION}`);
        }
      } catch (e) {
        console.error("[RootLayout] Failed during initial app setup:", e);
        FirebaseAnalytics.error('app_initialization_error', e instanceof Error ? e.message : 'Unknown setup error', 'RootLayout');
      } finally {
        console.log('[RootLayout] Initial App Setup Done.');
        setInitialSetupDone(true);
      }
    };
    initializeApp();
  }, []);

  // Effet pour AdMob avec délai et logs de debug supplémentaires
  useEffect(() => {
    const configureAdMob = async () => {
      try {
        console.log('[AdMob Config] Starting AdMob initialization...');
        await MobileAds().initialize();
        console.log('[AdMob Config] AdMob SDK Initialized successfully.');

        // Attendre 2000ms pour que le module natif ait le temps de se charger complètement
        console.log('[AdMob Config] Waiting 2000ms before calling setRequestConfiguration()');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // --- ATTENTION: IDs de test - À supprimer/conditionner pour la production ---
        try {
          if (__DEV__) { // Pour le développement uniquement
            const myTestDeviceIds = ['3D55CC0D2A3E4E6EB5D0F1231DE2E59C'];
            console.log('[AdMob Config] DEV MODE - Configuring test devices:', myTestDeviceIds);
            // On passe directement l'objet de configuration
            const requestConfig = { testDeviceIdentifiers: myTestDeviceIds };
            console.log('[AdMob Config] RequestConfiguration object (plain object):', requestConfig);
            console.log('[AdMob Config] Calling setRequestConfiguration()...');
            await MobileAds().setRequestConfiguration(requestConfig);
            console.log('[AdMob Config] Test Devices Configured successfully.');
          } else {
            console.log('[AdMob Config] PROD MODE - Skipping test device configuration.');
            // Optionnel: Configurer les paramètres de production ici si nécessaire
            // Exemple : await MobileAds().setRequestConfiguration({ maxAdContentRating: 'G', tagForChildDirectedTreatment: false });
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

  // Effet pour écouter les changements d'état d'authentification
  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session: initialSession } }) => {
        console.log('[Auth Listener] Initial session check:', initialSession ? 'Exists' : 'Null');
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
      console.log(`[Auth Listener] Auth state changed: Event=${_event}, Session=${session ? `Exists (User: ${session.user.id})` : 'Null'}`);
      setSession(session);
      FirebaseAnalytics.initialize(session?.user?.id, !session);
    });

    return () => {
      authListener?.subscription.unsubscribe();
      console.log('[Auth Listener] Unsubscribed.');
    };
  }, []);

  // Gestion des erreurs de chargement des polices
  useEffect(() => {
    if (fontError) {
      console.error("RootLayout: Font loading error:", fontError);
      FirebaseAnalytics.error('font_load_error', fontError.message, 'RootLayout');
    }
  }, [fontError]);

  // Décider quand l'app est prête (polices + setup initial)
  useEffect(() => {
    if ((fontsLoaded || fontError) && initialSetupDone) {
      setAppReady(true);
      console.log('[RootLayout] App is marked as ready.');
    }
  }, [fontsLoaded, fontError, initialSetupDone]);

  // --- AJOUT: Effet pour la redirection (Auth Guard) ---
  useEffect(() => {
    if (!appReady || !router || !segments || segments.length === 0) {
      return;
    }
    const inAuthGroup = segments[0] === '(auth)';
    const isProtectedGroup = segments[0] === '(tabs)' || segments[0] === 'game';

    console.log(`[Auth Guard] Checking: Session=${session ? 'Yes' : 'No'}, Segments=${segments.join('/')}, InAuth=${inAuthGroup}, InProtected=${isProtectedGroup}`);

    if (!session && isProtectedGroup) {
      console.log('[Auth Guard] Condition Met: No session & in protected area -> Redirecting to /auth/login');
      router.replace('/auth/login');
    } else if (session && inAuthGroup) {
      console.log('[Auth Guard] Condition Met: Session exists & in auth area -> Redirecting to /(tabs)');
      router.replace('/(tabs)');
    } else {
      console.log('[Auth Guard] Condition Not Met: No redirect needed.');
    }
  }, [appReady, session, segments, router]);
  // -------------------------------------------------------

  // Cacher le Splash Screen une fois l'app prête
  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync().catch(e => console.warn("[SplashScreen] Error hiding splash screen:", e));
      console.log('[RootLayout] App is ready, hiding splash screen.');
    }
  }, [appReady]);

  // Tant que l'app n'est pas prête, afficher null
  if (!appReady) {
    console.log('[RootLayout] Rendering null (App not ready)');
    return null;
  }

  console.log('[RootLayout] Rendering Stack Navigator');
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="game" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
