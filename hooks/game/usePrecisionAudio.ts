import { useCallback, useRef, useMemo } from 'react';
import { AudioPlayer, useAudioPlayer } from 'expo-audio';
import { FirebaseAnalytics } from '../../lib/firebase';

/**
 * Hook audio pour le mode de jeu PRECISION
 *
 * ⚠️ IMPORTANT - AVANT DE MODIFIER CE FICHIER :
 * Lisez /docs/AUDIO_MIGRATION_GUIDE.md pour comprendre pourquoi nous utilisons
 * useAudioPlayer au lieu de createAudioPlayer.
 *
 * Résumé : createAudioPlayer() est buggé dans expo-audio 0.3.5 (SDK 52)
 * et provoque "Error: Value is undefined, expected an Object".
 *
 * ✅ Utilisez useAudioPlayer() pour créer les players
 * ❌ N'utilisez PAS createAudioPlayer() avec expo-audio 0.3.5
 *
 * Stratégie audio Precision :
 * - Son neutre (bop.wav) pour toutes les validations
 * - Son spécial (corectok.wav) uniquement pour date exacte (absDifference === 0)
 * - Pas de son pour les autres cas → feedback visuel uniquement
 */

interface PrecisionAudioConfig {
  soundVolume: number;
  isSoundEnabled: boolean;
}

type SoundChannel = 'ui' | 'result' | 'timer' | 'event' | 'focus';

const soundPaths = {
  keyPress: require('../../assets/sounds/bop.wav'),
  submit: require('../../assets/sounds/bop.wav'), // Son neutre et court pour validation
  perfectAnswer: require('../../assets/sounds/corectok.wav'),
  timerWarning: require('../../assets/sounds/countdown.wav'),
  timerExpired: require('../../assets/sounds/242208__wagna__failfare.mp3'),
  levelUp: require('../../assets/sounds/423455__ohforheavensake__trumpet-brass-fanfare.wav'),
  gameOver: require('../../assets/sounds/242208__wagna__failfare.mp3'),
  focusGain: require('../../assets/sounds/bop.wav'),
  focusLoss: require('../../assets/sounds/361260__japanyoshithegamer__8-bit-wrong-sound.wav'),
  focusLevelUp: require('../../assets/sounds/corectok.wav'),
};

type SoundKey = keyof typeof soundPaths;

const soundConfig: Record<SoundKey, {
  channel: SoundChannel | null;
  baseVolume: number;
  allowOverlap?: boolean;
  stopChannels?: SoundChannel[];
  analytics?: boolean;
}> = {
  keyPress: { channel: null, allowOverlap: true, baseVolume: 0.35 },
  submit: { channel: 'ui', baseVolume: 0.5, stopChannels: ['timer'] }, // Son neutre pour validation
  perfectAnswer: { channel: 'result', baseVolume: 0.7, stopChannels: ['timer', 'ui'], analytics: true }, // Son spécial pour date exacte
  timerWarning: { channel: 'timer', baseVolume: 0.45 },
  timerExpired: { channel: 'timer', baseVolume: 0.85, stopChannels: ['result'], analytics: true },
  levelUp: { channel: 'event', baseVolume: 0.85, stopChannels: ['timer'], analytics: true },
  gameOver: { channel: 'event', baseVolume: 0.85, stopChannels: ['timer'], analytics: true },
  focusGain: { channel: 'focus', baseVolume: 0.45 },
  focusLoss: { channel: 'focus', baseVolume: 0.55 },
  focusLevelUp: { channel: 'focus', baseVolume: 0.7, stopChannels: ['focus'] },
};

export const usePrecisionAudio = ({ soundVolume, isSoundEnabled }: PrecisionAudioConfig) => {
  // Créer un player pour chaque son avec useAudioPlayer hook
  const keyPressPlayer = useAudioPlayer(soundPaths.keyPress);
  const submitPlayer = useAudioPlayer(soundPaths.submit);
  const perfectAnswerPlayer = useAudioPlayer(soundPaths.perfectAnswer);
  const timerWarningPlayer = useAudioPlayer(soundPaths.timerWarning);
  const timerExpiredPlayer = useAudioPlayer(soundPaths.timerExpired);
  const levelUpPlayer = useAudioPlayer(soundPaths.levelUp);
  const gameOverPlayer = useAudioPlayer(soundPaths.gameOver);
  const focusGainPlayer = useAudioPlayer(soundPaths.focusGain);
  const focusLossPlayer = useAudioPlayer(soundPaths.focusLoss);
  const focusLevelUpPlayer = useAudioPlayer(soundPaths.focusLevelUp);

  // Map des players pour accès facile
  const playersRef = useRef<Record<SoundKey, AudioPlayer>>({
    keyPress: keyPressPlayer,
    submit: submitPlayer,
    perfectAnswer: perfectAnswerPlayer,
    timerWarning: timerWarningPlayer,
    timerExpired: timerExpiredPlayer,
    levelUp: levelUpPlayer,
    gameOver: gameOverPlayer,
    focusGain: focusGainPlayer,
    focusLoss: focusLossPlayer,
    focusLevelUp: focusLevelUpPlayer,
  });

  const channelPlayersRef = useRef<Record<SoundChannel, AudioPlayer | null>>({
    ui: null,
    result: null,
    timer: null,
    event: null,
    focus: null,
  });
  const lastPlayedResultRef = useRef<{ time: number; difference: number } | null>(null);

  const stopChannel = useCallback(async (channel: SoundChannel) => {
    const current = channelPlayersRef.current[channel];
    if (!current) return;
    try {
      current.pause();
      current.remove();
    } catch (_) {}
    channelPlayersRef.current[channel] = null;
  }, []);

  const stopChannels = useCallback(async (channels: SoundChannel[]) => {
    await Promise.all(channels.map((channel) => stopChannel(channel)));
  }, [stopChannel]);

  const playSound = useCallback(async (
    soundKey: SoundKey,
    options?: {
      volumeMultiplier?: number;
      channelOverride?: SoundChannel | null;
      allowOverlap?: boolean;
    },
  ) => {
    if (!isSoundEnabled) {
      return;
    }

    const config = soundConfig[soundKey] ?? { channel: null, baseVolume: 1 };
    const channel = options?.channelOverride ?? config.channel;
    const allowOverlap = options?.allowOverlap ?? config.allowOverlap ?? false;
    const baseVolume = config.baseVolume ?? 1;
    const finalVolume = Math.max(0, Math.min(soundVolume * (options?.volumeMultiplier ?? 1) * baseVolume, 1));

    try {
      if (config.stopChannels?.length) {
        await stopChannels(config.stopChannels);
      }

      if (!allowOverlap && channel) {
        await stopChannel(channel);
      }

      // Get the pre-created player
      const player = playersRef.current[soundKey];
      if (!player) {
        console.error(`[PrecisionAudio] Player not found for ${soundKey}`);
        return;
      }

      // Rewind and set volume
      try {
        await player.seekTo(0);
      } catch (seekError) {
        console.log(`[PrecisionAudio] Seek error for ${soundKey} (non-critical):`, seekError);
      }

      try {
        player.volume = finalVolume;
      } catch (volError) {
        console.error(`[PrecisionAudio] Volume error for ${soundKey}:`, volError);
      }

      // Store in channel if needed
      if (!allowOverlap && channel) {
        channelPlayersRef.current[channel] = player;
      }

      // Play
      try {
        player.play();
      } catch (playError) {
        console.error(`[PrecisionAudio] Play error for ${soundKey}:`, playError);
      }

      if (config.analytics) {
        FirebaseAnalytics.trackEvent('precision_sound_played', { sound_name: soundKey });
      }
    } catch (error) {
      // Silently ignore errors - audio is non-critical
      console.log(`[PrecisionAudio] Skipped ${soundKey} due to error`);
    }
  }, [isSoundEnabled, soundVolume, stopChannel, stopChannels]);

  const stopAll = useCallback(async () => {
    await Promise.all(
      (Object.keys(channelPlayersRef.current) as SoundChannel[]).map((channel) => stopChannel(channel)),
    );
  }, [stopChannel]);

  // --- Interface ---
  const playKeyPress = useCallback(() => {
    playSound('keyPress', { allowOverlap: true });
  }, [playSound]);

  const playSubmit = useCallback(() => {
    playSound('submit');
  }, [playSound]);

  // --- Résultats ---
  const playAnswerResult = useCallback((absDifference: number) => {
    const now = Date.now();

    if (lastPlayedResultRef.current) {
      const timeSinceLastPlay = now - lastPlayedResultRef.current.time;
      const sameDifference = lastPlayedResultRef.current.difference === absDifference;
      if (sameDifference && timeSinceLastPlay < 400) {
        return;
      }
    }

    lastPlayedResultRef.current = { time: now, difference: absDifference };

    // Son spécial uniquement pour la date exacte
    if (absDifference === 0) {
      playSound('perfectAnswer');
    }
    // Pas de son pour les autres cas - le feedback est visuel
  }, [playSound]);

  // --- Chronomètre ---
  const playTimerWarning = useCallback(() => {
    playSound('timerWarning');
  }, [playSound]);

  const playTimerExpired = useCallback(() => {
    playSound('timerExpired');
  }, [playSound]);

  // --- Focus ---
  const playFocusGain = useCallback(() => {
    playSound('focusGain');
  }, [playSound]);

  const playFocusLoss = useCallback(() => {
    playSound('focusLoss');
  }, [playSound]);

  const playFocusLevelUp = useCallback(() => {
    playSound('focusLevelUp');
  }, [playSound]);

  // --- Événements ---
  const playLevelUp = useCallback(() => {
    playSound('levelUp');
  }, [playSound]);

  const playGameOver = useCallback(() => {
    playSound('gameOver');
  }, [playSound]);

  return useMemo(() => ({
    playKeyPress,
    playSubmit,
    playAnswerResult,
    playTimerWarning,
    playTimerExpired,
    playFocusGain,
    playFocusLoss,
    playFocusLevelUp,
    playLevelUp,
    playGameOver,
    stopAll,
  }), [
    playKeyPress,
    playSubmit,
    playAnswerResult,
    playTimerWarning,
    playTimerExpired,
    playFocusGain,
    playFocusLoss,
    playFocusLevelUp,
    playLevelUp,
    playGameOver,
    stopAll,
  ]);
};
