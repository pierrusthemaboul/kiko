require('react-native-reanimated');

if (__DEV__) {
  globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;
  const ignoredWarnings = new Set([
    '`setBehaviorAsync` is not supported with edge-to-edge enabled.',
    '`setBackgroundColorAsync` is not supported with edge-to-edge enabled.',
    '`setPositionAsync` is not supported with edge-to-edge enabled.',
  ]);
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (typeof args[0] === 'string' && ignoredWarnings.has(args[0])) return;
    originalWarn(...args);
  };
}

require('expo-router/entry');
