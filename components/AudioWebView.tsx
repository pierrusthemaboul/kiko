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
      console.log('[AudioWebView] Playing sound:', soundName);
      webViewRef.current?.injectJavaScript(`
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
  <style>
    body { margin: 0; padding: 0; }
  </style>
</head>
<body>
  <script>
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
    };

    let currentVolume = 0.24;

    // Précharger tous les sons
    Object.values(sounds).forEach(audio => {
      audio.volume = currentVolume;
      audio.load();
    });

    function playSound(name) {
      const sound = sounds[name];
      if (sound) {
        sound.currentTime = 0;
        sound.volume = currentVolume;
        sound.play().catch(err => {
          console.log('Error playing sound:', name, err);
        });
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
        webviewDebuggingEnabled={false}
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
        onLoad={() => console.log('[AudioWebView] WebView loaded')}
        onError={(e) => console.log('[AudioWebView] WebView error:', e)}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
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
