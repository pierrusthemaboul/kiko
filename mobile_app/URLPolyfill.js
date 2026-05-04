import { setupURLPolyfill } from 'react-native-url-polyfill';

// Cette fonction force l'initialisation du polyfill même si Metro a du mal avec les exports automatiques
export function initPolyfill() {
  try {
    setupURLPolyfill();
    console.log('✅ URL Polyfill initialized manually');
  } catch (error) {
    console.error('❌ Failed to initialize URL Polyfill:', error);
  }
}
