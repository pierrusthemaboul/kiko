#!/usr/bin/env ts-node
/**
 * Script de diagnostic AdMob
 * Vérifie la configuration et les IDs AdMob
 */

import { getAdUnitId, IS_TEST_BUILD } from '../lib/config/adConfig';

console.log('========================================');
console.log('🔍 DIAGNOSTIC ADMOB');
console.log('========================================\n');

console.log('📱 Environment:');
console.log(`  - Is Test Build: ${IS_TEST_BUILD}`);
console.log(`  - __DEV__: ${typeof __DEV__ !== 'undefined' ? __DEV__ : 'undefined'}`);
console.log(`  - NODE_ENV: ${process.env.NODE_ENV}\n`);

console.log('🎯 Ad Unit IDs:');
const adTypes: Array<'BANNER_HOME' | 'INTERSTITIAL_GAME_OVER' | 'INTERSTITIAL_LEVEL_UP' | 'REWARDED_EXTRA_LIFE' | 'REWARDED_EXTRA_PLAY' | 'INTERSTITIAL_PRECISION_GAME_OVER' | 'REWARDED_CONTINUE_PRECISION' | 'INTERSTITIAL_GENERIC'> = [
  'BANNER_HOME',
  'INTERSTITIAL_GAME_OVER',
  'INTERSTITIAL_LEVEL_UP',
  'REWARDED_EXTRA_LIFE',
  'REWARDED_EXTRA_PLAY',
  'INTERSTITIAL_PRECISION_GAME_OVER',
  'REWARDED_CONTINUE_PRECISION',
  'INTERSTITIAL_GENERIC',
];

adTypes.forEach(type => {
  const id = getAdUnitId(type);
  const isTestId = id.startsWith('ca-app-pub-3940256099942544');
  console.log(`  - ${type}: ${id} ${isTestId ? '(TEST)' : '(PROD)'}`);
});

console.log('\n========================================');
console.log('✅ Configuration vérifiée');
console.log('========================================\n');

console.log('📝 Notes importantes:');
console.log('  1. En PRODUCTION (__DEV__ = false), les IDs de production sont utilisés');
console.log('  2. Il faut 24-48h après la première publication pour que les pubs apparaissent');
console.log('  3. Vérifiez dans la console AdMob que tous les Ad Units sont ACTIVÉS');
console.log('  4. Vérifiez que l\'app ID est bien configuré dans app.config.js');
console.log('  5. Les bannières peuvent ne pas s\'afficher si:');
console.log('     - Le compte AdMob n\'est pas complètement configuré');
console.log('     - Les Ad Units ne sont pas approuvés');
console.log('     - Il n\'y a pas d\'inventaire publicitaire disponible');
console.log('     - Le consentement RGPD n\'est pas donné\n');
