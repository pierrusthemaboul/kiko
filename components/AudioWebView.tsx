import React, { useRef, forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { StyleSheet, View } from 'react-native';
import { loadAudioAssets, AudioAssets } from './audioAssets';

export interface AudioWebViewRef {
  playSound: (soundName: string) => void;
  setVolume: (volume: number) => void;
}

interface Props {
  onReady?: () => void;
}

const AudioWebView = forwardRef<AudioWebViewRef, Props>(({ onReady }, ref) => {
  const webViewRef = useRef<WebView>(null);
  const [audioAssets, setAudioAssets] = useState<AudioAssets | null>(null);

  // Charger les assets audio au montage du composant
  useEffect(() => {
    loadAudioAssets().then(assets => {
      console.log('[AudioWebView] Audio assets loaded');
      setAudioAssets(assets);
    }).catch(error => {
      console.error('[AudioWebView] Failed to load audio assets:', error);
      // Utiliser des URLs de secours
      setAudioAssets({
        correct: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
        incorrect: 'https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3',
        levelUp: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
        countdown: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
        gameover: 'https://assets.mixkit.co/active_storage/sfx/2001/2001-preview.mp3',
        keyPress: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
      });
    });
  }, []);

  useImperativeHandle(ref, () => ({
    playSound: (soundName: string) => {
      console.log('[AudioWebView Native] ===== PLAYING SOUND:', soundName, '=====');
      console.log('[AudioWebView Native] WebView ready:', !!webViewRef.current);
      webViewRef.current?.injectJavaScript(`
        console.log('[AudioWebView] Injecting JavaScript to play: ${soundName}');
        playSound('${soundName}');
        true;
      `);
    },
    setVolume: (volume: number) => {
      console.log('[AudioWebView] Setting volume:', volume);
      webViewRef.current?.injectJavaScript(`
        setVolume(${volume});
        true;
      `);
    },
  }));

  // Ne pas générer le HTML tant que les assets ne sont pas chargés
  if (!audioAssets) {
    return null;
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="mobile-web-app-capable" content="yes">
  <style>
    body { margin: 0; padding: 0; }
    /* Force audio context pour mobile */
    audio {
      position: absolute;
      top: 0;
      left: 0;
      width: 1px;
      height: 1px;
      opacity: 0;
    }
    #unlock-button {
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
      opacity: 0;
    }
  </style>
</head>
<body>
  <!-- Bouton invisible pour débloquer l'audio sur Android -->
  <button id="unlock-button"></button>

  <script>
    // Force audio context pour Android
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioContext = null;
    let audioUnlocked = false;

    try {
      audioContext = new AudioContext();
      console.log('[AudioWebView HTML] AudioContext created:', audioContext.state);
    } catch (e) {
      console.warn('[AudioWebView HTML] AudioContext not supported:', e);
    }

    const sounds = {
      correct: new Audio('${audioAssets.correct}'),
      incorrect: new Audio('${audioAssets.incorrect}'),
      levelUp: new Audio('${audioAssets.levelUp}'),
      countdown: new Audio('${audioAssets.countdown}'),
      gameover: new Audio('${audioAssets.gameover}'),
      keyPress: new Audio('${audioAssets.keyPress}'),
      submit: new Audio('${audioAssets.keyPress}'),
      perfectAnswer: new Audio('${audioAssets.perfectAnswer}'),
      timerWarning: new Audio('${audioAssets.timerWarning}'),
      timerExpired: new Audio('${audioAssets.gameover}'),
      focusGain: new Audio('${audioAssets.keyPress}'),
      focusLoss: new Audio('${audioAssets.keyPress}'),
      focusLevelUp: new Audio('${audioAssets.levelUp}'),
      splash: new Audio('${audioAssets.splash}'),
      modeSelect: new Audio('${audioAssets.modeSelect}'),
    };

    let currentVolume = 0.24;

    // Précharger tous les sons
    Object.values(sounds).forEach(audio => {
      audio.volume = currentVolume;
      audio.load();
    });

    // Fonction pour débloquer l'audio
    function unlockAudio() {
      if (audioUnlocked) return;

      console.log('[AudioWebView HTML] 🔓 Attempting to unlock audio...');

      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log('[AudioWebView HTML] ✅ AudioContext resumed successfully');
          audioUnlocked = true;
        }).catch(err => {
          console.error('[AudioWebView HTML] ❌ Failed to resume AudioContext:', err);
        });
      } else {
        console.log('[AudioWebView HTML] ✅ AudioContext already running, state:', audioContext?.state);
        audioUnlocked = true;
      }

      // Jouer un son silencieux pour débloquer (requis sur certains navigateurs Android)
      const firstSound = sounds.splash;
      if (firstSound) {
        const originalVolume = firstSound.volume;
        firstSound.volume = 0;
        firstSound.play().then(() => {
          console.log('[AudioWebView HTML] ✅ Silent audio played successfully for unlock');
          firstSound.pause();
          firstSound.currentTime = 0;
          firstSound.volume = originalVolume;
        }).catch(err => {
          console.warn('[AudioWebView HTML] ⚠️  Failed to play silent audio:', err);
          firstSound.volume = originalVolume;
        });
      }
    }

    // Débloquer automatiquement au chargement
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[AudioWebView HTML] DOM loaded, setting up unlock mechanism');
      const unlockButton = document.getElementById('unlock-button');

      if (unlockButton) {
        // Simuler un click immédiatement
        setTimeout(() => {
          console.log('[AudioWebView HTML] 🖱️  Auto-clicking unlock button');
          unlockButton.click();
        }, 50);

        unlockButton.addEventListener('click', unlockAudio);
        unlockButton.addEventListener('touchstart', unlockAudio);
      }
    });

    function playSound(name) {
      const sound = sounds[name];
      if (sound) {
        console.log('[AudioWebView HTML] Playing sound:', name, 'volume:', currentVolume);
        sound.currentTime = 0;

        // Volume à 65% pour le splash
        if (name === 'splash') {
          sound.volume = 0.65;
          console.log('[AudioWebView HTML] SPLASH SOUND - Volume set to 65% (0.65)');
        } else {
          sound.volume = currentVolume;
        }

        sound.play()
          .then(() => {
            console.log('[AudioWebView HTML] Sound started successfully:', name);
          })
          .catch(err => {
            console.error('[AudioWebView HTML] ERROR playing sound:', name, err);
          });
      } else {
        console.error('[AudioWebView HTML] Sound not found:', name);
      }
    }

    function setVolume(volume) {
      currentVolume = Math.max(0, Math.min(1.0, volume));
      Object.values(sounds).forEach(audio => {
        audio.volume = currentVolume;
      });
    }

    // Notifier que l'audio est prêt
    window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'ready' }));
  </script>
</body>
</html>
  `;

  console.log('[AudioWebView] Rendering with style:', styles.hidden);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.hidden}
        pointerEvents="none"
        androidLayerType="hardware"
        webviewDebuggingEnabled={true}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log('[AudioWebView] Message received:', data);
            if (data.type === 'ready' && onReady) {
              console.log('[AudioWebView] Audio is ready!');
              onReady();
            }
          } catch (e) {
            console.log('[AudioWebView] Message parse error:', e);
          }
        }}
        onLoad={() => {
          console.log('[AudioWebView] WebView loaded - injecting unlock script');
          // Injecter le script de déblocage immédiatement
          webViewRef.current?.injectJavaScript(`
            console.log('[AudioWebView HTML] Native injection - calling unlockAudio');
            if (typeof unlockAudio === 'function') {
              unlockAudio();
            }
            true;
          `);
        }}
        onError={(e) => console.log('[AudioWebView] WebView error:', e)}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 1,
    height: 1,
    top: -1000,
    left: -1000,
    overflow: 'hidden',
  },
  hidden: {
    opacity: 0,
  },
});

export default AudioWebView;
