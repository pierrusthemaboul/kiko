// /home/pierre/sword/kiko/app/_layout.tsx
// ----- FICHIER CORRIGÉ AVEC LOGIQUE DE REDIRECTION INTÉGRÉE -----

import React, { useEffect, useState, useCallback } from 'react';
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
import MobileAds, { RequestConfiguration, TestIds } from 'react-native-google-mobile-ads';

const CURRENT_APP_VERSION = Application.nativeApplicationVersion || '1.0.0';
const APP_VERSION_STORAGE_KEY = '@app_version';

SplashScreen.preventAutoHideAsync();

// --- SUPPRESSION: Hook useProtectedRoute n'est plus nécessaire ---
// function useProtectedRoute(session: Session | null) { ... }
// -------------------------------------------------------------

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

  // Effet pour AdMob (inchangé)
  useEffect(() => {
    const configureAdMob = async () => {
        try {
            console.log('[AdMob Config] Starting AdMob initialization...');
            await MobileAds().initialize();
            console.log('[AdMob Config] AdMob SDK Initialized successfully.');
            // --- ATTENTION: IDs de test - À supprimer/conditionner pour la production ---
            try {
              // Remplacer ou supprimer cette partie pour la production
              if (__DEV__) { // Conditionner pour le développement uniquement
                  const myTestDeviceIds = ['3D55CC0D2A3E4E6EB5D0F1231DE2E59C'];
                  console.log('[AdMob Config] DEV MODE - Configuring test devices:', myTestDeviceIds);
                  const requestConfig = new RequestConfiguration({ testDeviceIdentifiers: myTestDeviceIds });
                  await MobileAds().setRequestConfiguration(requestConfig);
                  console.log('[AdMob Config] Test Devices Configured successfully.');
              } else {
                  console.log('[AdMob Config] PROD MODE - Skipping test device configuration.');
                   // Optionnel: Configurer les paramètres de production ici si nécessaire (ex: ciblage enfant)
                   // await MobileAds().setRequestConfiguration({ maxAdContentRating: 'G', tagForChildDirectedTreatment: false });
              }
            } catch (configError) {
              console.warn('[AdMob Config] Failed to set AdMob request configuration:', configError);
              FirebaseAnalytics.error('admob_config_warning', configError instanceof Error ? configError.message : 'Unknown request config error', 'RootLayout AdMob Setup');
            }
            // --------------------------------------------------------------------------
        } catch (error) {
            console.error("[AdMob Config] Failed to initialize AdMob:", error);
            FirebaseAnalytics.error('admob_init_error', error instanceof Error ? error.message : 'Unknown AdMob init error', 'RootLayout AdMob Setup');
        }
    };
    configureAdMob();
  }, []);

  // Effet pour écouter les changements d'état d'authentification
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('[Auth Listener] Initial session check:', initialSession ? 'Exists' : 'Null');
      setSession(initialSession);
      FirebaseAnalytics.initialize(initialSession?.user?.id, !initialSession);
    }).catch(error => {
        // Gérer l'erreur si getSession échoue (rare mais possible)
        console.error("[Auth Listener] Error getting initial session:", error);
        setSession(null); // Assumer non connecté en cas d'erreur
        FirebaseAnalytics.initialize(undefined, true);
        FirebaseAnalytics.error('auth_get_session_error', error.message, 'RootLayout');
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log(`[Auth Listener] Auth state changed: Event=${_event}, Session=${session ? `Exists (User: ${session.user.id})` : 'Null'}`);
      setSession(session);
      FirebaseAnalytics.initialize(session?.user?.id, !session);
      // Log spécifiques pour connexion/déconnexion si besoin
      // if (_event === 'SIGNED_IN') { /* ... */ }
      // if (_event === 'SIGNED_OUT') { /* ... */ }
    });

    return () => {
      authListener?.subscription.unsubscribe();
      console.log('[Auth Listener] Unsubscribed.');
    };
  }, []); // S'exécute une fois au montage

  // Gestion Erreur Polices (inchangé)
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
    }
  }, [fontsLoaded, fontError, initialSetupDone]);

  // --- AJOUT: Effet pour la redirection (Auth Guard) ---
  useEffect(() => {
    // N'exécute la logique de redirection que si l'application est prête
    // ET que le routeur est disponible ET que les segments sont chargés
    if (!appReady || !router || !segments || segments.length === 0) {
      // console.log(`[Auth Guard] Skipping redirect: appReady=${appReady}, router=${!!router}, segments=${segments?.length}`);
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    // Considère (tabs) et game comme protégés
    const isProtectedGroup = segments[0] === '(tabs)' || segments[0] === 'game';

    console.log(`[Auth Guard] Checking: Session=${session ? 'Yes' : 'No'}, Segments=${segments.join('/')}, InAuth=${inAuthGroup}, InProtected=${isProtectedGroup}`);

    // Si PAS de session ET on est dans une zone protégée
    if (!session && isProtectedGroup) {
      // Redirige vers la connexion
      console.log('[Auth Guard] Condition Met: No session & in protected area -> Redirecting to /auth/login');
      router.replace('/auth/login');
    }
    // Si une session existe ET on est dans la zone d'authentification
    else if (session && inAuthGroup) {
      // Redirige vers l'accueil de l'app
      console.log('[Auth Guard] Condition Met: Session exists & in auth area -> Redirecting to /(tabs)');
      router.replace('/(tabs)');
    } else {
       console.log('[Auth Guard] Condition Not Met: No redirect needed.');
    }

  }, [appReady, session, segments, router]); // Dépend de tous ces éléments
  // -------------------------------------------------------

  // Cacher le Splash Screen une fois que l'app est prête
  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync().catch(e => console.warn("[SplashScreen] Error hiding splash screen:", e));
      console.log('[RootLayout] App is ready, hiding splash screen.');
    }
  }, [appReady]);

  // Tant que l'app n'est pas prête
  if (!appReady) {
    console.log('[RootLayout] Rendering null (App not ready)');
    return null; // Le splash screen natif est visible
  }

  // Rendu de la Structure de Navigation Principale
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