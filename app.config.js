// app.config.js
export default ({ config }) => ({
  ...config,

  name: "Juno2",
  slug: "kiko",
  version: "1.3.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "juno2",
  userInterfaceStyle: "automatic",
  // newArchEnabled: false, // Vous pouvez le laisser commenté ou le supprimer si vous ne l'utilisez pas activement

  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#020817"
  },

  assetBundlePatterns: ["**/*"],

  ios: {
    ...config.ios, // Conserve les configurations iOS potentiellement passées
    supportsTablet: true,
    bundleIdentifier: "com.pierretulle.juno2",
    buildNumber: "3" // Assurez-vous d'incrémenter cela pour chaque nouveau build iOS soumis
  },

  android: {
    ...config.android, // Conserve les configurations Android potentiellement passées
    adaptiveIcon: {
      foregroundImage: "./assets/images/logo3.png",
      backgroundColor: "#020817"
    },
    package: "com.pierretulle.juno2",
    permissions: [
      // Liste des permissions. J'ai utilisé les noms complets.
      // Si config.android.permissions contenait déjà des permissions,
      // vous pourriez vouloir les fusionner, mais pour la clarté, voici une liste directe :
      "android.permission.INTERNET",
      "android.permission.VIBRATE",
      "android.permission.MODIFY_AUDIO_SETTINGS",
      "android.permission.READ_EXTERNAL_STORAGE", // Attention : pour Android 10+ voir Scoped Storage ou MANAGE_EXTERNAL_STORAGE si besoin d'accès large
      "android.permission.RECORD_AUDIO",
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.WRITE_EXTERNAL_STORAGE", // Attention : pour Android 10+ voir Scoped Storage
      "com.google.android.gms.permission.AD_ID" // << CELLE-CI EST ESSENTIELLE POUR L'ERREUR
    ],
    // versionCode: 3, // Vous devriez gérer un versionCode et l'incrémenter pour chaque release Android.
                       // Si runtimeVersion.policy est "appVersion", Expo peut le gérer.
                       // Sinon, ajoutez `versionCode: parseInt(config.ios.buildNumber)` ou un numéro distinct.
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON || "./google-services.json" // Flexible pour CI/CD
  },

  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png"
  },

  plugins: [
    [
      "expo-build-properties",
      {
        android: {
          kotlinVersion: "1.9.25"
          // Si vous avez des problèmes de compilation avec des versions d'Android SDK, vous pouvez spécifier ici :
          // compileSdkVersion: 34,
          // targetSdkVersion: 34,
          // buildToolsVersion: "34.0.0"
        }
        // ios: {
        //   deploymentTarget: "13.4", // Exemple
        // }
      }
    ],
    "expo-router",
    [
      "expo-splash-screen", // Assurez-vous que ce plugin est bien configuré si vous l'utilisez activement
      {
        // "image": "./assets/images/splash-icon.png", // Déjà défini dans la section splash globale
        // "resizeMode": "contain",
        // "backgroundColor": "#020817"
      }
    ],
    [
      "react-native-google-mobile-ads",
      {
        androidAppId: "ca-app-pub-7809209690404525~1711130974",
        iosAppId: "ca-app-pub-7809209690404525~1711130974" // Note : c'est le même ID, c'est inhabituel mais possible si c'est un ID d'application AdMob et non un ID d'unité publicitaire.
      }
    ],
    "@react-native-firebase/app" // Assurez-vous que la configuration Firebase est correcte si vous l'utilisez.
  ],

  experiments: {
    typedRoutes: true
  },

  owner: "pierretulle", // Votre nom d'utilisateur Expo
  // description: "Découvrez l'histoire en devinant l'ordre chronologique des événements. Un jeu ludique et éducatif pour tous âges.", // Déjà présent
  // primaryColor: "#1D5F9E", // Déjà présent
  // privacy: "public", // Déjà présent
  // platforms: ["android", "ios"], // Déjà présent
  // githubUrl: "https://github.com/pierretulle/quandi", // Déjà présent

  updates: {
    fallbackToCacheTimeout: 0, // Ou une valeur plus élevée si vous préférez
    url: "https://u.expo.dev/3cbda57c-1ec1-4949-af06-9e933dbc0050" // Votre URL de mise à jour EAS
  },

  runtimeVersion: {
    policy: "appVersion" // Cela signifie que la runtimeVersion sera la même que votre `version` (1.3.0)
  },

  extra: {
    ...(config.extra || {}), // Conserve les configurations extra potentiellement passées
    eas: {
      projectId: "3cbda57c-1ec1-4949-af06-9e933dbc0050" // Votre ID de projet EAS
    },
    APP_VARIANT: process.env.EXPO_PUBLIC_APP_VARIANT // Pour votre logique AdMob
  }
});