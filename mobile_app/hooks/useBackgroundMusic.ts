import { useCallback, useEffect, useRef, useState } from 'react';
import MusicManager from '../services/MusicManager';
import { useMusicContext } from '../contexts/MusicContext';

interface UseBackgroundMusicOptions {
  autoStart?: boolean;
  volume?: number;
  onTrackChange?: (trackName: string) => void;
  onError?: (error: Error) => void;
}

interface UseBackgroundMusicReturn {
  isReady: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  currentTrack: string | null;
  volume: number;
  start: () => Promise<void>;
  stop: () => void;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  setVolume: (volume: number) => void;
}

/**
 * Hook pour gérer la musique de fond dans le jeu
 *
 * Usage:
 * const { start, stop, isReady } = useBackgroundMusic({
 *   autoStart: false,
 *   volume: 0.3,
 * });
 *
 * // Démarrer quand la partie commence
 * useEffect(() => {
 *   if (gameStarted && isReady) {
 *     start();
 *   }
 * }, [gameStarted, isReady, start]);
 *
 * // Arrêter quand la partie se termine
 * useEffect(() => {
 *   if (gameOver) {
 *     stop();
 *   }
 * }, [gameOver, stop]);
 */
export function useBackgroundMusic(options: UseBackgroundMusicOptions = {}): UseBackgroundMusicReturn {
  const { autoStart = false, volume = 0.3, onTrackChange, onError } = options;

  // Utiliser le contexte pour savoir si la WebView est prête
  const musicContext = useMusicContext();
  const isReady = musicContext?.isReady ?? false;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const isInitializedRef = useRef(false);

  // Initialiser le MusicManager quand la WebView est prête
  useEffect(() => {
    if (!isReady || isInitializedRef.current) return;
    isInitializedRef.current = true;

    const initMusic = async () => {
      try {
        const manager = MusicManager;

        // Configurer les callbacks
        manager.setOnTrackChange((trackName) => {
          setCurrentTrack(trackName);
          onTrackChange?.(trackName);
        });

        manager.setOnError((error) => {
          console.error('[useBackgroundMusic] Music error:', error);
          onError?.(error);
        });

        // Charger les assets
        const assets = await manager.loadMusicAssets();

        // Vérifier qu'on a des assets
        const hasAssets = Object.values(assets).some(asset => !!asset);
        if (!hasAssets) {
          console.warn('[useBackgroundMusic] No music assets loaded');
          return;
        }

        // Initialiser (envoie les assets à la WebView)
        await manager.initialize(assets);

        // Définir le volume initial
        manager.setVolume(volume);

        console.log('[useBackgroundMusic] Music system initialized');

        // Auto-start si demandé
        if (autoStart) {
          await manager.start();
          setIsPlaying(true);
        }
      } catch (error) {
        console.error('[useBackgroundMusic] Initialization error:', error);
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    };

    initMusic();

    // Cleanup
    return () => {
      // Note: On ne fait pas stop() ici car le hook peut être démonté/rémonté
      // L'arrêt doit être explicite via la fonction stop()
    };
  }, [isReady, autoStart, volume, onTrackChange, onError]);

  // Démarrer la musique
  const start = useCallback(async () => {
    if (!isReady) {
      console.warn('[useBackgroundMusic] Cannot start: not ready');
      return;
    }

    try {
      await MusicManager.start();
      setIsPlaying(true);
    } catch (error) {
      console.error('[useBackgroundMusic] Start error:', error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [isReady, onError]);

  // Arrêter la musique
  const stop = useCallback(() => {
    MusicManager.stop();
    setIsPlaying(false);
    setCurrentTrack(null);
    isInitializedRef.current = false;
  }, []);

  // Mettre en pause
  const pause = useCallback(async () => {
    await MusicManager.pause();
    setIsPlaying(false);
  }, []);

  // Reprendre
  const resume = useCallback(async () => {
    await MusicManager.resume();
    setIsPlaying(true);
  }, []);

  // Définir le volume
  const setVolume = useCallback((newVolume: number) => {
    MusicManager.setVolume(newVolume);
  }, []);

  return {
    isReady,
    isPlaying,
    isPaused: isReady && !isPlaying && !!currentTrack,
    currentTrack,
    volume: MusicManager.getVolume(),
    start,
    stop,
    pause,
    resume,
    setVolume,
  };
}

export default useBackgroundMusic;
