/**
 * GameSessionMetadata - Service de capture des métadonnées temporelles
 *
 * Ce service enregistre tous les événements du jeu avec leurs timecodes précis
 * pour permettre à Reporters Corp de synchroniser les vidéos avec les données historiques.
 *
 * Utilisé par: K-Hive (via Reporters) pour créer du contenu marketing ciblé
 *
 * @version 1.0.0
 * @date 2026-01-13
 */

import * as FileSystem from 'expo-file-system';
import { Event } from '../hooks/types';

export interface EventTimecode {
  tour: number;
  event_id: string;
  event_titre: string;
  event_date: string;
  event_description?: string;
  event_types?: string[];
  event_notoriete?: number;
  event_mots_cles?: string[];

  // Timecodes en secondes (depuis le début de la session)
  timecode_apparition: number;
  timecode_choix?: number;
  duree_reflexion?: number;

  // Choix du joueur
  choix?: 'avant' | 'après';
  correct?: boolean;

  // Référence à l'événement précédent
  event_reference_id?: string;
  event_reference_date?: string;
}

export interface SessionMetadata {
  // Identifiants
  session_id: string;
  mode: string;
  app_version: string;

  // Timestamps
  start_time: number;  // Date.now() au début
  end_time?: number;
  duration_seconds?: number;

  // Informations de session
  user_name: string;
  initial_level: number;
  final_level?: number;

  // Résultats
  score_initial: number;
  score_final?: number;
  vies_initiales: number;
  vies_finales?: number;
  resultat?: 'victoire' | 'defaite' | 'abandon';

  // Timeline des événements
  events_timeline: EventTimecode[];

  // Métadonnées vidéo (si enregistrement)
  video?: {
    recording: boolean;
    estimated_filename?: string;
    format?: string;
    resolution?: string;
  };

  // Statistiques rapides
  total_events: number;
  total_correct: number;
  total_incorrect: number;
  accuracy_percent?: number;
  average_response_time?: number;
}

/**
 * Gestionnaire de session de métadonnées
 */
export class GameSessionMetadataManager {
  private metadata: SessionMetadata;
  private sessionStartTime: number;

  constructor(
    mode: string,
    userName: string,
    userLevel: number,
    initialScore: number,
    initialLives: number,
    appVersion: string
  ) {
    this.sessionStartTime = Date.now();
    console.log(`[GameMetadata] 🚀 Version: ${appVersion}`);

    this.metadata = {
      session_id: this.generateSessionId(),
      mode,
      app_version: appVersion,
      start_time: this.sessionStartTime,
      user_name: userName,
      initial_level: userLevel,
      score_initial: initialScore,
      vies_initiales: initialLives,
      events_timeline: [],
      total_events: 0,
      total_correct: 0,
      total_incorrect: 0,
    };

    console.log(`[GameMetadata] 🎬 Session démarrée: ${this.metadata.session_id}`);
  }

  /**
   * Génère un ID de session unique
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `session_${timestamp}_${random}`;
  }

  /**
   * Calcule le temps écoulé depuis le début de la session
   */
  private getElapsedSeconds(): number {
    return (Date.now() - this.sessionStartTime) / 1000;
  }

  /**
   * Enregistre l'apparition d'un nouvel événement à l'écran
   */
  onEventAppear(
    tour: number,
    event: Event,
    referenceEvent?: Event | null
  ): void {
    const elapsed = this.getElapsedSeconds();

    const eventTimecode: EventTimecode = {
      tour,
      event_id: event.id,
      event_titre: event.titre,
      event_date: event.date,
      event_description: event.description_detaillee || event.description,
      event_types: event.types_evenement,
      event_notoriete: event.notoriete || undefined,
      timecode_apparition: Math.round(elapsed * 100) / 100, // Arrondir à 2 décimales
      event_reference_id: referenceEvent?.id,
      event_reference_date: referenceEvent?.date,
    };

    this.metadata.events_timeline.push(eventTimecode);
    this.metadata.total_events++;

    console.log(`[GameMetadata] 📍 Tour ${tour}: "${event.titre}" apparaît à ${eventTimecode.timecode_apparition}s`);
  }

  /**
   * Enregistre le choix du joueur
   */
  onPlayerChoice(
    tour: number,
    choice: 'avant' | 'après',
    isCorrect: boolean
  ): void {
    const elapsed = this.getElapsedSeconds();

    // Trouver l'événement correspondant au tour
    const eventTimecode = this.metadata.events_timeline.find(e => e.tour === tour);

    if (eventTimecode) {
      eventTimecode.timecode_choix = Math.round(elapsed * 100) / 100;
      eventTimecode.duree_reflexion = Math.round((eventTimecode.timecode_choix - eventTimecode.timecode_apparition) * 100) / 100;
      eventTimecode.choix = choice;
      eventTimecode.correct = isCorrect;

      if (isCorrect) {
        this.metadata.total_correct++;
      } else {
        this.metadata.total_incorrect++;
      }

      console.log(
        `[GameMetadata] ${isCorrect ? '✅' : '❌'} Tour ${tour}: Choix "${choice}" en ${eventTimecode.duree_reflexion}s`
      );
    } else {
      console.warn(`[GameMetadata] ⚠️ Impossible de trouver l'événement du tour ${tour}`);
    }
  }

  /**
   * Active l'enregistrement vidéo (optionnel)
   */
  setVideoRecording(recording: boolean, format?: string, resolution?: string): void {
    this.metadata.video = {
      recording,
      estimated_filename: recording ? `raw_gameplay_${this.metadata.session_id}.mp4` : undefined,
      format,
      resolution,
    };

    if (recording) {
      console.log(`[GameMetadata] 📹 Enregistrement vidéo activé: ${this.metadata.video.estimated_filename}`);
    }
  }

  /**
   * Termine la session et calcule les statistiques finales
   */
  endSession(
    resultat: 'victoire' | 'defaite' | 'abandon',
    finalLevel: number,
    finalScore: number,
    finalLives: number
  ): SessionMetadata {
    this.metadata.end_time = Date.now();
    this.metadata.duration_seconds = Math.round((this.metadata.end_time - this.metadata.start_time) / 1000);
    this.metadata.resultat = resultat;
    this.metadata.final_level = finalLevel;
    this.metadata.score_final = finalScore;
    this.metadata.vies_finales = finalLives;

    // Calculer statistiques
    if (this.metadata.total_events > 0) {
      this.metadata.accuracy_percent = Math.round((this.metadata.total_correct / this.metadata.total_events) * 100);
    }

    // Calculer temps de réponse moyen
    const responseTimes = this.metadata.events_timeline
      .filter(e => e.duree_reflexion !== undefined)
      .map(e => e.duree_reflexion!);

    if (responseTimes.length > 0) {
      const sum = responseTimes.reduce((a, b) => a + b, 0);
      this.metadata.average_response_time = Math.round((sum / responseTimes.length) * 100) / 100;
    }

    console.log(`[GameMetadata] 🏁 Session terminée: ${resultat.toUpperCase()}`);
    console.log(`[GameMetadata] 📊 Stats: ${this.metadata.total_correct}/${this.metadata.total_events} (${this.metadata.accuracy_percent}%)`);

    return this.metadata;
  }

  /**
   * Exporte les métadonnées en JSON
   */
  async exportToJSON(outputDir?: string): Promise<string> {
    const dir = outputDir || `${FileSystem.documentDirectory}game_sessions/`;

    // Créer le dossier si nécessaire
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }

    const filename = `${this.metadata.session_id}_metadata.json`;
    const filepath = `${dir}${filename}`;

    const jsonContent = JSON.stringify(this.metadata, null, 2);

    await FileSystem.writeAsStringAsync(filepath, jsonContent);

    console.log(`[GameMetadata] 💾 Métadonnées exportées: ${filepath}`);

    return filepath;
  }

  /**
   * Exporte les métadonnées en format texte lisible
   */
  async exportToText(outputDir?: string): Promise<string> {
    const dir = outputDir || `${FileSystem.documentDirectory}game_sessions/`;

    // Créer le dossier si nécessaire
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }

    const filename = `${this.metadata.session_id}_metadata.txt`;
    const filepath = `${dir}${filename}`;

    // Générer le contenu texte
    const lines: string[] = [];
    lines.push(`# SESSION TIMALAUS - ${this.metadata.mode}`);
    lines.push(`Version: ${this.metadata.app_version}`);
    lines.push(`Date: ${new Date(this.metadata.start_time).toLocaleString()}`);
    lines.push(`ID: ${this.metadata.session_id}`);
    lines.push('');
    lines.push(`## Joueur`);
    lines.push(`Nom: ${this.metadata.user_name}`);
    lines.push(`Niveau initial: ${this.metadata.initial_level}`);
    lines.push(`Niveau final: ${this.metadata.final_level || 'N/A'}`);
    lines.push('');
    lines.push(`## Résultats`);
    lines.push(`Résultat: ${this.metadata.resultat?.toUpperCase() || 'EN COURS'}`);
    lines.push(`Score: ${this.metadata.score_initial} → ${this.metadata.score_final || 'N/A'}`);
    lines.push(`Vies: ${this.metadata.vies_initiales} → ${this.metadata.vies_finales || 'N/A'}`);
    lines.push(`Durée: ${this.metadata.duration_seconds || 0}s`);
    lines.push('');
    lines.push(`## Statistiques`);
    lines.push(`Événements joués: ${this.metadata.total_events}`);
    lines.push(`Réponses correctes: ${this.metadata.total_correct}`);
    lines.push(`Réponses incorrectes: ${this.metadata.total_incorrect}`);
    lines.push(`Précision: ${this.metadata.accuracy_percent || 0}%`);
    lines.push(`Temps de réponse moyen: ${this.metadata.average_response_time || 0}s`);
    lines.push('');
    lines.push(`## Timeline des événements`);
    lines.push('');

    this.metadata.events_timeline.forEach((evt, index) => {
      lines.push(`### Tour ${evt.tour}`);
      lines.push(`Événement: ${evt.event_titre} (${evt.event_date})`);
      lines.push(`Apparition: ${evt.timecode_apparition}s`);
      if (evt.timecode_choix) {
        const icon = evt.correct ? '✅' : '❌';
        lines.push(`Choix: ${evt.choix?.toUpperCase()} ${icon} (${evt.timecode_choix}s)`);
        lines.push(`Temps de réflexion: ${evt.duree_reflexion}s`);
      }
      lines.push('');
    });

    if (this.metadata.video?.recording) {
      lines.push(`## Vidéo`);
      lines.push(`Fichier: ${this.metadata.video.estimated_filename}`);
      lines.push(`Format: ${this.metadata.video.format || 'N/A'}`);
      lines.push(`Résolution: ${this.metadata.video.resolution || 'N/A'}`);
    }

    const textContent = lines.join('\n');

    await FileSystem.writeAsStringAsync(filepath, textContent);

    console.log(`[GameMetadata] 📄 Métadonnées texte exportées: ${filepath}`);

    return filepath;
  }

  /**
   * Récupère les métadonnées actuelles (avant la fin de session)
   */
  getCurrentMetadata(): SessionMetadata {
    return { ...this.metadata };
  }

  /**
   * Génère un manifeste de livraison pour Reporters Corp
   */
  generateDeliveryManifest(): {
    session_id: string;
    clips_suggeres: Array<{
      clip_id: string;
      timecode_start: number;
      timecode_end: number;
      evenement_titre: string;
      evenement_date: string;
      evenement_description?: string;
      hook_suggere: string;
      correct: boolean;
    }>;
  } {
    const clips = this.metadata.events_timeline.map((evt, index) => {
      const nextEvt = this.metadata.events_timeline[index + 1];
      const end = nextEvt?.timecode_apparition || evt.timecode_choix || evt.timecode_apparition + 15;

      return {
        clip_id: `clip_${evt.tour}`,
        timecode_start: evt.timecode_apparition,
        timecode_end: end,
        evenement_titre: evt.event_titre,
        evenement_date: evt.event_date,
        evenement_description: evt.event_description,
        hook_suggere: this.generateHook(evt),
        correct: evt.correct || false,
      };
    });

    return {
      session_id: this.metadata.session_id,
      clips_suggeres: clips,
    };
  }

  /**
   * Génère un hook marketing automatique
   */
  private generateHook(evt: EventTimecode): string {
    const year = evt.event_date.split('-')[0];
    const hooks = [
      `📅 ${year} : ${evt.event_titre}`,
      `🎯 Saviez-vous que ${evt.event_titre} s'est produit en ${year} ?`,
      `⚡ ${evt.event_titre} - Une date à connaître !`,
      `🔥 ${year} : Un tournant historique`,
    ];

    return hooks[Math.floor(Math.random() * hooks.length)];
  }
}
