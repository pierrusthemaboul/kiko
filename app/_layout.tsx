// /home/pierre/sword/kiko/app/_layout.tsx

import React, { useEffect, useState } from 'react';
import { Stack, SplashScreen } from 'expo-router';
import { useFonts } from 'expo-font';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Import Firebase Analytics utility
import { FirebaseAnalytics } from '../lib/firebase';
// Import Supabase
import { supabase } from '../lib/supabase/supabaseClients';

// --- AJOUT: Imports pour AdMob ---
import MobileAds, { RequestConfiguration, TestIds, MaxAdContentRating } from 'react-native-google-mobile-ads';
// ---------------------------------

// --- Config Version App ---
const CURRENT_APP_VERSION = Application.nativeApplicationVersion || '1.0.0';
const APP_VERSION_STORAGE_KEY = '@app_version';
// ----------------------------

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [initialSetupDone, setInitialSetupDone] = useState(false);

  // --- Chargement Polices ---
  const [fontsLoaded, fontError] = useFonts({
    'Montserrat-Regular': require('../assets/fonts/Montserrat-Regular.ttf'),
    'Montserrat-Medium': require('../assets/fonts/Montserrat-Medium.ttf'),
    'Montserrat-Bold': require('../assets/fonts/Montserrat-Bold.ttf'),
  });
  // ---------------------------

  // --- Initialisation Globale (Firebase, Version, Auth) ---
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('RootLayout: Initializing App Setup (Firebase, Version, Auth)...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            console.warn('RootLayout: Error getting initial session:', sessionError.message);
        }
        const userId = session?.user?.id;
        const isGuest = !userId;

        await FirebaseAnalytics.initialize(userId, isGuest);
        await FirebaseAnalytics.appOpen();

        const previousVersion = await AsyncStorage.getItem(APP_VERSION_STORAGE_KEY);
        if (previousVersion && previousVersion !== CURRENT_APP_VERSION) {
          await FirebaseAnalytics.logEvent('app_update', {});
          console.log(`Analytics: app_update detected from ${previousVersion} to ${CURRENT_APP_VERSION}`);
          await AsyncStorage.setItem(APP_VERSION_STORAGE_KEY, CURRENT_APP_VERSION);
        } else if (!previousVersion) {
          await AsyncStorage.setItem(APP_VERSION_STORAGE_KEY, CURRENT_APP_VERSION);
           console.log(`Analytics: First time storing app version: ${CURRENT_APP_VERSION}`);
        }
        console.log('RootLayout: Initial App Setup Done.');
        setInitialSetupDone(true);
      } catch (e) {
        console.error("RootLayout: Failed during initial app setup:", e);
        FirebaseAnalytics.error('app_initialization_error', e instanceof Error ? e.message : 'Unknown setup error', 'RootLayout');
        setInitialSetupDone(true);
      }
    };
    initializeApp();
  }, []);
  // ---------------------------------------------------------

  // --- Initialisation et Configuration AdMob (Test avec seulement initialize) ---
  useEffect(() => {
    const configureAdMobTestDevices = async () => {
      console.log('[AdMob Debug] useEffect for AdMob started.');

      if (!MobileAds) {
          console.error('[AdMob Debug] FATAL: MobileAds object is not imported or available!');
          FirebaseAnalytics.error('admob_fatal_import', 'MobileAds object is null/undefined', 'RootLayout AdMob Setup');
          return;
      }
      console.log('[AdMob Debug] MobileAds object seems available.');

      try {
        console.log('[AdMob Debug] Attempting AdMob setup (only initialize)...');

        // --- Configuration des appareils de test (commentée pour ce test) ---
        // const myTestDeviceIds = [
        //   '3D55CC0D2A3E4E6EB5D0F1231DE2E59C'
        // ];
        // console.log('[AdMob Debug] Test device IDs defined:', myTestDeviceIds);
        // const requestConfig = new RequestConfiguration({
        //   testDeviceIdentifiers: myTestDeviceIds,
        // });
        // console.log('[AdMob Debug] RequestConfiguration object created:', JSON.stringify(requestConfig));
        // --- Fin Configuration commentée ---


        // --- LIGNE COMMENTÉE ---
        // console.log('[AdMob Debug] >> SKIPPING MobileAds().setRequestConfiguration() for this test...');
        // try {
        //     await MobileAds().setRequestConfiguration(requestConfig);
        //     console.log('[AdMob Debug] << MobileAds().setRequestConfiguration() SUCCEEDED.');
        // } catch (configError) {
        //     console.error('[AdMob Debug] !! ERROR during setRequestConfiguration:', configError);
        //     FirebaseAnalytics.error('admob_setconfig_error', configError instanceof Error ? configError.message : 'Unknown setRequestConfiguration error', 'RootLayout AdMob Setup - setRequestConfiguration');
        // }
        // --- FIN LIGNE COMMENTÉE ---


        // --- Essayer JUSTE initialize ---
        try {
            console.log('[AdMob Debug] >> Calling MobileAds().initialize()...');
            await MobileAds().initialize(); // On essaie seulement ça
            console.log('[AdMob Debug] << MobileAds().initialize() SUCCEEDED.');
        } catch (initError) {
            // C'est ici que l'erreur se produisait probablement
            console.error('[AdMob Debug] !! ERROR during initialize:', initError);
            FirebaseAnalytics.error('admob_init_error', initError instanceof Error ? initError.message : 'Unknown initialize error', 'RootLayout AdMob Setup - initialize');
        }
        // --- Fin Essai initialize ---

        console.log('[AdMob Debug] AdMob initialization attempt finished.');

      } catch (error) {
        console.error("[AdMob Debug] !! UNEXPECTED GLOBAL ERROR in configureAdMobTestDevices:", error);
        FirebaseAnalytics.error(
            'admob_global_catch_error',
            error instanceof Error ? error.message : 'Unknown AdMob global catch error',
            'RootLayout AdMob Setup - Global Catch'
        );
      }
    };

    configureAdMobTestDevices();

  }, []); // Exécuté une seule fois
  // -------------------------------------------------------------

  // --- Gestion Erreur Polices (inchangé) ---
   useEffect(() => {
    if (fontError) {
      console.error("RootLayout: Font loading error:", fontError);
      FirebaseAnalytics.error('font_load_error', fontError.message, 'RootLayout');
    }
   }, [fontError]);
  // ----------------------------------------

  // --- Décider quand l'app est prête (inchangé) ---
  useEffect(() => {
    if ((fontsLoaded || fontError) && initialSetupDone) {
      setAppReady(true);
    }
  }, [fontsLoaded, fontError, initialSetupDone]);
  // -----------------------------------------------

  // --- Cacher Splash Screen (inchangé) ---
  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync();
      console.log('RootLayout: App is ready, hiding splash screen.');
    }
  }, [appReady]);
  // ----------------------------------------

  if (!appReady) {
    return null;
  }

  // --- Rendu Navigation (inchangé) ---
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="game" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
  // -----------------------------------
}