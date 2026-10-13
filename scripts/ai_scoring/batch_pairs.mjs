// batch_pairs.mjs — scoring IA des paires d'événements pertinentes.
// Génère ~13k paires (chaque événement Zone A × 4 même-période + 4 lointains
// + 4 expansion hors Zone A), les note via LLM, résultats appendés dans
// scratch/ai_scoring/pairs_progress.jsonl → résumable entre les quotas journaliers.
//
// Usage : node scripts/ai_scoring/batch_pairs.mjs [maxCalls=800]
// Env   : AI_PROVIDER (défaut gemini conseillé), GEMINI_MODEL_SCORING / MISTRAL_MODEL /
//         OPENAI_MODEL, MIN_INTERVAL_MS (défaut 1100), MAX_CALLS
import path from 'node:path';
import {
  supabaseClient, fetchAll, aiJson, mapPool, AI_PROVIDER, AI_MODEL,
  OUT_DIR, yearOf, periodOf, PAIR_SYSTEM, pairUserPrompt,
  loadProgress, appendJsonl, makeRng,
} from './lib.mjs';

const MAX_CALLS = Number(process.argv[2]) || Number(process.env.MAX_CALLS) || 800;
const PARTNERS_PER_KIND = 4; // par événement Zone A, par type de partenaire
const PROGRESS = path.join(OUT_DIR, 'pairs_progress.jsonl');
const pairKey = (aId, bId) => [aId, bId].sort().join('|');
const keyOf = (r) => pairKey(r.a_id, r.b_id);

const yearDiff = (a, b) => Math.abs(yearOf(a.date) - yearOf(b.date));

// Liste déterministe des paires (seed fixe → stable entre les runs)
function buildPairList(zoneA, outside, allAd) {
  const rng = makeRng(42);
  const byId = new Map(allAd.map(e => [e.id, e]));
  const used = new Set();
  const pairs = [];

  const pickFrom = (pool, pred) => {
    for (let i = 0; i < pool.length * 3; i++) {
      const c = pool[Math.floor(rng() * pool.length)];
      if (!pred || pred(c)) return c;
    }
    return null;
  };

  for (const anchor of zoneA) {
    const addPartner = (cand, tag) => {
      if (!cand || cand.id === anchor.id) return;
      if (yearOf(cand.date) === yearOf(anchor.date)) return;
      const key = pairKey(anchor.id, cand.id);
      if (used.has(key)) return;
      used.add(key);
      pairs.push({ a: anchor, b: cand, tag });
    };

    for (let i = 0; i < PARTNERS_PER_KIND; i++) {
      addPartner(pickFrom(zoneA, c => periodOf(c.date) === periodOf(anchor.date)), 'same_period');
      addPartner(pickFrom(zoneA, c => yearDiff(c, anchor) >= 300), 'far_apart');
      addPartner(pickFrom(outside), 'expansion');
    }
  }
  // Trier : ancres les plus notoires d'abord (impact max si run partiel)
  return pairs.sort((x, y) => (y.a.notoriete_fr ?? 0) - (x.a.notoriete_fr ?? 0));
}

async function main() {
  const supabase = supabaseClient();
  const events = await fetchAll(
    supabase, 'evenements',
    'id, titre, date, date_formatee, description_detaillee, notoriete_fr'
  );
  const allAd = events.filter(e => e.date && e.date >= '0001-01-01' && e.titre);
  const zoneA = allAd.filter(e => (e.notoriete_fr ?? 0) >= 70);
  const outside = allAd.filter(e => (e.notoriete_fr ?? 0) < 70);
  console.log(`Catalogue AD: ${allAd.length} | Zone A: ${zoneA.length} | hors: ${outside.length}`);

  const done = loadProgress(PROGRESS, keyOf);
  const allPairs = buildPairList(zoneA, outside, allAd);
  const todo = allPairs.filter(p => !done.has(pairKey(p.a.id, p.b.id))).slice(0, MAX_CALLS);

  console.log(`Paires totales: ${allPairs.length} | déjà faites: ${done.size} | ce run: ${todo.length}`);
  if (!todo.length) { console.log('Rien à faire — liste complète.'); return; }

  let ok = 0, err = 0;
  await mapPool(todo, 6, async ({ a, b, tag }) => {
    let out;
    try {
      out = await aiJson(PAIR_SYSTEM, pairUserPrompt(a, b));
    } catch (ex) {
      out = { error: ex.message };
    }
    const p = out.parsed;
    const row = {
      a_id: a.id, a_titre: a.titre, a_year: yearOf(a.date), a_noto: a.notoriete_fr,
      b_id: b.id, b_titre: b.titre, b_year: yearOf(b.date), b_noto: b.notoriete_fr,
      tag, year_gap: yearDiff(a, b),
      guessability: p?.guessability, confusability: p?.confusability,
      interest: p?.interest, known_a: p?.known_a, known_b: p?.known_b,
      confidence: p?.confidence, reason: p?.reason,
      model: AI_MODEL, provider: AI_PROVIDER,
      error: p ? undefined : (out.error || 'json_parse_failed'),
      ts: new Date().toISOString(),
    };
    if (row.error) err++; else { appendJsonl(PROGRESS, row); ok++; }
    if ((ok + err) % 50 === 0) console.log(`  ${ok + err}/${todo.length} (ok=${ok} err=${err})`);
    return row;
  });

  console.log(`\nTerminé ce run : ${ok} ok, ${err} erreurs → ${PROGRESS}`);
  const remaining = allPairs.length - done.size - ok;
  if (remaining > 0) console.log(`Reste ~${remaining} paires — relancer demain si quota journalier atteint.`);
}

main().catch(e => { console.error(e); process.exit(1); });
