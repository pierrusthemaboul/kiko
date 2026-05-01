import { useCallback, useEffect, useRef, useState } from 'react';
import MusicManager from '../services/MusicManager';
import { useMusicContext } from '../contexts/MusicContext';
import {
  DEFAULT_MUSIC_ENABLED,
  DEFAULT_MUSIC_VOLUME,
  getMusicEnabledPreference,
  getMusicVolumePreference,
  setMusicEnabledPreference,
  setMusicVolumePreference,
} from '../services/musicPreferences';

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
  isEnabled: boolean;
  start: () => Promise<void>;
  stop: () => void;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  setVolume: (volume: number) => void;
  setEnabled: (enabled: boolean) => Promise<void>;
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
export function useBackgroundMusic({
  autoStart = false,
  volume = DEFAULT_MUSIC_VOLUME,
  onTrackChange,
  onError
}: UseBackgroundMusicOptions = {}): UseBackgroundMusicReturn {
  // Utiliser le contexte pour savoir si la WebView est prête
  const musicContext = useMusicContext();
  const isReady = musicContext?.isReady ?? false;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [volumeState, setVolumeState] = useState(DEFAULT_MUSIC_VOLUME);
  const [isEnabled, setIsEnabled] = useState(DEFAULT_MUSIC_ENABLED);
  const isInitializedRef = useRef(false);

  // Utiliser des refs pour les callbacks afin d'éviter de redéclencher l'effet d'initialisation
  const onTrackChangeRef = useRef(onTrackChange);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onTrackChangeRef.current = onTrackChange;
    onErrorRef.current = onError;
  }, [onTrackChange, onError]);

  // Réinitialiser le flag quand isReady repasse à false
  useEffect(() => {
    if (!isReady && isInitializedRef.current) {
      // console.log('[useBackgroundMusic] WebView not ready anymore, resetting init flag');
      isInitializedRef.current = false;
    }
  }, [isReady]);

  // Initialiser le MusicManager quand la WebView est prête
  useEffect(() => {
    if (!isReady || isInitializedRef.current) {
      return;
    }

    // console.log(`[useBackgroundMusic] Initializing music system (autoStart: ${autoStart}, vol: ${volume})...`);
    isInitializedRef.current = true;

    const initMusic = async () => {
      try {
        const manager = MusicManager;
        const [savedVolume, savedEnabled] = await Promise.all([
          getMusicVolumePreference().catch(() => volume),
          getMusicEnabledPreference().catch(() => DEFAULT_MUSIC_ENABLED),
        ]);

        const initialVolume = Math.max(0, Math.min(1, savedVolume));
        setVolumeState(initialVolume);
        setIsEnabled(savedEnabled);

        // Configurer les callbacks
        manager.setOnTrackChange((trackName) => {
          // console.log('[useBackgroundMusic] Callback onTrackChange:', trackName);
          setCurrentTrack(trackName);
          onTrackChangeRef.current?.(trackName);
        });

        manager.setOnError((error) => {
          console.error('[useBackgroundMusic] Music error callback:', error);
          onErrorRef.current?.(error);
        });

        // Charger les assets
        // console.log('[useBackgroundMusic] Loading music assets...');
        const assets = await manager.loadMusicAssets();

        // Vérifier qu'on a des assets
        const hasAssets = Object.values(assets).some(asset => !!asset);
        if (!hasAssets) {
          console.warn('[useBackgroundMusic] No music assets loaded');
          return;
        }

        // console.log(`[useBackgroundMusic] ${Object.keys(assets).length} assets loaded, initializing manager...`);

        // Initialiser (envoie les assets à la WebView)
        await manager.initialize(assets);

        // Définir le volume initial
        manager.setVolume(initialVolume);

        // console.log('[useBackgroundMusic] Music system initialization command sent');

        // Auto-start si demandé
        if (autoStart && savedEnabled) {
          // console.log('[useBackgroundMusic] Auto-starting music...');
          await manager.start();
          setIsPlaying(true);
        }
      } catch (error) {
        console.error('[useBackgroundMusic] Initialization error:', error);
        isInitializedRef.current = false; // Permettre une nouvelle tentative
        onErrorRef.current?.(error instanceof Error ? error : new Error(String(error)));
      }
    };

    initMusic();
  }, [isReady, autoStart, volume]); // Primitives uniquement

  // Démarrer la musique
  const start = useCallback(async () => {
    // console.log(`[useBackgroundMusic] start() called. isReady: ${isReady}`);

    if (!isEnabled) {
      return;
    }

    try {
      // console.log('[useBackgroundMusic] 🚀 [FORCE_START] Requesting MusicManager to start playback');
      await MusicManager.start();
      setIsPlaying(true);
    } catch (error) {
      console.error('[useBackgroundMusic] Start error:', error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [isReady, onError, isEnabled]);

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
    if (!isEnabled) {
      return;
    }

    await MusicManager.resume();
    setIsPlaying(true);
  }, [isEnabled]);

  // Définir le volume
  const setVolume = useCallback((newVolume: number) => {
    const safeVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(safeVolume);
    MusicManager.setVolume(safeVolume);
    setMusicVolumePreference(safeVolume).catch(() => undefined);
  }, []);

  const setEnabled = useCallback(async (enabled: boolean) => {
    setIsEnabled(enabled);
    await setMusicEnabledPreference(enabled);

    if (!enabled) {
      MusicManager.stop();
      setIsPlaying(false);
      setCurrentTrack(null);
      return;
    }

    if (autoStart && isReady) {
      await MusicManager.start();
      setIsPlaying(true);
    }
  }, [autoStart, isReady]);

  return {
    isReady,
    isPlaying,
    isPaused: isReady && !isPlaying && !!currentTrack,
    currentTrack,
    volume: volumeState,
    isEnabled,
    start,
    stop,
    pause,
    resume,
    setVolume,
    setEnabled,
  };
}

export default useBackgroundMusic;
