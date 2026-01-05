/**
 * Sons embarqués en base64 pour l'AudioWebView
 * Permet de fonctionner sans connexion internet
 */

import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

export interface AudioAssets {
  [key: string]: string;
}

/**
 * Charge les assets audio et les convertit en data URLs base64
 */
export async function loadAudioAssets(): Promise<AudioAssets> {
  const assets = {
    correct: require('../assets/sounds/corectok.wav'),
    incorrect: require('../assets/sounds/361260__japanyoshithegamer__8-bit-wrong-sound.wav'),
    gameover: require('../assets/sounds/242208__wagna__failfare.mp3'),
    countdown: require('../assets/sounds/countdown.wav'),
    keyPress: require('../assets/sounds/bop.wav'),
    levelUp: require('../assets/sounds/361261__japanyoshithegamer__8-bit-spaceship-startup.wav'),
    perfectAnswer: require('../assets/sounds/423455__ohforheavensake__trumpet-brass-fanfare.wav'),
    timerWarning: require('../assets/sounds/count.wav'),
    splash: require('../assets/sounds/splash.mp3'),
    modeSelect: require('../assets/sounds/mode-select.mp3'),
  };

  const audioData: AudioAssets = {};

  for (const [key, asset] of Object.entries(assets)) {
    try {
      const assetModule = Asset.fromModule(asset);
      await assetModule.downloadAsync();

      // console.log(`[audioAssets] Loading ${key}: uri=${assetModule.uri}, localUri=${assetModule.localUri}`);

      if (assetModule.localUri) {
        const base64 = await FileSystem.readAsStringAsync(assetModule.localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Déterminer le type MIME
        const mimeType = assetModule.localUri.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav';
        audioData[key] = `data:${mimeType};base64,${base64}`;
        // console.log(`[audioAssets] ${key} loaded as base64 (${base64.length} bytes)`);
      } else {
        console.warn(`[audioAssets] No localUri for ${key}, using uri: ${assetModule.uri}`);
        audioData[key] = assetModule.uri;
      }
    } catch (error) {
      console.error(`[audioAssets] Failed to load ${key}:`, error);
      // Fallback vers une URL externe en cas d'échec
      audioData[key] = 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3';
    }
  }

  return audioData;
}
