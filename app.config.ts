import type { ExpoConfig } from 'expo/config';

// Placeholder bundle identifiers — swap these for real reverse-DNS ids once
// the Apple Developer / Play Console accounts exist. expo-app-blocker needs
// the App Group identifier below to match across the main app + its 4 iOS
// extensions (DeviceActivityMonitor, ShieldAction, ShieldConfiguration,
// StreakWidget).
//
// Kept as a literal (not imported from src/constants/appGroup.ts) because
// Expo's config loader transpiles this file standalone and can't resolve a
// nested .ts require — app code imports the same value from
// src/constants/appGroup.ts instead. Keep both in sync if this ever changes.
const IOS_BUNDLE_ID = 'org.tefillok.app';
const ANDROID_PACKAGE = 'org.tefillok.app';
const IOS_APP_GROUP = `group.${IOS_BUNDLE_ID}.blocker`;

// Required by @bacons/apple-targets (used internally by expo-app-blocker) to
// register the extension targets. Get this from developer.apple.com/account.
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID ?? 'REPLACE_WITH_APPLE_TEAM_ID';

const config: ExpoConfig = {
  name: 'תפילוק',
  slug: 'tefillah-lock',
  scheme: 'tefillok',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: false,
    bundleIdentifier: IOS_BUNDLE_ID,
    appleTeamId: APPLE_TEAM_ID,
    entitlements: {
      'com.apple.developer.family-controls': true,
      'com.apple.security.application-groups': [IOS_APP_GROUP],
    },
  },
  android: {
    package: ANDROID_PACKAGE,
    adaptiveIcon: {
      backgroundColor: '#1B2A47',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-sqlite',
    [
      'expo-app-blocker',
      {
        ios: {
          appGroup: IOS_APP_GROUP,
          shield: {
            title: 'רגע לפני שממשיכים',
            subtitle: '{appName} נעולה כרגע',
            primaryButtonLabel: 'לפתוח את תפילוק',
            secondaryButtonLabel: null,
            primaryButtonColor: '#1B2A47',
            backgroundBlurStyle: 'systemThickMaterialLight',
            icon: './assets/brand/magen-david-overlay.png',
          },
          notification: {
            title: 'תפילוק',
            body: 'הקש כדי לחזור ולהשלים רגע של תפילה',
          },
        },
      },
    ],
  ],
  extra: {
    eas: {
      projectId: '4be88968-ea6e-408a-ba4e-c0ba6636bb7a',
      build: {
        experimental: {
          ios: {
            appExtensions: [
              {
                targetName: 'DeviceActivityMonitor',
                bundleIdentifier: `${IOS_BUNDLE_ID}.DeviceActivityMonitor`,
                entitlements: {
                  'com.apple.developer.family-controls': true,
                  'com.apple.security.application-groups': [IOS_APP_GROUP],
                },
              },
              {
                targetName: 'ShieldAction',
                bundleIdentifier: `${IOS_BUNDLE_ID}.ShieldAction`,
                entitlements: {
                  'com.apple.developer.family-controls': true,
                  'com.apple.security.application-groups': [IOS_APP_GROUP],
                },
              },
              {
                targetName: 'ShieldConfiguration',
                bundleIdentifier: `${IOS_BUNDLE_ID}.ShieldConfiguration`,
                entitlements: {
                  'com.apple.developer.family-controls': true,
                  'com.apple.security.application-groups': [IOS_APP_GROUP],
                },
              },
              {
                // targets/StreakWidget — home screen widget. No Family
                // Controls entitlement (it only reads/writes the shared App
                // Group via ExtensionStorage), unlike the 3 shield extensions above.
                targetName: 'StreakWidget',
                bundleIdentifier: `${IOS_BUNDLE_ID}.StreakWidget`,
                entitlements: {
                  'com.apple.security.application-groups': [IOS_APP_GROUP],
                },
              },
            ],
          },
        },
      },
    },
  },
};

export default config;
