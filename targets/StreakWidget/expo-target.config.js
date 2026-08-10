/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => {
  // Mirrors targets/ShieldConfiguration/expo-target.config.js's pattern —
  // reuse the main app's App Group so the widget can read the streak data
  // the app writes via ExtensionStorage(IOS_APP_GROUP) in
  // src/widgets/syncStreakWidget.ts.
  const appGroup =
    config.ios?.entitlements?.['com.apple.security.application-groups']?.[0] || 'group.expo.app-blocker';

  return {
    type: 'widget',
    name: 'StreakWidget',
    displayName: 'רצף תפילה',
    deploymentTarget: '16.0',
    frameworks: ['SwiftUI', 'WidgetKit'],
    colors: {
      // See the Colors table in @bacons/apple-targets' README — these two
      // names are special-cased for the widget configuration UI, not just
      // arbitrary SwiftUI colors.
      $widgetBackground: '#FFFDF9',
      $accent: '#3E6E99',
    },
    entitlements: {
      'com.apple.security.application-groups': [appGroup],
    },
  };
};
