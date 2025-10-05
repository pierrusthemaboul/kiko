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
  { key: 'ecuyer', label: 'Écuyer', partiesPerDay: 3, index: 1 },
  { key: 'chevalier-bachelier', label: 'Chevalier Bachelier', partiesPerDay: 3, index: 2 },
  { key: 'chevalier-banneret', label: 'Chevalier Banneret', partiesPerDay: 3, index: 3 },
  { key: 'baronnet', label: 'Baronnet', partiesPerDay: 4, index: 4 },
  { key: 'baron', label: 'Baron', partiesPerDay: 4, index: 5 },
  { key: 'vicomte', label: 'Vicomte', partiesPerDay: 4, index: 6 },
  { key: 'seigneur', label: 'Seigneur', partiesPerDay: 4, index: 7 },
  { key: 'comte', label: 'Comte', partiesPerDay: 5, index: 8 },
  { key: 'comte-palatin', label: 'Comte Palatin', partiesPerDay: 5, index: 9 },
  { key: 'marquis', label: 'Marquis', partiesPerDay: 5, index: 10 },
  { key: 'margrave', label: 'Margrave', partiesPerDay: 5, index: 11 },
  { key: 'duc', label: 'Duc', partiesPerDay: 6, index: 12 },
  { key: 'grand-duc', label: 'Grand Duc', partiesPerDay: 6, index: 13 },
  { key: 'prince', label: 'Prince', partiesPerDay: 6, index: 14 },
  { key: 'prince-electeur', label: 'Prince Électeur', partiesPerDay: 6, index: 15 },
  { key: 'archiduc', label: 'Archiduc', partiesPerDay: 6, index: 16 },
  { key: 'grand-prince', label: 'Grand Prince', partiesPerDay: 7, index: 17 },
  { key: 'souverain-prince', label: 'Souverain Prince', partiesPerDay: 7, index: 18 },
  { key: 'roi', label: 'Roi', partiesPerDay: 7, index: 19 },
  { key: 'grand-roi', label: 'Grand Roi', partiesPerDay: 7, index: 20 },
  { key: 'roi-tres-chretien', label: 'Roi Très-Chrétien', partiesPerDay: 7, index: 21 },
  { key: 'empereur', label: 'Empereur', partiesPerDay: 8, index: 22 },
  { key: 'cesar', label: 'César', partiesPerDay: 8, index: 23 },
  { key: 'augustus', label: 'Augustus', partiesPerDay: 8, index: 24 },
  { key: 'empereur-des-empereurs', label: 'Empereur des Empereurs', partiesPerDay: 8, index: 25 },
];

function xpCurve(index: number): number {
  // Nouvelle courbe plus généreuse (-25% XP requis environ)
  return Math.round(180 * index * index + 120 * index + 150);
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
