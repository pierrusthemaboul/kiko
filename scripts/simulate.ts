// scripts/simulate.ts
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import crypto from 'node:crypto';
import 'dotenv/config';
import { LEVEL_CONFIGS } from '../hooks/levelConfigs';

type Event = {
  id: string;
  date: string;
  titre: string;
  niveau_difficulte: number | null;
  frequency_score: number | null;
  notoriete: number | null;
};

// -------- CLI params --------
const args = Object.fromEntries(process.argv.slice(2).map(a => a.split('=')));
const MAX_TURNS = args['--turns'] ? Number(args['--turns']) : Infinity;
// seed aléatoire par défaut si non fourni
const SEED = args['--seed'] ? Number(args['--seed']) : crypto.randomInt(2 ** 31 - 1);
// skill joueur (0–1)
const PLAYER_SKILL = Math.max(0.0, Math.min(1.0, Number(args['--skill'] ?? 0.65))); // défaut 0.65

// -------- RNG (seeded) ------
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(SEED);

// ----- Supabase env ---------
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[simulate] Variables manquantes SUPABASE_URL / ANON_KEY');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ----- Constantes / caches ---
const ANTIQUE_EVENTS_LIMITS = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };
const ANTIQUE_YEAR_THRESHOLD = 500;
const MAX_EVENTS_TO_PROCESS = 150;
const MAX_SCORING_POOL = 100;

const dateCache = new Map<string, { year: number; ts: number }>();
function getYear(dateStr: string) {
  if (!dateCache.has(dateStr)) {
    const d = new Date(dateStr);
    dateCache.set(dateStr, { year: d.getFullYear(), ts: d.getTime() });
  }
  return dateCache.get(dateStr)!.year;
}
function timeDiffYears(a: string | null, b: string | null) {
  if (!a || !b) return Infinity;
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  return Math.abs(ta - tb) / (365.25 * 24 * 3600 * 1000);
}
function getPeriod(y: number) {
  if (y < 500) return 'Antiquité';
  if (y < 1500) return 'Moyen Âge';
  if (y < 1800) return 'Renaissance';
  if (y < 1900) return '19e';
  if (y < 2000) return '20e';
  return '21e';
}

const isAntique = (e: Event | null) => (e?.date ? getYear(e.date) < ANTIQUE_YEAR_THRESHOLD : false);
let antiqueEventsCount = 0;
const canAddAntiqueEvent = (level: number) => {
  const limit = ANTIQUE_EVENTS_LIMITS[Math.min(Math.max(level, 1), 5) as 1|2|3|4|5] || 5;
  return antiqueEventsCount < limit;
};

// -------- Pré-filtre (logique jeu) ----------
function preFilterEvents(events: Event[], used: Set<string>, level: number, ref: Event): Event[] {
  const config = LEVEL_CONFIGS[level];
  if (!config) return [];
  let filtered = events.filter(e => !used.has(e.id) && e.date && e.id !== ref.id);

  // Difficulté selon config réelle du niveau
  const minDiff = (config.difficulty?.min ?? 1);
  const maxDiff = (config.difficulty?.max ?? 7);
  filtered = filtered.filter(e => {
    const d = e.niveau_difficulte ?? 1;
    return d >= minDiff && d <= maxDiff;
  });

  // Fenêtre temporelle selon config (base)
  const timeGapBase = config.timeGap?.base ?? 100;
  filtered = filtered.filter(e => timeDiffYears(e.date, ref.date) <= timeGapBase * 3);

  // Gestion antiques
  if (!canAddAntiqueEvent(level)) filtered = filtered.filter(e => !isAntique(e));

  // Rareté
  filtered.sort((a, b) => (a.frequency_score || 0) - (b.frequency_score || 0));
  return filtered.slice(0, MAX_EVENTS_TO_PROCESS);
}

// -------- Scoring (logique jeu) -------------
const scoringCache = new Map<string, number>();
function scoreEventOptimized(evt: Event, ref: Event, level: number, timeGap: any): number {
  const key = `${evt.id}-${ref.id}-${level}`;
  if (scoringCache.has(key)) return scoringCache.get(key)!;

  const td = timeDiffYears(evt.date, ref.date);
  if (!isFinite(td)) return -Infinity;

  const randomFactor = 0.9 + rng() * 0.2; // bruit léger
  const idealGap = timeGap.base || 100;

  let gapScore = 0;
  if (idealGap > 0) {
    const diffRatio = Math.abs(td - idealGap) / idealGap;
    gapScore = 35 * Math.max(0, 1 - diffRatio) * randomFactor;
  }

  const idealDifficulty = Math.min(7, Math.max(1, Math.ceil(level / 2)));
  let difficultyScore = 0;
  if (evt.niveau_difficulte != null) {
    difficultyScore = 25 * (1 - Math.abs(evt.niveau_difficulte - idealDifficulty) / 7) * randomFactor;
  }

  const frequencyScore = evt.frequency_score || 0;
  const frequencyMalus = Math.min(500, frequencyScore * 10);
  const variationBonus = rng() * 10;

  const total = Math.max(0, gapScore + difficultyScore + variationBonus - frequencyMalus);
  scoringCache.set(key, total);
  return total;
}

// -------- Sélection avec fallback (logique jeu) --------
async function selectNewEvent(
  events: Event[],
  reference: Event,
  level: number,
  used: Set<string>
): Promise<Event | null> {
  const config = LEVEL_CONFIGS[level];
  if (!config) return null;

  const pre = preFilterEvents(events, used, level, reference);
  if (!pre.length) return null;

  const refYear = getYear(reference.date);
  const proximityFactor = Math.max(0.2, Math.min(1, 1 - (new Date().getFullYear() - refYear) / 2000));
  const timeGap = {
    base: (config.timeGap?.base || 100) * proximityFactor,
    min: Math.max(10, (config.timeGap?.minimum || 50) * proximityFactor),
    max: Math.max(200, (config.timeGap?.base || 100) * 1.5 * proximityFactor)
  };

  const pool = pre.slice(0, MAX_SCORING_POOL);
  let scored = pool
    .map(evt => ({ evt, score: scoreEventOptimized(evt, reference, level, timeGap), td: timeDiffYears(evt.date, reference.date) }))
    .filter(s => isFinite(s.score) && s.score > 0 && s.td >= timeGap.min && s.td <= timeGap.max)
    .sort((a, b) => b.score - a.score);

  // Fallback 1 : élargir la fenêtre
  if (!scored.length) {
    const relaxedMin = timeGap.min * 0.3;
    const relaxedMax = timeGap.max * 2;
    scored = pool
      .map(evt => ({ evt, score: scoreEventOptimized(evt, reference, level, timeGap), td: timeDiffYears(evt.date, reference.date) }))
      .filter(s => isFinite(s.score) && s.score > 0 && s.td >= relaxedMin && s.td <= relaxedMax)
      .sort((a, b) => b.score - a.score);
  }

  // Fallback 2 : petit pool aléatoire
  if (!scored.length) {
    const randomPool = pre.slice(0, Math.min(10, pre.length)).map(evt => ({
      evt, score: rng() * 100, td: timeDiffYears(evt.date, reference.date)
    }));
    scored = randomPool;
  }

  if (!scored.length) return null;

  const top = scored.slice(0, Math.min(5, scored.length));
  return top[Math.floor(rng() * top.length)].evt;
}

/** Probabilité de bonne réponse (approx réaliste) — ne modifie PAS la sélection */
function probCorrect(ref: Event, pick: Event, level: number) {
  const gapY = timeDiffYears(ref.date, pick.date);
  const gapEase = Math.min(0.35, Math.log10(1 + gapY) / 10);   // + si écart grand
  const diff = pick.niveau_difficulte ?? 3;
  const diffMalus = Math.min(0.25, (diff - 3) * 0.05);         // - si difficile
  const noto = pick.notoriete ?? 50;
  const notoBonus = (noto - 50) / 1000;                        // +/- 0.05
  const levelTension = Math.min(0.10, (level - 1) * 0.02);     // - si niveau haut
  let p = PLAYER_SKILL + gapEase - diffMalus + notoBonus - levelTension;
  if (level <= 2) p += 0.03;
  return Math.max(0.05, Math.min(0.95, p));
}

// ---- helpers stats notoriété (robustes) ----
function quantile(sorted: number[], q: number) {
  if (!sorted.length) return null;
  const p = (sorted.length - 1) * q;
  const b = Math.floor(p), a = Math.ceil(p);
  if (a === b) return sorted[a];
  return sorted[b] + (sorted[a] - sorted[b]) * (p - b);
}
function mean(arr: number[]) { return arr.length ? arr.reduce((s,x)=>s+x,0)/arr.length : null; }
function stdev(arr: number[]) {
  if (arr.length < 2) return null;
  const m = mean(arr)!;
  return Math.sqrt(arr.reduce((s,x)=>s+(x-m)**2,0)/(arr.length-1));
}
function histogram20s(arr: number[]) {
  const vals = arr.filter(v => Number.isFinite(v));
  const bins = [[0,20],[20,40],[40,60],[60,80],[80,100]];
  const h: Record<string, number> = {};
  for (const [lo, hi] of bins) {
    const key = `${lo}-${hi}`;
    h[key] = vals.filter(v => v >= lo && v < (hi === 100 ? 101 : hi)).length;
  }
  return h;
}
function makeNotoStats(arr: number[]) {
  const vals = arr.filter(v => typeof v === 'number' && Number.isFinite(v));
  if (!vals.length) {
    return {
      count: 0, min: null, q1: null, median: null, q3: null, max: null,
      avg: null, stdev: null, pct_ge_80: null, histogram_20s: histogram20s([])
    };
  }
  const s = [...vals].sort((a,b)=>a-b);
  const m = mean(vals)!;
  const sd = stdev(vals);
  return {
    count: vals.length,
    min: s[0],
    q1: quantile(s, 0.25),
    median: quantile(s, 0.5),
    q3: quantile(s, 0.75),
    max: s[s.length - 1],
    avg: Number(m.toFixed(2)),
    stdev: sd == null ? null : Number(sd.toFixed(2)),
    pct_ge_80: Number((100 * vals.filter(v=>v>=80).length / vals.length).toFixed(1)),
    histogram_20s: histogram20s(vals)
  };
}

// --------------- Simulation “vraie partie” ---------------
(async () => {
  const { data, error } = await supabase.from('evenements').select('*');
  if (error) throw error;
  const all = (data as Event[]).filter(e => e.id && e.date && e.titre && e.niveau_difficulte != null);

  let level = 1;
  let lives = 3;
  let eventsDoneInLevel = 0;  // compteur par niveau
  let totalCorrect = 0;
  let turns = 0;

  let ref = all[Math.floor(rng() * all.length)];
  const used = new Set<string>([ref.id]);
  const picks: Event[] = [];       // réussis
  const errorsArr: Event[] = [];   // tentés mais ratés
  const proposed: Event[] = [];    // tous les événements proposés (réussis + ratés)
  const logLines: string[] = [];

  // agrégations notoriété par niveau
  const notoProposedByLevel: Record<number, number[]> = {};
  const notoPickedByLevel: Record<number, number[]> = {};

  // agrégations par période / difficulté (moyennes)
  const sumNotoByPeriod: Record<string, {sum:number; n:number}> = {};
  const sumNotoByDiff: Record<string, {sum:number; n:number}> = {};

  while (lives > 0 && turns < MAX_TURNS) {
    const evt = await selectNewEvent(all, ref, level, used);
    if (!evt) break;

    proposed.push(evt);
    if (!notoProposedByLevel[level]) notoProposedByLevel[level] = [];
    if (typeof evt.notoriete === 'number') notoProposedByLevel[level].push(evt.notoriete);

    // Mises à jour agrégations période/diff pour proposés
    const y = getYear(evt.date);
    const period = getPeriod(y);
    const diffKey = String(evt.niveau_difficulte ?? 0);
    if (typeof evt.notoriete === 'number') {
      sumNotoByPeriod[period] = sumNotoByPeriod[period] || {sum:0,n:0};
      sumNotoByPeriod[period].sum += evt.notoriete; sumNotoByPeriod[period].n++;
      sumNotoByDiff[diffKey] = sumNotoByDiff[diffKey] || {sum:0,n:0};
      sumNotoByDiff[diffKey].sum += evt.notoriete; sumNotoByDiff[diffKey].n++;
    }

    const p = probCorrect(ref, evt, level);
    const ok = rng() < p;

    // prépare les prochaines valeurs (log après MAJ)
    let nextLives = lives;
    let nextEventsDoneInLevel = eventsDoneInLevel;
    let nextLevel = level;
    let nextRef = ref;

    if (ok) {
      nextEventsDoneInLevel += 1;
      totalCorrect += 1;
      picks.push(evt);
      used.add(evt.id);
      nextRef = evt;
      if (isAntique(evt)) antiqueEventsCount++;
      const need = LEVEL_CONFIGS[level]?.eventsNeeded ?? Infinity;
      if (nextEventsDoneInLevel >= need) {
        nextLevel += 1;
        nextEventsDoneInLevel = 0;
        antiqueEventsCount = 0;
      }
      if (!notoPickedByLevel[level]) notoPickedByLevel[level] = [];
      if (typeof evt.notoriete === 'number') notoPickedByLevel[level].push(evt.notoriete);
    } else {
      errorsArr.push(evt);
      nextLives -= 1;
      nextEventsDoneInLevel = 0;
      used.add(evt.id);
      nextRef = evt; // avance la timeline même en cas d’erreur
    }

    const line = `${turns + 1}. ${evt.titre} (${y}) — diff:${evt.niveau_difficulte} noto:${evt.notoriete} → ${ok ? '✅' : '❌'} (p=${p.toFixed(2)}) lvl:${nextLevel} lives:${nextLives} inLevel:${nextEventsDoneInLevel}`;
    console.log(line);
    logLines.push(line);

    // commit l’état
    lives = nextLives;
    eventsDoneInLevel = nextEventsDoneInLevel;
    level = nextLevel;
    ref = nextRef;

    turns += 1;
  }

  // CSV — réussis
  const csv = ['idx,titre,annee,difficulte,notoriete'];
  picks.forEach((e, idx) => {
    const y = getYear(e.date);
    csv.push(`${idx + 1},"${e.titre.replace(/\"/g, '""')}",${y},${e.niveau_difficulte ?? ''},${e.notoriete ?? ''}`);
  });
  fs.writeFileSync(path.join('simulation.csv'), csv.join('\n'));

  // CSV — proposés (tous)
  const csvProp = ['idx,titre,annee,difficulte,notoriete'];
  proposed.forEach((e, idx) => {
    const y = getYear(e.date);
    csvProp.push(`${idx + 1},"${e.titre.replace(/\"/g, '""')}",${y},${e.niveau_difficulte ?? ''},${e.notoriete ?? ''}`);
  });
  fs.writeFileSync(path.join('proposed.csv'), csvProp.join('\n'));

  // CSV — erreurs
  const csvErr = ['idx,titre,annee,difficulte,notoriete'];
  errorsArr.forEach((e, idx) => {
    const y = getYear(e.date);
    csvErr.push(`${idx + 1},"${e.titre.replace(/\"/g, '""')}",${y},${e.niveau_difficulte ?? ''},${e.notoriete ?? ''}`);
  });
  fs.writeFileSync(path.join('errors.csv'), csvErr.join('\n'));

  // ---- Résumé + stats notoriété enrichies ----
  const diffs = picks.map(e => e.niveau_difficulte!).filter(n => n != null);
  const notorietesPicked = picks.map(e => e.notoriete!).filter(n => n != null);
  const notorietesProposed = proposed.map(e => e.notoriete!).filter(n => n != null);

  // périodes: répartition (sur picks)
  const periodDist: Record<string, number> = {};
  picks.forEach(e => {
    const y = getYear(e.date);
    const p = getPeriod(y);
    periodDist[p] = (periodDist[p] || 0) + 1;
  });

  // moyennes par période / difficulté (sur proposés)
  const periodNotoAvg = Object.fromEntries(
    Object.entries(sumNotoByPeriod).map(([k,{sum,n}]) => [k, n ? Number((sum/n).toFixed(2)) : null])
  );
  const diffNotoAvg = Object.fromEntries(
    Object.entries(sumNotoByDiff).map(([k,{sum,n}]) => [k, n ? Number((sum/n).toFixed(2)) : null])
  );

  // par niveau : stats notoriété sur proposés et sur réussis
  const levelsEncountered = Array.from(new Set([...Object.keys(notoProposedByLevel), ...Object.keys(notoPickedByLevel)]))
    .map(Number).sort((a,b)=>a-b);
  const notoByLevel: Record<number, { proposed: ReturnType<typeof makeNotoStats>, picked: ReturnType<typeof makeNotoStats> }> = {};
  for (const lv of levelsEncountered) {
    const prop = (notoProposedByLevel[lv] || []).filter(v => Number.isFinite(v));
    const pick = (notoPickedByLevel[lv] || []).filter(v => Number.isFinite(v));
    notoByLevel[lv] = {
      proposed: makeNotoStats(prop),
      picked: makeNotoStats(pick),
    };
  }

  // comparaison globales (proposés vs réussis)
  const proposedStats = makeNotoStats(notorietesProposed);
  const pickedStats = makeNotoStats(notorietesPicked);

  const summary = {
    seed: SEED,
    playerSkill: PLAYER_SKILL,
    final: { level, lives, turns, totalCorrect },
    counts: {
      proposed: proposed.length,
      picked: picks.length,
      errors: errorsArr.length,
      uniqueProposed: new Set(proposed.map(e => e.id)).size,
      uniquePicked: new Set(picks.map(e => e.id)).size,
    },
    difficultyPicked: {
      min: diffs.length ? Math.min(...diffs) : null,
      max: diffs.length ? Math.max(...diffs) : null,
      avg: diffs.length ? Number((diffs.reduce((a,b)=>a+b,0)/diffs.length).toFixed(2)) : null
    },
    notoriete: {
      overall: { proposed: proposedStats, picked: pickedStats },
      byLevel: notoByLevel,
      avgByPeriod_proposed: periodNotoAvg,
      avgByDifficulty_proposed: diffNotoAvg,
      periodsPickedDist: periodDist
    }
  };

  fs.writeFileSync(path.join('summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join('simulation.log'), logLines.join('\n'));

  // résumé console
  console.log(`\n=== FIN ===
Seed: ${SEED}
Tours: ${turns}
Proposés: ${proposed.length} | Réussis: ${picks.length} | Erreurs: ${errorsArr.length}
Niveau final: ${level}
Vies restantes: ${lives}`);
})().catch(err => console.error(err));
