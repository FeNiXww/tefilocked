import { I18nManager } from 'react-native';
import { registerRootComponent } from 'expo';

import App from './App';

// The app displays Hebrew text but its layout (absolute left/right offsets,
// row ordering, the intro pager's swipe direction) is written LTR-only. RN
// auto-switches to RTL when the device's system language is RTL (Hebrew,
// Arabic, ...), which silently swaps `left`/`right` styles and reverses
// `flexDirection: 'row'` children — this is what broke layout (e.g. the
// onboarding continue button) only on devices with a Hebrew system locale,
// not on an English-locale emulator. Lock the app to LTR so layout is
// identical regardless of device language.
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
