// Load environment variables from .env for local builds
try { require('dotenv').config(); } catch {}

export default ({ config }) => {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !supabaseKey) {
    // Build-time visibility only (does not crash the build)
    // eslint-disable-next-line no-console
    console.warn('[app.config] Missing Supabase env: ', {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseKey,
    });
  }
  return {
    ...config,
    name: "Quandi",
    slug: "kiko",
    version: "1.5.1",
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
      buildNumber: "5"
    },
    android: {
      ...config.android,
      adaptiveIcon: {
        foregroundImage: "./assets/images/logo3.png",
        backgroundColor: "#FFFFFF"
      },
      package: "com.pierretulle.juno2",
      navigationBar: {
        visible: false,
        backgroundColor: "#020817"
      },
      softwareKeyboardLayoutMode: "pan",
      statusBar: {
        barStyle: "light-content",
        backgroundColor: "#020817",
        translucent: false
      },
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
      versionCode: 10106,
      compileSdkVersion: 35,
      targetSdkVersion: 35,
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
            buildToolsVersion: "35.0.0",
            gradleVersion: "8.10.2"
          }
        }
      ],
      "expo-router",
      [
        "expo-splash-screen",
        {}
      ],
      [
        "expo-system-ui",
        {
          androidNavigationBar: {
            visible: false,
            backgroundColor: "#020817"
          },
          androidStatusBar: {
            barStyle: "light-content",
            backgroundColor: "#020817"
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
      // Runtime config consumed by the mobile app (anon only)
      supabaseUrl,
      supabaseKey,
      APP_VARIANT: process.env.EXPO_PUBLIC_APP_VARIANT
    }
  };
};
