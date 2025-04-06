// /home/pierre/sword/kiko/app/_layout.tsx

import React, { useEffect, useState } from 'react';
import { Stack, SplashScreen } from 'expo-router';
import { useFonts } from 'expo-font';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native'; // Ajout pour Platform si besoin (non utilisé ici mais bonne pratique)

// Import Firebase Analytics utility
import { FirebaseAnalytics } from '../lib/firebase';
// Import Supabase pour vérifier l'utilisateur au démarrage
import { supabase } from '../lib/supabase/supabaseClients';

// --- AJOUT: Imports pour AdMob ---
import MobileAds, { RequestConfiguration, TestIds } from 'react-native-google-mobile-ads';
// ---------------------------------

// --- Configuration pour la vérification de la version de l'App ---
const CURRENT_APP_VERSION = Application.nativeApplicationVersion || '1.0.0';
const APP_VERSION_STORAGE_KEY = '@app_version';
// -------------------------------------------------------------

// Empêche le splash screen de se cacher avant qu'on le décide
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // États pour gérer le chargement
  const [appReady, setAppReady] = useState(false);
  const [initialSetupDone, setInitialSetupDone] = useState(false);

  // --- Chargement des Polices Globales ---
  const [fontsLoaded, fontError] = useFonts({
    'Montserrat-Regular': require('../assets/fonts/Montserrat-Regular.ttf'),
    'Montserrat-Medium': require('../assets/fonts/Montserrat-Medium.ttf'),
    'Montserrat-Bold': require('../assets/fonts/Montserrat-Bold.ttf'),
  });
  // ------------------------------------

  // --- Initialisation Globale (Firebase, Version, Auth Check) ---
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
        FirebaseAnalytics.error(
            'app_initialization_error',
             e instanceof Error ? e.message : 'Unknown setup error',
            'RootLayout'
        );
        setInitialSetupDone(true); // Continue même si erreur
      }
    };

    initializeApp();

  }, []); // Exécuté une seule fois
  // ----------------------------------------------------------

  // --- AJOUT: Initialisation et Configuration AdMob ---
  useEffect(() => {
    const configureAdMobTestDevices = async () => {
        try {
            console.log('[AdMob Config] Starting AdMob configuration...');
            // Liste des IDs d'appareils de test (hashés)
            const myTestDeviceIds = [
                TestIds.EMULATOR, // ID spécial pour les émulateurs/simulateurs
                '3D55CC0D2A3E4E6EB5D0F1231DE2E59C', // <-- Ton ID Android trouvé dans les logs
                // Ajoute ici l'ID de ton iPhone/iPad si tu en obtiens un plus tard
                // 'YOUR_HASHED_DEVICE_ID_IOS_PHONE'
            ];

            console.log('[AdMob Config] Configuring test devices:', myTestDeviceIds);

            const requestConfig = new RequestConfiguration({
                testDeviceIdentifiers: myTestDeviceIds,
                // Autres configurations globales possibles :
                // maxAdContentRating: MaxAdContentRating.G, // Exemple
            });

            // Appliquer la configuration des appareils de test
            await MobileAds().setRequestConfiguration(requestConfig);

            // Initialiser le SDK AdMob (important, doit être fait une fois)
            await MobileAds().initialize();

            console.log('[AdMob Config] AdMob SDK Initialized and Test Devices Configured successfully.');

        } catch (error) {
            console.error("[AdMob Config] Failed to configure/initialize AdMob:", error);
            // Optionnel: Log l'erreur à Firebase
            FirebaseAnalytics.error(
                'admob_init_error',
                error instanceof Error ? error.message : 'Unknown AdMob init error',
                'RootLayout AdMob Setup'
            );
        }
    };

    configureAdMobTestDevices();

  }, []); // Ce useEffect ne s'exécute qu'une fois au montage, en parallèle des autres inits
  // ------------------------------------------------------

  // --- Gestion Erreur Polices ---
   useEffect(() => {
    if (fontError) {
      console.error("RootLayout: Font loading error:", fontError);
      FirebaseAnalytics.error('font_load_error', fontError.message, 'RootLayout');
    }
  }, [fontError]);
  // -----------------------------

  // --- Décider quand l'application est prête à être affichée ---
  useEffect(() => {
    // App prête si polices OK (chargées ou erreur gérée) ET initialisation Firebase/Version OK
    if ((fontsLoaded || fontError) && initialSetupDone) {
      setAppReady(true);
    }
  }, [fontsLoaded, fontError, initialSetupDone]);
  // -----------------------------------------------------------

  // --- Cacher le Splash Screen une fois que l'app est prête ---
  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync();
      console.log('RootLayout: App is ready, hiding splash screen.');
    }
  }, [appReady]);
  // ------------------------------------------------------

  // Tant que l'app n'est pas prête, on n'affiche rien (le splash screen natif est visible)
  if (!appReady) {
    return null;
  }

  // --- Rendu de la Structure de Navigation Principale ---
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="game" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
  // ------------------------------------------------------
}