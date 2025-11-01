import { useCallback, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { FirebaseAnalytics } from '../../lib/firebase';

interface PrecisionAudioConfig {
  soundVolume: number;
  isSoundEnabled: boolean;
}

type SoundChannel = 'ui' | 'result' | 'timer' | 'event' | 'focus';

const soundPaths = {
  keyPress: require('../../assets/sounds/bop.wav'),
  submit: require('../../assets/sounds/361261__japanyoshithegamer__8-bit-spaceship-startup.wav'),
  perfectAnswer: require('../../assets/sounds/corectok.wav'),
  goodAnswer: require('../../assets/sounds/corectok.wav'),
  wrongAnswer: require('../../assets/sounds/361260__japanyoshithegamer__8-bit-wrong-sound.wav'),
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
  submit: { channel: 'ui', baseVolume: 0.6 },
  perfectAnswer: { channel: 'result', baseVolume: 1.0, stopChannels: ['timer'], analytics: true },
  goodAnswer: { channel: 'result', baseVolume: 0.85, stopChannels: ['timer'] },
  wrongAnswer: { channel: 'result', baseVolume: 0.75, stopChannels: ['timer'], analytics: true },
  timerWarning: { channel: 'timer', baseVolume: 0.45, stopChannels: ['result'] },
  timerExpired: { channel: 'timer', baseVolume: 0.85, stopChannels: ['result'], analytics: true },
  levelUp: { channel: 'event', baseVolume: 0.85, stopChannels: ['result', 'timer'], analytics: true },
  gameOver: { channel: 'event', baseVolume: 0.85, stopChannels: ['result', 'timer'], analytics: true },
  focusGain: { channel: 'focus', baseVolume: 0.45 },
  focusLoss: { channel: 'focus', baseVolume: 0.55 },
  focusLevelUp: { channel: 'focus', baseVolume: 0.7, stopChannels: ['focus'] },
};

export const usePrecisionAudio = ({ soundVolume, isSoundEnabled }: PrecisionAudioConfig) => {
  const isInitialized = useRef(false);
  const channelPlayersRef = useRef<Record<SoundChannel, Audio.Sound | null>>({
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
      await current.stopAsync();
    } catch (_) {}
    try {
      await current.unloadAsync();
    } catch (_) {}
    channelPlayersRef.current[channel] = null;
  }, []);

  const stopChannels = useCallback(async (channels: SoundChannel[]) => {
    await Promise.all(channels.map((channel) => stopChannel(channel)));
  }, [stopChannel]);

  useEffect(() => {
    const initAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        isInitialized.current = true;
      } catch (error) {
        FirebaseAnalytics.trackError('precision_audio_init_error', {
          message: error instanceof Error ? error.message : 'Unknown',
          screen: 'usePrecisionAudioInit',
        });
      }
    };
    initAudio();

    return () => {
      isInitialized.current = false;
      Object.keys(channelPlayersRef.current).forEach((channelKey) => {
        const channel = channelKey as SoundChannel;
        const sound = channelPlayersRef.current[channel];
        if (!sound) return;
        sound.stopAsync().catch(() => {});
        sound.unloadAsync().catch(() => {});
        channelPlayersRef.current[channel] = null;
      });
    };
  }, []);

  const playSound = useCallback(async (
    soundKey: SoundKey,
    options?: {
      volumeMultiplier?: number;
      channelOverride?: SoundChannel | null;
      allowOverlap?: boolean;
    },
  ) => {
    if (!isSoundEnabled || !isInitialized.current) {
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

      const { sound } = await Audio.Sound.createAsync(
        soundPaths[soundKey],
        { volume: finalVolume, shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            (Object.entries(channelPlayersRef.current) as [SoundChannel, Audio.Sound | null][]).forEach(([channelName, storedSound]) => {
              if (storedSound === sound) {
                channelPlayersRef.current[channelName] = null;
              }
            });
            sound.unloadAsync().catch(() => {});
          }
          if (!status.isLoaded && status.error) {
            FirebaseAnalytics.trackError('precision_audio_playback_error', {
              message: `Sound: ${soundKey}, Error: ${status.error}`,
              screen: 'usePrecisionAudioStatus',
            });
          }
        },
      );

      if (!allowOverlap && channel) {
        channelPlayersRef.current[channel] = sound;
      }

      if (config.analytics) {
        FirebaseAnalytics.trackEvent('precision_sound_played', { sound_name: soundKey });
      }
    } catch (error) {
      FirebaseAnalytics.trackError('precision_audio_playback_error', {
        message: `Sound: ${soundKey}, Error: ${error instanceof Error ? error.message : 'Unknown'}`,
        screen: 'playPrecisionSound',
      });
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
  const playPerfectAnswer = useCallback(() => {
    playSound('perfectAnswer');
  }, [playSound]);

  const playGoodAnswer = useCallback((intensity: 'close' | 'medium' = 'close') => {
    const volumeMultiplier = intensity === 'close' ? 1 : 0.8;
    playSound('goodAnswer', { volumeMultiplier });
  }, [playSound]);

  const playWrongAnswer = useCallback((intensity: 'far' | 'veryFar' = 'far') => {
    const volumeMultiplier = intensity === 'far' ? 0.8 : 1;
    playSound('wrongAnswer', { volumeMultiplier });
  }, [playSound]);

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

    if (absDifference === 0) {
      playPerfectAnswer();
    } else if (absDifference <= 7) {
      playGoodAnswer('close');
    } else if (absDifference <= 25) {
      playGoodAnswer('medium');
    } else if (absDifference <= 70) {
      playWrongAnswer('far');
    } else {
      playWrongAnswer('veryFar');
    }
  }, [playGoodAnswer, playPerfectAnswer, playWrongAnswer]);

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

  return {
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
  };
};
