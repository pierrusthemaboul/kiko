import React, { createContext, useContext, useRef, useState, ReactNode } from 'react';
import AudioWebView, { AudioWebViewRef } from '../components/AudioWebView';

interface AudioContextType {
  playSound: (soundName: string) => void;
  setVolume: (volume: number) => void;
  isReady: boolean;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const useAudioContext = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudioContext must be used within AudioProvider');
  }
  return context;
};

interface Props {
  children: ReactNode;
}

export const AudioProvider = ({ children }: Props) => {
  const audioRef = useRef<AudioWebViewRef>(null);
  const [isReady, setIsReady] = useState(false);

  const playSound = (soundName: string) => {
    if (isReady && audioRef.current) {
      audioRef.current.playSound(soundName);
    }
  };

  const setVolume = (volume: number) => {
    if (audioRef.current) {
      audioRef.current.setVolume(volume);
    }
  };

  return (
    <AudioContext.Provider value={{ playSound, setVolume, isReady }}>
      {children}
      <AudioWebView ref={audioRef} onReady={() => setIsReady(true)} />
    </AudioContext.Provider>
  );
};
