// hooks/game/index.ts - Point d'entrée pour les hooks du jeu
console.log('[game/index] Module chargé');

// Export de tous les hooks individuels
export { useInitGame } from './useInitGame';
export { useTimer } from './useTimer';
export { useAds } from './useAds';
export { useAnalytics } from './useAnalytics';
export { usePerformance } from './usePerformance';
export { useEventSelector } from './useEventSelector';  // Important - export du hook d'événements

// Réexport des hooks existants
export { default as useAudio } from '../useAudio';
export { default as useRewards } from '../useRewards';

console.log('[game/index] Tous les hooks exportés');