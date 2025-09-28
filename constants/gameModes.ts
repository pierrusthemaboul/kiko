export type GameModeId = 'classic' | 'chrono' | 'relax';

export interface GameModeConfig {
  id: GameModeId;
  label: string;
  description: string;
  timeLimit: number;
  initialLives: number;
  maxLives: number;
  scoreMultiplier: number;
  showDatesByDefault?: boolean;
  icon: string;
}

export const DEFAULT_GAME_MODE_ID: GameModeId = 'classic';

export const GAME_MODES: Record<GameModeId, GameModeConfig> = {
  classic: {
    id: 'classic',
    label: 'Classique',
    description: 'Progression équilibrée avec 20s par question et 3 vies.',
    timeLimit: 20,
    initialLives: 3,
    maxLives: 3,
    scoreMultiplier: 1,
    showDatesByDefault: false,
    icon: 'play-circle-outline',
  },
  chrono: {
    id: 'chrono',
    label: 'Mode Chrono',
    description: '12s par question, 2 vies seulement mais un multiplicateur de points.',
    timeLimit: 12,
    initialLives: 2,
    maxLives: 3,
    scoreMultiplier: 1.5,
    showDatesByDefault: false,
    icon: 'flash-outline',
  },
  relax: {
    id: 'relax',
    label: 'Mode Relax',
    description: '30s par question, 5 vies et dates visibles pour apprendre en douceur.',
    timeLimit: 30,
    initialLives: 5,
    maxLives: 5,
    scoreMultiplier: 0.75,
    showDatesByDefault: true,
    icon: 'leaf-outline',
  },
};

export function getGameModeConfig(modeId?: string): GameModeConfig {
  if (!modeId) {
    return GAME_MODES[DEFAULT_GAME_MODE_ID];
  }

  const normalized = modeId.toLowerCase() as GameModeId;
  return GAME_MODES[normalized] ?? GAME_MODES[DEFAULT_GAME_MODE_ID];
}

export const GAME_MODE_LIST = Object.values(GAME_MODES);
