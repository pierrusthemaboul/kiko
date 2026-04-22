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

  // Notifier le parent quand la WebView est prête (après INIT réussi)
  React.useEffect(() => {
    if (isReady && onReady) {
      onReady();
    }
  }, [isReady, onReady]);

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
          break;
        case 'trackChanged':
          MusicManager.notifyTrackChanged(data.trackName);
          onTrackChange?.(data.trackName);
          break;
        case 'initDone':
          MusicManager.notifyInitDone();
          break;
        case 'stopped':
          MusicManager.notifyStopped();
          onStopped?.();
          break;
        case 'log':
          // console.log('[MusicWebView]', data.message);
          break;
        case 'error':
          console.error('[MusicWebView]', data.message);
          break;
      }
    } catch {
      // Ignorer les messages invalides
    }
  }, [onReady, onTrackChange, onStopped]);

  const htmlContent = React.useMemo(() => `
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

          const TRACK_NAMES = ['The_Shepherd_s_Rest', 'Prayer_in_the_Courtyard', 'Vespers_for_a_Fallen_Realm'];

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

              // log('Initialized with ' + Object.keys(tracks).length + ' tracks');
              window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'initDone' }));
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

          async function unlockAudioContext() {
            if (!audioContext) return;
            // log('Unlocking AudioContext. Current state: ' + audioContext.state);
            
            if (audioContext.state === 'suspended' || audioContext.state === 'interrupted') {
              try {
                await audioContext.resume();
                // Créer un buffer silencieux pour forcer le hardware à s'activer sur certains mobiles
                const buffer = audioContext.createBuffer(1, 1, 22050);
                const source = audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(audioContext.destination);
                source.start(0);
                // log('Unlock successful, new state: ' + audioContext.state);
              } catch (e) {
                error('Unlock failed: ' + e.message);
              }
            }
          }

          async function start() {
            // log('Starting playback engine...');
            if (!audioContext) {
              error('Cannot start: audioContext is null');
              return;
            }
            
            if (isPlaying) {
              // log('Playback already in progress, skipping start');
              return;
            }

            // "Brute Force" Resume pour Android
            await unlockAudioContext();

            isPlaying = true;
            const trackName = selectRandomTrack();
            if (trackName) {
              // log('Selected initial track: ' + trackName);
              lastPlayedTrack = trackName;
              playTrack(trackName);
              notifyTrackChanged(trackName);
            } else {
              error('No tracks available to play');
              isPlaying = false;
            }
          }

          function playTrack(trackName, crossfade = false) {
            // log('playTrack called for: ' + trackName + ' (crossfade: ' + crossfade + ')');
            const buffer = tracks[trackName];
            if (!buffer) {
              error('Buffer not found for track: ' + trackName);
              return;
            }
            if (!audioContext) {
              error('audioContext is null in playTrack');
              return;
            }

            const duration = buffer.duration;
            // log('Track duration: ' + duration + 's | Vol: ' + currentVolume);

            // STOP AND START DIRECTLY (Ultra stable)
            stopCurrentSource();

            currentSource = audioContext.createBufferSource();
            currentSource.buffer = buffer;
            currentSource.loop = false;

            currentGain = audioContext.createGain();
            currentGain.gain.value = currentVolume;

            currentSource.connect(currentGain);
            currentGain.connect(audioContext.destination);

            currentSource.start(0);
            // log('Direct source started for: ' + trackName);

            // 🏁 Événement natif de fin de morceau : LE SEUL FIABLE SUR ANDROID
            currentSource.onended = () => {
              const nextTrack = selectRandomTrack();
              // log('🏁 Track finished: ' + trackName + '. Next candidate: ' + nextTrack);
              if (isPlaying) {
                // log('⏭️ Automatically starting next track...');
                audioContext.resume().then(() => {
                  setTimeout(() => {
                    if (isPlaying && nextTrack) {
                      lastPlayedTrack = nextTrack;
                      playTrack(nextTrack, true);
                      notifyTrackChanged(nextTrack);
                    }
                  }, 100);
                });
              }
            };

            // On retire le setTimeout fragile
            if (trackEndTimeout) {
              clearTimeout(trackEndTimeout);
              trackEndTimeout = null;
            }

            // log('Playing: ' + trackName);
          }

          function stopCurrentSource() {
            if (currentSource) {
              try { 
                // IMPORTANT : On retire le callback avant de stopper pour éviter la boucle infinie
                currentSource.onended = null;
                currentSource.stop(); 
              } catch {}
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
            // log('Stopped');
          }

          function pause() {
            if (audioContext && audioContext.state === 'running') {
              audioContext.suspend();
              // log('Paused');
            }
          }

          function resume() {
            if (audioContext) {
              unlockAudioContext();
            }
          }

          function setVolume(vol) {
            currentVolume = Math.max(0, Math.min(1, vol));
            if (currentGain) {
              currentGain.gain.setValueAtTime(currentVolume, audioContext?.currentTime || 0);
            }
            // log('Volume set to: ' + currentVolume);
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
            // log('Received command: ' + command.type);
            switch (command.type) {
              case 'INIT':
                init(command.tracks, command.volume).then((success) => {
                  if (success) {
                    // log('INIT Success - Initialized with ' + Object.keys(tracks).length + ' tracks');
                  } else {
                    error('INIT Failed');
                  }
                });
                break;
              case 'START':
                // log('START command - Current state: isPlaying=' + isPlaying + ', context=' + (audioContext ? audioContext.state : 'null'));
                // Si on force un start alors qu'on pense déjà jouer, on arrête d'abord
                if (isPlaying) {
                  // log('Already playing, stopping first to restart');
                  stopCurrentSource();
                  isPlaying = false;
                }
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

          // Notifier que le script est chargé et prêt à recevoir des commandes
          // log('Music WebView script loaded');
          window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'ready' }));
        })();
      </script>
    </body>
    </html>
  `, []);

  const webViewSource = React.useMemo(() => ({ html: htmlContent }), [htmlContent]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={webViewSource}
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
