// eval_notoriety.mjs — recalibre la notoriété d'un échantillon via un LLM
// et compare avec notoriete_fr (soupçon : paquet gonflé à 95).
//
// Usage : node scripts/ai_scoring/eval_notoriety.mjs [tailleEchantillon=100]
// Env   : AI_PROVIDER=mistral|openai (défaut mistral), MISTRAL_API_KEY / OPENAI_API_KEY,
//         MISTRAL_MODEL / OPENAI_MODEL, SEED, MIN_INTERVAL_MS
import {
  supabaseClient, fetchAll, aiJson, mapPool, AI_PROVIDER, AI_MODEL,
  makeRng, writeJsonl, yearOf, NOTO_SYSTEM, notoUserPrompt,
} from './lib.mjs';

const SAMPLE_SIZE = Number(process.argv[2]) || 100;

const bucket = (n) => {
  const v = n ?? 0;
  if (v >= 95) return 'noto_95plus';
  if (v >= 80) return 'noto_80_94';
  if (v >= 70) return 'noto_70_79';
  return 'noto_lt70';
};

async function main() {
  const supabase = supabaseClient();
  const events = await fetchAll(
    supabase, 'evenements',
    'id, titre, date, date_formatee, description_detaillee, notoriete_fr, frequency_score'
  );
  const ad = events.filter(e => e.date && e.date >= '0001-01-01' && e.titre);
  console.log(`Catalogue AD: ${ad.length} événements`);

  // Échantillon stratifié : quotas égaux par tranche de notoriete_fr
  const rng = makeRng();
  const buckets = { noto_95plus: [], noto_80_94: [], noto_70_79: [], noto_lt70: [] };
  for (const e of ad) buckets[bucket(e.notoriete_fr)].push(e);
  for (const k of Object.keys(buckets)) {
    buckets[k] = buckets[k].sort(() => rng() - 0.5);
    console.log(`  ${k}: ${buckets[k].length} événements au total`);
  }

  const perBucket = Math.floor(SAMPLE_SIZE / 4);
  const sample = Object.entries(buckets).flatMap(([k, arr]) =>
    arr.slice(0, perBucket).map(e => ({ ...e, _bucket: k }))
  );
  console.log(`Échantillon: ${sample.length} événements — appels ${AI_PROVIDER} (${AI_MODEL})...`);

  let done = 0;
  const results = await mapPool(sample, 6, async (e) => {
    let out;
    try {
      out = await aiJson(NOTO_SYSTEM, notoUserPrompt(e));
    } catch (err) {
      out = { error: err.message };
    }
    done++;
    if (done % 20 === 0) console.log(`  ${done}/${sample.length}`);
    const aiNoto = out.parsed?.notoriety;
    return {
      id: e.id, titre: e.titre, year: yearOf(e.date),
      notoriete_fr: e.notoriete_fr, bucket: e._bucket,
      ai_notoriety: aiNoto,
      delta: typeof aiNoto === 'number' ? aiNoto - (e.notoriete_fr ?? 0) : null,
      confidence: out.parsed?.confidence,
      reason: out.parsed?.reason,
      error: out.parsed ? undefined : (out.error || 'json_parse_failed'),
    };
  });

  const file = writeJsonl(`notoriety_${Date.now()}.jsonl`, results);
  console.log(`\nRésultats → ${file}`);

  const valid = results.filter(r => typeof r.delta === 'number');
  const meanDelta = valid.reduce((s, r) => s + r.delta, 0) / Math.max(1, valid.length);
  console.log(`\n=== RÉSUMÉ ===`);
  console.log(`Delta moyen (IA - notoriete_fr): ${meanDelta.toFixed(1)} pts sur ${valid.length} événements`);

  console.log('\n--- SURÉVALUÉS (score IA << notoriete_fr) ---');
  valid.filter(r => r.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 15)
    .forEach(r => console.log(`  ${String(r.delta).padStart(4)} | ${r.notoriete_fr}→${r.ai_notoriety} | ${r.titre}`));

  console.log('\n--- SOUS-ÉVALUÉS (score IA >> notoriete_fr) ---');
  valid.filter(r => r.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 15)
    .forEach(r => console.log(`  +${String(r.delta).padStart(3)} | ${r.notoriete_fr}→${r.ai_notoriety} | ${r.titre}`));
}

main().catch(e => { console.error(e); process.exit(1); });
