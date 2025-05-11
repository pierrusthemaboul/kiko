// app.config.js
export default ({ config }) => ({
  ...config, // Conserve la possibilité de passer des configurations via des arguments ou variables d'env.

  name: "Juno2",
  slug: "kiko",
  version: "1.5.0", // << MODIFIÉ : Nouvelle version visible (sera le versionName Android)
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "juno2",
  userInterfaceStyle: "automatic",

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
    buildNumber: "4" // << MODIFIÉ/SUGGÉRÉ : Incrémenté aussi pour la cohérence si tu buildes iOS
  },

  android: {
    ...config.android, // Conserve les configurations Android potentiellement passées
    adaptiveIcon: {
      foregroundImage: "./assets/images/logo3.png",
      backgroundColor: "#020817"
    },
    package: "com.pierretulle.juno2",
    permissions: [
      "android.permission.INTERNET",
      "android.permission.VIBRATE",
      "android.permission.MODIFY_AUDIO_SETTINGS",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.RECORD_AUDIO",
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "com.google.android.gms.permission.AD_ID"
    ],
    versionCode: 26, // << MODIFIÉ : Nouveau versionCode, doit être un entier supérieur au précédent
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON || "./google-services.json"
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
      "expo-splash-screen",
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
        iosAppId: "ca-app-pub-7809209690404525~1711130974"
      }
    ],
    "@react-native-firebase/app" // Assurez-vous que la configuration Firebase est correcte si vous l'utilisez.
  ],

  experiments: {
    typedRoutes: true
  },

  owner: "pierretulle", // Votre nom d'utilisateur Expo
  // description: "Découvrez l'histoire en devinant l'ordre chronologique des événements. Un jeu ludique et éducatif pour tous âges.",
  // primaryColor: "#1D5F9E",
  // privacy: "public",
  // platforms: ["android", "ios"],
  // githubUrl: "https://github.com/pierretulle/quandi",

  updates: {
    fallbackToCacheTimeout: 0,
    url: "https://u.expo.dev/3cbda57c-1ec1-4949-af06-9e933dbc0050" // Votre URL de mise à jour EAS
  },

  runtimeVersion: {
    policy: "appVersion" // Cela signifie que la runtimeVersion sera la même que votre `version` (donc "1.5.0")
  },

  extra: {
    ...(config.extra || {}), // Conserve les configurations extra potentiellement passées
    eas: {
      projectId: "3cbda57c-1ec1-4949-af06-9e933dbc0050" // Votre ID de projet EAS
    },
    APP_VARIANT: process.env.EXPO_PUBLIC_APP_VARIANT // Pour votre logique AdMob (même si adConfig.ts force actuellement)
  }
});