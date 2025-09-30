// hooks/game/index.ts - Point d'entrée pour les hooks du jeu

// Export de tous les hooks individuels
export { useInitGame } from './useInitGame';
export { useTimer } from './useTimer';
export { useAds } from './useAds';
export { useAnalytics } from './useAnalytics'; // Ce hook contiendra probablement les logs Firebase Analytics
export { usePerformance } from './usePerformance';
export { useEventSelector } from './useEventSelector';  // Important - export du hook d'événements
export { usePrecisionGame } from './usePrecisionGame';

// Réexport des hooks existants
export { default as useAudio } from '../useAudio';
export { default as useRewards } from '../useRewards';
