import React, { createContext, useContext, useRef, useState, ReactNode, useCallback, useEffect } from 'react';
import MusicWebView, { MusicWebViewRef } from '../components/MusicWebView';
import MusicManager from '../services/MusicManager';

interface MusicContextType {
  isReady: boolean;
}

const MusicContext = createContext<MusicContextType | null>(null);

export const useMusicContext = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusicContext must be used within MusicProvider');
  }
  return context;
};

interface Props {
  children: ReactNode;
}

/**
 * MusicProvider - Provider pour la musique de fond
 *
 * Fournit une WebView cachée pour la lecture de musique avec crossfade.
 * Le MusicManager singleton gère les commandes et l'état.
 */
export const MusicProvider = ({ children }: Props) => {
  const musicRef = useRef<MusicWebViewRef>(null);
  const [isReady, setIsReady] = useState(false);

  // Connecter MusicManager à la WebView quand elle est prête
  useEffect(() => {
    if (isReady && musicRef.current) {
      MusicManager.setSendCommandCallback((command) => {
        musicRef.current?.sendCommand(command);
      });
      console.log('[MusicProvider] MusicManager connected to WebView');
    }
  }, [isReady]);

  const handleReady = useCallback(() => {
    setIsReady(true);
    console.log('[MusicProvider] Music system ready');
  }, []);

  const handleTrackChange = useCallback((trackName: string) => {
    console.log('[MusicProvider] Track changed:', trackName);
  }, []);

  const handleStopped = useCallback(() => {
    console.log('[MusicProvider] Music stopped');
  }, []);

  return (
    <MusicContext.Provider value={{ isReady }}>
      {children}
      <MusicWebView
        ref={musicRef}
        onReady={handleReady}
        onTrackChange={handleTrackChange}
        onStopped={handleStopped}
      />
    </MusicContext.Provider>
  );
};

export default MusicProvider;
