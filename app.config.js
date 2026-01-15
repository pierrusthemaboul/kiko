export default ({ config }) => {
  const IS_DEV = process.env.EXPO_PUBLIC_APP_VARIANT === 'development';

  return {
    ...config,
    name: IS_DEV ? "Timalaus DEV" : "Timalaus",
    slug: "kiko",
    version: "1.6.6",
    orientation: "portrait",
    icon: "./assets/images/oklogo.png",
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
      bundleIdentifier: IS_DEV ? "com.pierretulle.juno2.dev" : "com.pierretulle.juno2",
      buildNumber: "5"
    },
    android: {
      ...config.android,
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#020817"
      },
      package: IS_DEV ? "com.pierretulle.juno2.dev" : "com.pierretulle.juno2",
      softwareKeyboardLayoutMode: "pan",
      permissions: [
        "android.permission.INTERNET",
        "android.permission.VIBRATE",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.RECORD_AUDIO",
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "com.google.android.gms.permission.AD_ID",
        "android.permission.ACCESS_ADSERVICES_AD_ID"
      ],
      versionCode: 10123,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
      userInterfaceStyle: "dark"
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
            buildToolsVersion: "35.0.0",
            gradleVersion: "8.10.2",
            ndkVersion: "27.1.12297006",
            packagingOptions: {
              jniLibs: {
                useLegacyPackaging: false
              }
            }
          }
        }
      ],
      "expo-asset",
      "expo-router",
      "expo-navigation-bar",
      [
        "expo-system-ui",
        {
          androidNavigationBar: {
            visible: "immersive",
            backgroundColor: "#020817"
          },
          androidStatusBar: {
            barStyle: "light-content",
            backgroundColor: "#020817",
            hidden: false,
            translucent: true
          }
        }
      ],
      [
        "react-native-google-mobile-ads",
        {
          androidAppId: "ca-app-pub-7809209690404525~1711130974",
          iosAppId: "ca-app-pub-7809209690404525~1711130974"
        }
      ],
      "@react-native-firebase/app",
      [
        function withForceAdIdPermission(config) {
          const { withAndroidManifest } = require('@expo/config-plugins');

          return withAndroidManifest(config, config => {
            const androidManifest = config.modResults;
            const manifest = androidManifest.manifest;

            if (!manifest.$) manifest.$ = {};
            manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

            if (!manifest['uses-permission']) {
              manifest['uses-permission'] = [];
            }

            manifest['uses-permission'] = manifest['uses-permission'].filter(p => {
              const name = p?.$ && p.$['android:name'];
              return name !== 'com.google.android.gms.permission.AD_ID';
            });

            manifest['uses-permission'].unshift({
              $: {
                'android:name': 'com.google.android.gms.permission.AD_ID',
                'tools:node': 'replace'
              }
            });

            console.log('✅ Permission AD_ID forcée avec tools:node="replace"');

            return config;
          });
        },
        'force-ad-id-permission'
      ],
      [
        function withKotlinVersionFix(config) {
          const { withGradleProperties } = require('@expo/config-plugins');

          return withGradleProperties(config, config => {
            config.modResults.push({
              type: 'property',
              key: 'org.jetbrains.kotlin.gradle.compiler.suppressKotlinVersionCompatibilityCheck',
              value: 'true'
            });
            config.modResults.push({
              type: 'property',
              key: 'kotlin.version',
              value: '1.9.25'
            });
            return config;
          });
        },
        'kotlin-version-fix'
      ]
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
  };
};