export type RankKey = string;

export interface Rank {
  key: RankKey;
  label: string;
  partiesPerDay: number;
  xpTotalRequired: number;
  index: number;
}

const rawRanks: Array<Omit<Rank, 'xpTotalRequired'>> = [
  { key: 'page', label: 'Page', partiesPerDay: 3, index: 0 },
  { key: 'ecuyer', label: 'Écuyer', partiesPerDay: 4, index: 1 },
  { key: 'chevalier-bachelier', label: 'Chevalier Bachelier', partiesPerDay: 5, index: 2 },
  { key: 'chevalier-banneret', label: 'Chevalier Banneret', partiesPerDay: 6, index: 3 },
  { key: 'baronnet', label: 'Baronnet', partiesPerDay: 7, index: 4 },
  { key: 'baron', label: 'Baron', partiesPerDay: 8, index: 5 },
  { key: 'vicomte', label: 'Vicomte', partiesPerDay: 9, index: 6 },
  { key: 'seigneur', label: 'Seigneur', partiesPerDay: 10, index: 7 },
  { key: 'comte', label: 'Comte', partiesPerDay: 11, index: 8 },
  { key: 'comte-palatin', label: 'Comte Palatin', partiesPerDay: 12, index: 9 },
  { key: 'marquis', label: 'Marquis', partiesPerDay: 13, index: 10 },
  { key: 'margrave', label: 'Margrave', partiesPerDay: 14, index: 11 },
  { key: 'duc', label: 'Duc', partiesPerDay: 15, index: 12 },
  { key: 'grand-duc', label: 'Grand Duc', partiesPerDay: 16, index: 13 },
  { key: 'prince', label: 'Prince', partiesPerDay: 17, index: 14 },
  { key: 'prince-electeur', label: 'Prince Électeur', partiesPerDay: 18, index: 15 },
  { key: 'archiduc', label: 'Archiduc', partiesPerDay: 19, index: 16 },
  { key: 'grand-prince', label: 'Grand Prince', partiesPerDay: 20, index: 17 },
  { key: 'souverain-prince', label: 'Souverain Prince', partiesPerDay: 21, index: 18 },
  { key: 'roi', label: 'Roi', partiesPerDay: 22, index: 19 },
  { key: 'grand-roi', label: 'Grand Roi', partiesPerDay: 23, index: 20 },
  { key: 'roi-tres-chretien', label: 'Roi Très-Chrétien', partiesPerDay: 24, index: 21 },
  { key: 'empereur', label: 'Empereur', partiesPerDay: 25, index: 22 },
  { key: 'cesar', label: 'César', partiesPerDay: 26, index: 23 },
  { key: 'augustus', label: 'Augustus', partiesPerDay: 27, index: 24 },
  { key: 'empereur-des-empereurs', label: 'Empereur des Empereurs', partiesPerDay: 28, index: 25 },
];

function xpCurve(index: number): number {
  // Courbe rééquilibrée v3 : progression 2.5x plus exigeante
  return Math.round(1125 * index * index + 750 * index + 1000);
}

export const RANKS: Rank[] = rawRanks.map((rank) => ({
  ...rank,
  xpTotalRequired: xpCurve(rank.index),
}));

export function rankFromXP(xpTotal: number): Rank {
  const normalizedXp = Number.isFinite(xpTotal) ? xpTotal : 0;

  for (let i = RANKS.length - 1; i >= 0; i -= 1) {
    if (normalizedXp >= RANKS[i].xpTotalRequired) {
      return RANKS[i];
    }
  }

  return RANKS[0];
}

export function nextRankProgress(xpTotal: number): { current: Rank; next?: Rank; progress: number; needed: number } {
  const current = rankFromXP(xpTotal);
  const next = RANKS[current.index + 1];

  if (!next) {
    return {
      current,
      next: undefined,
      progress: 0,
      needed: 0,
    };
  }

  const normalizedXp = Number.isFinite(xpTotal) ? xpTotal : 0;
  const progress = Math.max(0, normalizedXp - current.xpTotalRequired);
  const needed = Math.max(0, next.xpTotalRequired - normalizedXp);

  return { current, next, progress, needed };
}

export function partiesPerDayFromXP(xpTotal: number): number {
  return rankFromXP(xpTotal).partiesPerDay;
}
