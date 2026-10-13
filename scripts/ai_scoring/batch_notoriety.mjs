// batch_notoriety.mjs — recalibrage de notoriete_fr sur TOUT le catalogue AD.
// Résumable : chaque résultat est appendé dans scratch/ai_scoring/notoriety_progress.jsonl
// → relancer le script reprend là où ça s'est arrêté (quota journalier, crash...).
//
// Usage : node scripts/ai_scoring/batch_notoriety.mjs [maxCalls=400]
// Env   : AI_PROVIDER (défaut gemini conseillé : free tier), AI_MODEL via
//         GEMINI_MODEL_SCORING / MISTRAL_MODEL / OPENAI_MODEL,
//         MIN_INTERVAL_MS (défaut 1100), MAX_CALLS (surcharge argv)
import path from 'node:path';
import {
  supabaseClient, fetchAll, aiJson, mapPool, AI_PROVIDER, AI_MODEL,
  OUT_DIR, yearOf, NOTO_SYSTEM, notoUserPrompt,
  loadProgress, appendJsonl,
} from './lib.mjs';

const MAX_CALLS = Number(process.argv[2]) || Number(process.env.MAX_CALLS) || 400;
const PROGRESS = path.join(OUT_DIR, 'notoriety_progress.jsonl');
const keyOf = (r) => r.id;

async function main() {
  const supabase = supabaseClient();
  const events = await fetchAll(
    supabase, 'evenements',
    'id, titre, date, date_formatee, description_detaillee, notoriete_fr'
  );
  const ad = events
    .filter(e => e.date && e.date >= '0001-01-01' && e.titre)
    .sort((a, b) => (b.notoriete_fr ?? 0) - (a.notoriete_fr ?? 0)); // stars d'abord

  const done = loadProgress(PROGRESS, keyOf);
  const todo = ad.filter(e => !done.has(e.id)).slice(0, MAX_CALLS);

  console.log(`${AI_PROVIDER}/${AI_MODEL} | catalogue AD: ${ad.length} | déjà faits: ${done.size} | ce run: ${todo.length}`);
  if (!todo.length) { console.log('Rien à faire — catalogue complet.'); return; }

  let ok = 0, err = 0;
  const results = await mapPool(todo, 6, async (e) => {
    let out;
    try {
      out = await aiJson(NOTO_SYSTEM, notoUserPrompt(e));
    } catch (ex) {
      out = { error: ex.message };
    }
    const aiNoto = out.parsed?.notoriety;
    const row = {
      id: e.id, titre: e.titre, year: yearOf(e.date),
      notoriete_fr: e.notoriete_fr,
      ai_notoriety: aiNoto,
      delta: typeof aiNoto === 'number' ? aiNoto - (e.notoriete_fr ?? 0) : null,
      confidence: out.parsed?.confidence,
      reason: out.parsed?.reason,
      model: AI_MODEL, provider: AI_PROVIDER,
      error: out.parsed ? undefined : (out.error || 'json_parse_failed'),
      ts: new Date().toISOString(),
    };
    // N'écrire que les succès : les erreurs seront retentées au prochain run.
    if (row.error) err++; else { appendJsonl(PROGRESS, row); ok++; }
    if ((ok + err) % 25 === 0) console.log(`  ${ok + err}/${todo.length} (ok=${ok} err=${err})`);
    return row;
  });

  console.log(`\nTerminé ce run : ${ok} ok, ${err} erreurs → ${PROGRESS}`);
  if (err > 0) console.log('Relancer le script retentera les erreurs et continuera.');
  const remaining = ad.length - done.size - ok;
  if (remaining > 0) console.log(`Reste ~${remaining} événements — relancer demain si quota journalier atteint.`);
}

main().catch(e => { console.error(e); process.exit(1); });
