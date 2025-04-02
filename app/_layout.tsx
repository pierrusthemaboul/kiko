// /home/pierre/sword/kiko/app/_layout.tsx (Le VRAI fichier racine)

import React, { useEffect, useState } from 'react';
import { Stack, SplashScreen } from 'expo-router';
import { useFonts } from 'expo-font';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import Firebase Analytics utility
import { FirebaseAnalytics } from '../lib/firebase';
// Import Supabase pour vérifier l'utilisateur au démarrage
import { supabase } from '../lib/supabase/supabaseClients';

// --- Configuration pour la vérification de la version de l'App ---
// Récupère la version depuis les infos natives de l'application
const CURRENT_APP_VERSION = Application.nativeApplicationVersion || '1.0.0'; // Fallback à '1.0.0' si non trouvé
const APP_VERSION_STORAGE_KEY = '@app_version'; // Clé pour AsyncStorage
// -------------------------------------------------------------

// Empêche le splash screen de se cacher avant qu'on le décide
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // États pour gérer le chargement
  const [appReady, setAppReady] = useState(false);
  const [initialSetupDone, setInitialSetupDone] = useState(false); // Renommé pour clarté

  // --- Chargement des Polices Globales ---
  // Assure-toi que toutes les polices utilisées DANS LE LAYOUT ou très tôt sont ici
  const [fontsLoaded, fontError] = useFonts({
    'Montserrat-Regular': require('../assets/fonts/Montserrat-Regular.ttf'),
    'Montserrat-Medium': require('../assets/fonts/Montserrat-Medium.ttf'),
    'Montserrat-Bold': require('../assets/fonts/Montserrat-Bold.ttf'),
    // Si tu utilises SpaceMono ou d'autres polices très tôt, ajoute-les ici:
    // 'SpaceMono-Regular': require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  // ------------------------------------

  // --- Initialisation Globale (Firebase, Version, Auth Check) ---
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('RootLayout: Initializing App Setup...');

        // 1. Vérifie l'état d'authentification initial pour Firebase
        // Fait un getSession plutôt que getUser pour éviter les erreurs si offline au démarrage
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            console.warn('RootLayout: Error getting initial session:', sessionError.message);
            // On continue quand même, on considérera l'utilisateur comme invité
        }
        const userId = session?.user?.id;
        const isGuest = !userId;

        // 2. Initialise Firebase Analytics (UserId, UserProps)
        await FirebaseAnalytics.initialize(userId, isGuest);

        // 3. Log l'événement app_open
        await FirebaseAnalytics.appOpen();

        // 4. Logique pour vérifier et suivre l'événement app_update
        const previousVersion = await AsyncStorage.getItem(APP_VERSION_STORAGE_KEY);
        if (previousVersion && previousVersion !== CURRENT_APP_VERSION) {
          // L'utilisateur a mis à jour l'application
          await FirebaseAnalytics.logEvent('app_update', {
              // Paramètres optionnels (non-standard Firebase)
              // previous_version: previousVersion,
              // current_version: CURRENT_APP_VERSION,
          });
          console.log(`Analytics: app_update detected from ${previousVersion} to ${CURRENT_APP_VERSION}`);
          // Sauvegarde la nouvelle version
          await AsyncStorage.setItem(APP_VERSION_STORAGE_KEY, CURRENT_APP_VERSION);
        } else if (!previousVersion) {
          // Première ouverture de l'app (ou après suppression du storage)
          await AsyncStorage.setItem(APP_VERSION_STORAGE_KEY, CURRENT_APP_VERSION);
           console.log(`Analytics: First time storing app version: ${CURRENT_APP_VERSION}`);
        }
        // Si previousVersion === CURRENT_APP_VERSION, on ne fait rien de spécial

        console.log('RootLayout: Initial App Setup Done.');
        setInitialSetupDone(true); // Marque l'initialisation comme terminée

      } catch (e) {
        console.error("RootLayout: Failed during initial app setup:", e);
        // Log l'erreur à Firebase
        FirebaseAnalytics.error(
            'app_initialization_error', // Type d'erreur
             e instanceof Error ? e.message : 'Unknown setup error', // Message
            'RootLayout' // Contexte
        );
        // Marquer quand même comme terminé pour ne pas bloquer l'UI
        setInitialSetupDone(true);
      }
    };

    initializeApp();

  }, []); // Ce useEffect ne s'exécute qu'une fois au montage du composant racine
  // ----------------------------------------------------------

  // --- Gestion Erreur Polices ---
   useEffect(() => {
    if (fontError) {
      console.error("RootLayout: Font loading error:", fontError);
      // Log l'erreur de police à Firebase
      FirebaseAnalytics.error('font_load_error', fontError.message, 'RootLayout');
      // On pourrait décider ici quoi faire : bloquer, continuer sans polices...
      // Pour l'instant, on log l'erreur mais on ne change pas l'état 'appReady'
    }
  }, [fontError]);
  // -----------------------------

  // --- Décider quand l'application est prête à être affichée ---
  useEffect(() => {
    // L'app est prête si:
    // 1. Les polices sont chargées OU une erreur de police est survenue (pour ne pas bloquer)
    // 2. L'initialisation (Firebase, version check) est terminée
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
  // Utilise une Stack pour organiser les différents groupes/écrans principaux
  // headerShown: false pour que chaque groupe/écran gère son propre header si besoin
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Groupe principal avec les onglets (home, comment jouer, explorer...) */}
      <Stack.Screen name="(tabs)" />

      {/* Groupe pour l'authentification (login, signup) */}
      {/* Le layout interne de (auth) gère la navigation entre login/signup */}
      <Stack.Screen name="(auth)" />

       {/* Écran ou groupe pour le jeu lui-même */}
       {/* Si "game" est un groupe avec plusieurs écrans, il aura son propre _layout.tsx */}
      <Stack.Screen name="game" />

      {/* Écran pour gérer les routes non trouvées (404) */}
      <Stack.Screen name="+not-found" />
    </Stack>
  );
  // ------------------------------------------------------
}