export interface ConvertConfig {
  basePerMode: { classic: number; date: number; precision: number };
  kPerMode: { classic: number; date: number; precision: number };
  alphaPerMode: { classic: number; date: number; precision: number };
  softcap: { threshold: number; slope: number };
  clamp: { min: number; max: number };
}

export const DEFAULT_CONVERT: ConvertConfig = {
  // Rééquilibrage v3 : récompenser les gros scores tout en ralentissant la progression
  basePerMode: { classic: 25, date: 30, precision: 35 },
  kPerMode: { classic: 0.45, date: 0.50, precision: 0.55 },
  alphaPerMode: { classic: 0.68, date: 0.66, precision: 0.70 },
  softcap: { threshold: 20000, slope: 0.45 }, // Softcap après 20k
  clamp: { min: 15, max: 800 }, // Max à 800 pour 50k+
};

function clampValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function pointsToXP(points: number, mode: 'classic' | 'date' | 'precision', cfg: ConvertConfig = DEFAULT_CONVERT): number {
  const x = Math.max(points, 0);
  const xpBase = cfg.basePerMode[mode];
  const k = cfg.kPerMode[mode];
  const alpha = cfg.alphaPerMode[mode];

  let xpRaw = xpBase + k * x ** alpha;

  if (x > cfg.softcap.threshold) {
    const surplus = x - cfg.softcap.threshold;
    xpRaw += k * (cfg.softcap.slope * surplus ** 0.5);
  }

  const xpRounded = Math.round(xpRaw);
  return clampValue(xpRounded, cfg.clamp.min, cfg.clamp.max);
}

export function previewTable(
  modes: Array<'classic' | 'date' | 'precision'>,
  pointsSamples: number[],
): Array<{ mode: string; points: number; xp: number }> {
  const table: Array<{ mode: string; points: number; xp: number }> = [];

  for (const mode of modes) {
    for (const points of pointsSamples) {
      table.push({
        mode,
        points,
        xp: pointsToXP(points, mode),
      });
    }
  }

  return table;
}
