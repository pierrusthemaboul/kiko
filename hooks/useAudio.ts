// 1. Configuration Audio
// ==================
// 1.A. Imports et Types
// -------------------
import { useState, useCallback, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
// No longer using gameLogger, using console directly

// 1.B. Interfaces
// -------------
interface CachedSound {
  sound: Audio.Sound;
  status: Audio.PlaybackStatus;
  lastPlayed?: number;
}

// 2. Hook Principal
// ===============
export const useAudio = () => {
  // 2.A. États
  // ---------
  // 2.A.a. États des sons
  const [sounds, setSounds] = useState<{ [key: string]: CachedSound | null }>({
    correct: null,
    incorrect: null,
    levelUp: null,
    countdown: null,
    gameover: null,
  });

  // 2.A.b. États de contrôle
  const soundVolumeRef = useRef(0.80);
  const musicVolumeRef = useRef(0.80);
  const [soundVolume, setSoundVolume] = useState(0.80);
  const [musicVolume, setMusicVolume] = useState(0.80);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);
  const isInitialized = useRef(false);

  // 2.B. Configuration
  // ----------------
  // 2.B.a. Chemins des sons
  const soundPaths = {
    correct: require('../assets/sounds/corectok.wav'),
    incorrect: require('../assets/sounds/361260__japanyoshithegamer__8-bit-wrong-sound.wav'),
    levelUp: require('../assets/sounds/423455__ohforheavensake__trumpet-brass-fanfare.wav'),
    countdown: require('../assets/sounds/361254__japanyoshithegamer__8-bit-countdown-ready.wav'),
    gameover: require('../assets/sounds/242208__wagna__failfare.mp3')
  };

  // 3. Initialisation
  // ===============
  // 3.A. Configuration Initiale
  // -------------------------
  useEffect(() => {
    const initAudio = async () => {
      try {
        // 3.A.a. Configuration système
        const audioConfig = {
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false
        };

        await Audio.setAudioModeAsync(audioConfig);

        // 3.A.b. Chargement initial des sons
        for (const [key, path] of Object.entries(soundPaths)) {
          await loadSound(key);
        }

        isInitialized.current = true;
      } catch (error) {
        // Gestion d'erreur d'initialisation si besoin
      }
    };

    initAudio();

    // 3.B. Nettoyage
    // -------------
    return () => {
      isInitialized.current = false;
      Object.entries(sounds).forEach(async ([_, soundObj]) => {
        if (soundObj?.sound) {
          try {
            await soundObj.sound.unloadAsync();
          } catch (error) {
            // Gestion de l'erreur lors du déchargement si besoin
          }
        }
      });
    };
  }, []);

  // 4. Gestion des Sons
  // =================
  // 4.A. Chargement des Sons
  // ----------------------
  const loadSound = async (soundKey: string): Promise<Audio.Sound | null> => {
    try {
      if (!sounds[soundKey]) {
        const { sound, status } = await Audio.Sound.createAsync(
          soundPaths[soundKey],
          { 
            volume: soundVolumeRef.current * 0.1,
            shouldPlay: false,
            progressUpdateIntervalMillis: 50
          }
        );

        sound.setOnPlaybackStatusUpdate(status => {
          if (!status.isLoaded) {
            reloadSound(soundKey);
          }
          if (status.didJustFinish) {
            // Gérer la fin du son si besoin
          }
        });

        setSounds(prev => ({
          ...prev,
          [soundKey]: { 
            sound, 
            status,
            lastPlayed: Date.now()
          }
        }));

        return sound;
      }
      return sounds[soundKey]?.sound || null;
    } catch (error) {
      return null;
    }
  };

  // 4.B. Rechargement des Sons
  // ------------------------
  const reloadSound = async (soundKey: string) => {
    try {
      if (sounds[soundKey]?.sound) {
        await sounds[soundKey]?.sound.unloadAsync();
      }
      await loadSound(soundKey);
    } catch (error) {
      // Gestion de l'erreur lors du rechargement si besoin
    }
  };

  // 4.C. Lecture des Sons
  // -------------------
  const playSound = async (soundKey: string, volume: number = soundVolumeRef.current) => {
    if (!isSoundEnabled || !isInitialized.current) return;

    try {
      // Décharger l'ancien son s'il existe
      if (sounds[soundKey]?.sound) {
        try {
          await sounds[soundKey].sound.unloadAsync();
        } catch (err) {
          // Gestion de l'erreur si besoin
        }
      }

      // Créer une nouvelle instance du son
      const { sound, status } = await Audio.Sound.createAsync(
        soundPaths[soundKey],
        { volume: volume * 0.5, shouldPlay: false }
      );

      setSounds(prev => ({
        ...prev,
        [soundKey]: { sound, status, lastPlayed: Date.now() }
      }));

      await sound.setVolumeAsync(Math.min(volume * 0.5, 0.5));
      await sound.playAsync();

      sound.setOnPlaybackStatusUpdate(status => {
        if (status.didJustFinish) {
          sound.unloadAsync().catch(err => {
            // Gestion de l'erreur si besoin
          });
        }
      });

    } catch (error) {
      const soundToClean = sounds[soundKey]?.sound;
      if (soundToClean) {
        try {
          await soundToClean.unloadAsync();
        } catch (err) {
          // Gestion de l'erreur si besoin
        }
      }
    }
  };

  // 5. Fonctions de Lecture Spécifiques
  // =================================
  // 5.A. Sons du Jeu
  // --------------
  const playCorrectSound = useCallback(() => {
    return playSound('correct', soundVolumeRef.current * 0.2);
  }, [isSoundEnabled]);

  const playIncorrectSound = useCallback(() => {
    return playSound('incorrect', soundVolumeRef.current * 0.15);
  }, [isSoundEnabled]);

  const playLevelUpSound = useCallback(() => {
    return playSound('levelUp', soundVolumeRef.current * 0.1);
  }, [isSoundEnabled]);

  const playCountdownSound = useCallback(() => {
    return playSound('countdown', soundVolumeRef.current * 0.1);
  }, [isSoundEnabled]);

  const playGameOverSound = useCallback(() => {
    return playSound('gameover', soundVolumeRef.current * 0.15);
  }, [isSoundEnabled]);

  // 6. Contrôles Audio
  // ================
  // 6.A. Gestion du Volume
  // -------------------
  const setVolume = async (volume: number, type: 'sound' | 'music') => {
    try {
      const safeVolume = Math.min(volume, 0.1);
      if (type === 'sound') {
        soundVolumeRef.current = safeVolume;
        setSoundVolume(safeVolume);
        await Promise.all(
          Object.entries(sounds).map(async ([, soundObj]) => {
            if (soundObj?.sound) {
              try {
                await soundObj.sound.setVolumeAsync(safeVolume);
              } catch (error) {
                // Gestion de l'erreur si besoin
              }
            }
          })
        );
      } else {
        musicVolumeRef.current = safeVolume;
        setMusicVolume(safeVolume);
      }
    } catch (error) {
      // Gestion de l'erreur si besoin
    }
  };

  // 6.B. Contrôles de l'Audio
  // -----------------------
  const toggleSound = (enabled: boolean) => {
    setIsSoundEnabled(enabled);
  };

  const toggleMusic = (enabled: boolean) => {
    setIsMusicEnabled(enabled);
  };

  // 7. Fonctions pour charger/décharger l'ensemble des sons
  // ========================================================
  const loadSounds = async () => {
    for (const key of Object.keys(soundPaths)) {
      await loadSound(key);
    }
  };

  const unloadSounds = async () => {
    for (const key of Object.keys(sounds)) {
      if (sounds[key]?.sound) {
        try {
          await sounds[key]!.sound.unloadAsync();
        } catch (error) {
          // Gestion de l'erreur si besoin
        }
      }
    }
    setSounds({
      correct: null,
      incorrect: null,
      levelUp: null,
      countdown: null,
      gameover: null,
    });
  };

  // 8. Interface Publique
  // ===================
  return {
    playCorrectSound,
    playIncorrectSound,
    playLevelUpSound,
    playCountdownSound,
    playGameOverSound,
    setSoundVolume: (volume: number) => setVolume(volume, 'sound'),
    setMusicVolume: (volume: number) => setVolume(volume, 'music'),
    toggleSound,
    toggleMusic,
    isSoundEnabled,
    isMusicEnabled,
    soundVolume,
    musicVolume,
    loadSounds,    // Exposition de loadSounds
    unloadSounds,  // Exposition de unloadSounds
  };
};

export default useAudio;
