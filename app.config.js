export default ({ config }) => ({
  ...config,
  name: "Quandi",
  slug: "kiko",
  version: "1.5.2",
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
    ...config.ios,
    supportsTablet: true,
    bundleIdentifier: "com.pierretulle.juno2",
    buildNumber: "7"
  },
  android: {
    ...config.android,
    adaptiveIcon: {
      foregroundImage: "./assets/images/logo3.png",
      backgroundColor: "#FFFFFF"
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
      "com.google.android.gms.permission.AD_ID", // Important pour AdMob
      "android.permission.ACCESS_ADSERVICES_AD_ID" // Android 13+
    ],
    versionCode: 10107, // Incrémenté
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
          kotlinVersion: "1.9.25",
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          buildToolsVersion: "35.0.0"
        }
      }
    ],
    "expo-router",
    [
      "expo-splash-screen",
      {}
    ],
    [
      "react-native-google-mobile-ads",
      {
        androidAppId: "ca-app-pub-7809209690404525~1711130974",
        iosAppId: "ca-app-pub-7809209690404525~1711130974"
      }
    ],
    "@react-native-firebase/app",
    
    // Plugin unique pour gérer AD_ID correctement
    "./plugins/withKotlinVersion",
    "./plugins/withAdIdPermission"
  ],
  experiments: {
    typedRoutes: true
  },
  owner: "pierretulle",
  updates: {
    fallbackToCacheTimeout: 0,
    url: "https://u.expo.dev/3cbda57c-1ec1-4949-af06-9e933dbc0050"
  },
  runtimeVersion: {
    policy: "appVersion"
  },
  extra: {
    ...(config.extra || {}),
    eas: {
      projectId: "3cbda57c-1ec1-4949-af06-9e933dbc0050"
    },
    APP_VARIANT: process.env.EXPO_PUBLIC_APP_VARIANT
  }
});