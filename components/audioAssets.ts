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
    levelUp: require('../assets/sounds/corectok.wav'), // Réutilise correct pour levelUp
  };

  const audioData: AudioAssets = {};

  for (const [key, asset] of Object.entries(assets)) {
    try {
      const assetModule = Asset.fromModule(asset);
      await assetModule.downloadAsync();

      if (assetModule.localUri) {
        const base64 = await FileSystem.readAsStringAsync(assetModule.localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Déterminer le type MIME
        const mimeType = assetModule.localUri.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav';
        audioData[key] = `data:${mimeType};base64,${base64}`;
      }
    } catch (error) {
      console.error(`Failed to load audio asset: ${key}`, error);
      // Fallback vers une URL externe en cas d'échec
      audioData[key] = 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3';
    }
  }

  return audioData;
}
