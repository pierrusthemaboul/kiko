module.exports = ({ config }) => {
  const IS_DEV = (process.env.EXPO_PUBLIC_APP_VARIANT || '').trim() === 'development';

  return {
    ...config,
    name: IS_DEV ? "Timalaus DEV" : "Timalaus : Quiz Histoire",
    slug: "kiko",
    version: "1.7.3",
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
      buildNumber: "8",
      googleServicesFile: require('fs').existsSync('./GoogleService-Info.plist') ? "./GoogleService-Info.plist" : undefined,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSUserTrackingUsageDescription: "Cette application utilise des identifiants pour diffuser des publicités personnalisées et analyser l'audience afin d'améliorer votre expérience.",
        NSPhotoLibraryUsageDescription: "Cette application n'accède pas à vos photos, mais cette autorisation est requise par certains modules tiers.",
        NSCameraUsageDescription: "Cette application n'utilise pas l'appareil photo, mais cette autorisation peut être requise par certains modules tiers."
      },
      entitlements: {
        "com.apple.developer.applesignin": ["Default"]
      }
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
      versionCode: 10130,
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
          },
          ios: {
            useFrameworks: "static"
          }
        }
      ],
      "expo-asset",
      "expo-router",
      "expo-navigation-bar",
      "expo-tracking-transparency",
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
          iosAppId: "ca-app-pub-7809209690404525~9290410116"
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
      ],
      [
        function withAndroidQueries(config) {
          const { withAndroidManifest } = require('@expo/config-plugins');
          return withAndroidManifest(config, config => {
            const androidManifest = config.modResults;
            const manifest = androidManifest.manifest;

            if (!manifest.queries) {
              manifest.queries = [
                {
                  package: [
                    { $: { 'android:name': 'com.instagram.android' } },
                    { $: { 'android:name': 'com.facebook.katana' } },
                    { $: { 'android:name': 'com.twitter.android' } },
                    { $: { 'android:name': 'com.whatsapp' } },
                    { $: { 'android:name': 'com.zhiliaoapp.musically' } }, // TikTok
                  ],
                  intent: [
                    {
                      action: [{ $: { 'android:name': 'android.intent.action.SEND' } }],
                      data: [{ $: { 'android:mimeType': 'image/*' } }],
                    },
                  ],
                },
              ];
            }

            return config;
          });
        },
        'android-queries'
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    owner: "pierretulle",
    updates: {
      fallbackToCacheTimeout: 30000,
      url: "https://u.expo.dev/3cbda57c-1ec1-4949-af06-9e933dbc0050"
    },
    runtimeVersion: "1.7.3",
    extra: {
      ...(config.extra || {}),
      eas: {
        projectId: "3cbda57c-1ec1-4949-af06-9e933dbc0050"
      },
      APP_VARIANT: process.env.EXPO_PUBLIC_APP_VARIANT
    }
  };
};
