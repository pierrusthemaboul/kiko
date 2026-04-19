import React, { forwardRef, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import MusicManager, { MusicAssets, MusicCommand } from '../services/MusicManager';

export interface MusicWebViewRef {
  sendCommand: (command: MusicCommand) => void;
}

interface Props {
  onReady?: () => void;
  onTrackChange?: (trackName: string) => void;
  onStopped?: () => void;
}

/**
 * MusicWebView - WebView cachée pour la musique de fond avec crossfade
 *
 * Utilise Web Audio API pour :
 * - Lecture continue avec crossfade (2 secondes)
 * - Sélection aléatoire sans répétition
 * - Contrôle du volume
 * - Pause/Resume
 */
const MusicWebView = forwardRef<MusicWebViewRef, Props>(({ onReady, onTrackChange, onStopped }, ref) => {
  const webViewRef = useRef<WebView>(null);
  const [isReady, setIsReady] = useState(false);
  const [musicAssets, setMusicAssets] = useState<MusicAssets | null>(null);

  // Charger les assets au montage
  React.useEffect(() => {
    const loadAssets = async () => {
      const assets = await MusicManager.loadMusicAssets();
      setMusicAssets(assets);
    };
    loadAssets();
  }, []);

  // Configurer le callback du MusicManager
  React.useEffect(() => {
    if (isReady) {
      MusicManager.setSendCommandCallback((command) => {
        sendCommandToWebView(command);
      });

      // Initialiser si les assets sont déjà chargés
      if (musicAssets) {
        MusicManager.initialize(musicAssets).catch(() => {});
      }
    }
  }, [isReady, musicAssets]);

  const sendCommandToWebView = useCallback((command: MusicCommand) => {
    if (webViewRef.current && isReady) {
      const script = `window.handleMusicCommand(${JSON.stringify(command)}); true;`;
      webViewRef.current.injectJavaScript(script);
    }
  }, [isReady]);

  useImperativeHandle(ref, () => ({
    sendCommand: sendCommandToWebView,
  }), [sendCommandToWebView]);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      switch (data.type) {
        case 'ready':
          setIsReady(true);
          onReady?.();
          break;
        case 'trackChanged':
          MusicManager.notifyTrackChanged(data.trackName);
          onTrackChange?.(data.trackName);
          break;
        case 'stopped':
          MusicManager.notifyStopped();
          onStopped?.();
          break;
        case 'log':
          console.log('[MusicWebView]', data.message);
          break;
        case 'error':
          console.error('[MusicWebView]', data.message);
          break;
      }
    } catch {
      // Ignorer les messages invalides
    }
  }, [onReady, onTrackChange, onStopped]);

  if (!musicAssets) return null;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        body { margin: 0; padding: 0; background: transparent; }
      </style>
    </head>
    <body>
      <script>
        (function() {
          let audioContext = null;
          let tracks = {};
          let currentSource = null;
          let currentGain = null;
          let nextSource = null;
          let nextGain = null;
          let isPlaying = false;
          let currentVolume = 0.3;
          let lastPlayedTrack = null;
          let crossfadeDuration = 2; // secondes
          let trackEndTimeout = null;

          const TRACK_NAMES = ['bg_track_1', 'bg_track_2', 'bg_track_3'];

          // Initialiser les pistes
          async function init(audioAssets, volume) {
            try {
              audioContext = new (window.AudioContext || window.webkitAudioContext)();
              currentVolume = volume;
              tracks = {};

              // Décoder tous les assets
              for (const [name, base64Url] of Object.entries(audioAssets)) {
                if (!base64Url) continue;

                try {
                  const response = await fetch(base64Url);
                  const arrayBuffer = await response.arrayBuffer();
                  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                  tracks[name] = audioBuffer;
                } catch (e) {
                  log('Failed to decode ' + name + ': ' + e.message);
                }
              }

              log('Initialized with ' + Object.keys(tracks).length + ' tracks');
              return true;
            } catch (e) {
              error('Init failed: ' + e.message);
              return false;
            }
          }

          function selectRandomTrack() {
            const available = Object.keys(tracks).filter(k => tracks[k]);
            if (available.length === 0) return null;
            if (available.length === 1) return available[0];

            // Éviter la répétition immédiate
            const candidates = available.filter(name => name !== lastPlayedTrack);
            const pool = candidates.length > 0 ? candidates : available;
            return pool[Math.floor(Math.random() * pool.length)];
          }

          async function start() {
            if (!audioContext || isPlaying) return;

            // Reprendre le contexte si suspendu
            if (audioContext.state === 'suspended') {
              await audioContext.resume();
            }

            isPlaying = true;
            const trackName = selectRandomTrack();
            if (trackName) {
              lastPlayedTrack = trackName;
              playTrack(trackName);
              notifyTrackChanged(trackName);
            }
          }

          function playTrack(trackName, crossfade = false) {
            const buffer = tracks[trackName];
            if (!buffer || !audioContext) return;

            const duration = buffer.duration;

            if (crossfade && currentSource && currentGain) {
              // Crossfade
              const fadeTime = Math.min(crossfadeDuration, duration * 0.5);
              const currentTime = audioContext.currentTime;

              // Créer la nouvelle source
              const newSource = audioContext.createBufferSource();
              newSource.buffer = buffer;
              newSource.loop = false;

              const newGain = audioContext.createGain();
              newGain.gain.setValueAtTime(0, currentTime);
              newGain.gain.linearRampToValueAtTime(currentVolume, currentTime + fadeTime);

              newSource.connect(newGain);
              newGain.connect(audioContext.destination);

              // Fade out de l'ancienne
              currentGain.gain.cancelScheduledValues(currentTime);
              currentGain.gain.setValueAtTime(currentGain.gain.value, currentTime);
              currentGain.gain.linearRampToValueAtTime(0, currentTime + fadeTime);

              // Arrêter l'ancienne source après le fade
              setTimeout(() => {
                if (currentSource) {
                  try { currentSource.stop(); } catch {}
                }
              }, fadeTime * 1000);

              // Mettre à jour les références
              currentSource = newSource;
              currentGain = newGain;
            } else {
              // Première lecture ou pas de crossfade
              stopCurrentSource();

              currentSource = audioContext.createBufferSource();
              currentSource.buffer = buffer;
              currentSource.loop = false;

              currentGain = audioContext.createGain();
              currentGain.gain.value = currentVolume;

              currentSource.connect(currentGain);
              currentGain.connect(audioContext.destination);

              currentSource.start(0);
            }

            // Configurer le prochain morceau
            if (trackEndTimeout) clearTimeout(trackEndTimeout);
            trackEndTimeout = setTimeout(() => {
              if (isPlaying) {
                const nextTrack = selectRandomTrack();
                if (nextTrack) {
                  lastPlayedTrack = nextTrack;
                  playTrack(nextTrack, true);
                  notifyTrackChanged(nextTrack);
                }
              }
            }, (duration - crossfadeDuration) * 1000);

            log('Playing: ' + trackName);
          }

          function stopCurrentSource() {
            if (currentSource) {
              try { currentSource.stop(); } catch {}
              try { currentSource.disconnect(); } catch {}
              currentSource = null;
            }
            if (currentGain) {
              try { currentGain.disconnect(); } catch {}
              currentGain = null;
            }
            if (trackEndTimeout) {
              clearTimeout(trackEndTimeout);
              trackEndTimeout = null;
            }
          }

          function stop() {
            isPlaying = false;
            stopCurrentSource();
            lastPlayedTrack = null;
            if (audioContext && audioContext.state !== 'closed') {
              audioContext.close().catch(() => {});
              audioContext = null;
            }
            notifyStopped();
            log('Stopped');
          }

          function pause() {
            if (audioContext && audioContext.state === 'running') {
              audioContext.suspend();
              log('Paused');
            }
          }

          function resume() {
            if (audioContext && audioContext.state === 'suspended') {
              audioContext.resume();
              log('Resumed');
            }
          }

          function setVolume(vol) {
            currentVolume = Math.max(0, Math.min(1, vol));
            if (currentGain) {
              currentGain.gain.setValueAtTime(currentVolume, audioContext?.currentTime || 0);
            }
            log('Volume set to: ' + currentVolume);
          }

          function log(msg) {
            window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'log', message: msg }));
          }

          function error(msg) {
            window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'error', message: msg }));
          }

          function notifyTrackChanged(name) {
            window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'trackChanged', trackName: name }));
          }

          function notifyStopped() {
            window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'stopped' }));
          }

          // Exposer la fonction de commande
          window.handleMusicCommand = function(command) {
            switch (command.type) {
              case 'INIT':
                init(command.tracks, command.volume).then(() => {
                  window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'ready' }));
                });
                break;
              case 'START':
                start();
                break;
              case 'STOP':
                stop();
                break;
              case 'PAUSE':
                pause();
                break;
              case 'RESUME':
                resume();
                break;
              case 'SET_VOLUME':
                setVolume(command.volume);
                break;
            }
          };

          // Notifier que le script est chargé
          log('Music WebView script loaded');
        })();
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.hidden}
        pointerEvents="none"
        onMessage={handleMessage}
        javaScriptEnabled
        originWhitelist={['*']}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
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
    width: 1,
    height: 1,
  },
});

MusicWebView.displayName = 'MusicWebView';

export default MusicWebView;
