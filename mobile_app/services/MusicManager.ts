import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

export interface MusicAssets {
  [key: string]: string;
}

export type MusicCommand =
  | { type: 'INIT'; tracks: MusicAssets; volume: number }
  | { type: 'START' }
  | { type: 'STOP' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'SET_VOLUME'; volume: number }
  | { type: 'NEXT_TRACK' };

/**
 * MusicManager - Gestionnaire de musique de fond avec crossfade
 *
 * Architecture:
 * - S'intègre avec AudioWebView pour la lecture via Web Audio API
 * - Gestion automatique des pistes (lecture aléatoire sans répétition immédiate)
 * - Crossfade de 2 secondes entre les pistes
 * - Volume configurable (défaut: 0.3)
 */
class MusicManager {
  private static instance: MusicManager;
  private tracks: MusicAssets = {};
  private trackNames: string[] = [
    'The_Shepherd_s_Rest',
    'Prayer_in_the_Courtyard',
    'Vespers_for_a_Fallen_Realm'
  ];
  private lastPlayedTrack: string | null = null;
  private isPlaying = false;
  private isPaused = false;
  private currentVolume = 0.3;
  private isInitialized = false;
  private onTrackChange: ((trackName: string) => void) | null = null;
  private onError: ((error: Error) => void) | null = null;

  // Callback pour envoyer des commandes à la WebView
  private sendCommandCallback: ((command: MusicCommand) => void) | null = null;

  static getInstance(): MusicManager {
    if (!MusicManager.instance) {
      MusicManager.instance = new MusicManager();
    }
    return MusicManager.instance;
  }

  /**
   * Définit le callback pour envoyer des commandes à la WebView
   */
  setSendCommandCallback(callback: (command: MusicCommand) => void): void {
    this.sendCommandCallback = callback;
  }

  /**
   * Charge les assets musicaux en base64
   */
  async loadMusicAssets(): Promise<MusicAssets> {
    const assets = {
      The_Shepherd_s_Rest: require('../assets/music/The_Shepherd_s_Rest.mp3'),
      Prayer_in_the_Courtyard: require('../assets/music/Prayer_in_the_Courtyard.mp3'),
      Vespers_for_a_Fallen_Realm: require('../assets/music/Vespers_for_a_Fallen_Realm.mp3'),
    };

    const musicData: MusicAssets = {};

    for (const [key, asset] of Object.entries(assets)) {
      try {
        const assetModule = Asset.fromModule(asset);
        await assetModule.downloadAsync();

        if (!assetModule.localUri) {
          console.warn(`[MusicManager] No localUri for ${key}`);
          continue;
        }

        const base64 = await FileSystem.readAsStringAsync(assetModule.localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        musicData[key] = `data:audio/mpeg;base64,${base64}`;
        // console.log(`[MusicManager] Successfully loaded: ${key}.mp3`);
      } catch (error) {
        console.error(`[MusicManager] Error loading ${key}:`, error);
        if (this.onError) {
          this.onError(error instanceof Error ? error : new Error(String(error)));
        }
      }
    }

    return musicData;
  }

  private startPending = false;

  /**
   * Initialise le MusicManager avec les assets chargés
   */
  async initialize(assets: MusicAssets): Promise<void> {
    // console.log('[MusicManager] initialize() called');
    
    // On autorise la ré-initialisation pour mettre à jour les pistes si nécessaire
    if (this.isInitialized) {
      // console.log('[MusicManager] Already initialized, updating tracks and re-notifying WebView...');
    }

    try {
      this.tracks = assets;

      // Vérifier qu'on a au moins une piste
      const hasTracks = Object.values(assets).some(asset => !!asset);
      if (!hasTracks) {
        throw new Error('No music tracks loaded');
      }

      // console.log(`[MusicManager] Assets sent to WebView, waiting for decoding confirmation...`);

      // Envoyer la commande d'init à la WebView
      this.sendCommand({
        type: 'INIT',
        tracks: assets,
        volume: this.currentVolume,
      });
    } catch (error) {
      console.error('[MusicManager] Initialization failed:', error);
      if (this.onError) {
        this.onError(error instanceof Error ? error : new Error(String(error)));
      }
      throw error;
    }
  }

  /**
   * Démarre la lecture de la musique
   */
  async start(): Promise<void> {
    // console.log(`[MusicManager] start() called. isInitialized=${this.isInitialized}, isPlaying=${this.isPlaying}`);
    
    if (!this.isInitialized) {
      // console.log('[MusicManager] Not initialized yet, queuing start request');
      this.startPending = true;
      return;
    }

    if (this.isPlaying) {
      // console.log('[MusicManager] Already playing, sending START command to WebView as fallback');
      this.sendCommand({ type: 'START' });
      return;
    }

    this.isPlaying = true;
    this.isPaused = false;

    // Sélectionner la première piste
    const trackName = this.selectRandomTrack();
    this.lastPlayedTrack = trackName;

    // console.log(`[MusicManager] Sending START command for track: ${trackName}`);

    // Envoyer la commande de démarrage à la WebView
    this.sendCommand({ type: 'START' });

    if (this.onTrackChange) {
      this.onTrackChange(trackName);
    }
  }

  /**
   * Met la musique en pause
   */
  async pause(): Promise<void> {
    if (!this.isPlaying || this.isPaused) {
      return;
    }

    this.isPaused = true;
    this.sendCommand({ type: 'PAUSE' });
    // console.log('[MusicManager] Paused');
  }

  /**
   * Reprend la lecture
   */
  async resume(): Promise<void> {
    if (!this.isPlaying || !this.isPaused) {
      return;
    }

    this.isPaused = false;
    this.sendCommand({ type: 'RESUME' });
    // console.log('[MusicManager] Resumed');
  }

  /**
   * Arrête la musique et libère les ressources
   */
  stop(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.lastPlayedTrack = null;

    this.sendCommand({ type: 'STOP' });
    // console.log('[MusicManager] Stopped');
  }

  /**
   * Définit le volume (0.0 à 1.0)
   */
  setVolume(volume: number): void {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    this.sendCommand({ type: 'SET_VOLUME', volume: this.currentVolume });
  }

  /**
   * Retourne le volume actuel
   */
  getVolume(): number {
    return this.currentVolume;
  }

  /**
   * Définit le callback de changement de piste
   */
  setOnTrackChange(callback: (trackName: string) => void): void {
    this.onTrackChange = callback;
  }

  /**
   * Définit le callback d'erreur
   */
  setOnError(callback: (error: Error) => void): void {
    this.onError = callback;
  }

  /**
   * Vérifie si la musique est en cours de lecture
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Vérifie si la musique est en pause
   */
  getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Retourne la piste actuelle
   */
  getCurrentTrack(): string | null {
    return this.lastPlayedTrack;
  }

  /**
   * Notifie que l'initialisation (décodage) est terminée (appelé par la WebView)
   */
  notifyInitDone(): void {
    // console.log('[MusicManager] Received INIT_DONE from WebView');
    this.isInitialized = true;
    if (this.startPending) {
      // console.log('[MusicManager] Triggering pending start after INIT_DONE');
      this.startPending = false;
      this.start();
    }
  }

  /**
   * Notifie que la piste a changé (appelé par la WebView)
   */
  notifyTrackChanged(trackName: string): void {
    this.lastPlayedTrack = trackName;
    if (this.onTrackChange) {
      this.onTrackChange(trackName);
    }
    // console.log(`[MusicManager] Track changed: ${trackName}`);
  }

  /**
   * Notifie que la lecture s'est arrêtée (appelé par la WebView)
   */
  notifyStopped(): void {
    this.isPlaying = false;
    this.isPaused = false;
    // console.log('[MusicManager] Playback stopped by WebView');
  }

  // ============ Méthodes privées ============

  private sendCommand(command: MusicCommand): void {
    if (this.sendCommandCallback) {
      // console.log(`[MusicManager] Sending command to WebView: ${command.type}`,
      //   command.type === 'INIT' ? `(${Object.keys(command.tracks).length} tracks)` : '');
      this.sendCommandCallback(command);
    } else {
      // console.warn('[MusicManager] No sendCommandCallback set');
    }
  }

  private selectRandomTrack(): string {
    const availableTracks = Object.keys(this.tracks).filter(key => this.tracks[key]);

    if (availableTracks.length === 0) {
      throw new Error('No tracks available');
    }

    if (availableTracks.length === 1) {
      return availableTracks[0];
    }

    // Filtrer pour éviter la répétition immédiate
    const candidates = availableTracks.filter(name => name !== this.lastPlayedTrack);

    // Sélection aléatoire
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
}

export default MusicManager.getInstance();
