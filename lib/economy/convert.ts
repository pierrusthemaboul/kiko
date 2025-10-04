export interface ConvertConfig {
  basePerMode: { classic: number; date: number };
  kPerMode: { classic: number; date: number };
  alphaPerMode: { classic: number; date: number };
  softcap: { threshold: number; slope: number };
  clamp: { min: number; max: number };
}

export const DEFAULT_CONVERT: ConvertConfig = {
  basePerMode: { classic: 30, date: 40 },
  kPerMode: { classic: 0.6, date: 0.7 },
  alphaPerMode: { classic: 0.72, date: 0.7 },
  softcap: { threshold: 800, slope: 0.5 },
  clamp: { min: 10, max: 400 },
};

function clampValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function pointsToXP(points: number, mode: 'classic' | 'date', cfg: ConvertConfig = DEFAULT_CONVERT): number {
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
  modes: Array<'classic' | 'date'>,
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
