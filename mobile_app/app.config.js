module.exports = ({ config }) => {
  const IS_DEV = (process.env.EXPO_PUBLIC_APP_VARIANT || '').trim() === 'development';

  return {
    ...config,
    name: IS_DEV ? "Timalaus DEV" : "Timalaus: History Timeline Quiz",
    slug: "kiko",
    version: "1.8.1",
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
      supportsTablet: false,
      bundleIdentifier: IS_DEV ? "com.pierretulle.juno2.dev" : "com.pierretulle.juno2",
      appleTeamId: "RBH23M8YUV",
      buildNumber: "33",
      googleServicesFile: require('fs').existsSync('./GoogleService-Info.plist') ? "./GoogleService-Info.plist" : undefined,
      infoPlist: {
        CFBundleDevelopmentRegion: "fr",
        CFBundleLocalizations: ["fr", "en"],
        CFBundleAllowMixedLocalizations: true,
        ITSAppUsesNonExemptEncryption: false,
        NSUserTrackingUsageDescription: "Cette application utilise des identifiants pour diffuser des publicités personnalisées et analyser l'audience afin d'améliorer votre expérience.",
        NSPhotoLibraryUsageDescription: "Cette application n'accède pas à vos photos, mais cette autorisation est requise par certains modules tiers.",
        NSCameraUsageDescription: "Cette application n'utilise pas l'appareil photo, mais cette autorisation peut être requise par certains modules tiers."
      },
      supportEmail: "pierre.cousin7@gmail.com",
      supportUrl: "https://adminweb-ruddy.vercel.app/support.html",
      privacyManifest: {
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
            NSPrivacyAccessedAPITypeReasons: ["CA92.1"]
          }
        ]
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
      versionCode: 11001,
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
            packagingOptions: {
              jniLibs: {
                useLegacyPackaging: false
              }
            }
          },
          ios: {
            useFrameworks: "static",
            buildReactNativeFromSource: true
          }
        }
      ],
      "expo-asset",
      "expo-font",
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
          const { withAndroidManifest } = require('expo/config-plugins');

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
        function withAndroidQueries(config) {
          const { withAndroidManifest } = require('expo/config-plugins');
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
      url: "https://u.expo.dev/3cbda57c-1ec1-4949-af06-9e933dbc0050",
      checkAutomatically: "ON_LOAD",
      enabled: true,
      // Permet les mises à jour OTA sur 4 versions précédentes
      // Le runtimeVersion utilise un schéma stable basé sur la version majeure.minor
      // ce qui permet aux versions 1.7.x de recevoir les mêmes updates
    },
    // RuntimeVersion basé sur la version majeure.minor pour supporter les updates sur plusieurs versions
    // Cela permet aux versions 1.7.1, 1.7.2, 1.7.3, 1.7.4, 1.7.5 de recevoir les mêmes updates OTA
    runtimeVersion: "1.8",
    extra: {
      ...(config.extra || {}),
      eas: {
        projectId: "3cbda57c-1ec1-4949-af06-9e933dbc0050"
      },
      APP_VARIANT: process.env.EXPO_PUBLIC_APP_VARIANT
    }
  };
};
