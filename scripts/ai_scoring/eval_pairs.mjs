// eval_pairs.mjs — évalue ~200 paires d'événements via un LLM
// Teste l'hypothèse : un LLM peut-il estimer la "devinabilité" d'une paire
// (un joueur FR moyen sait-il ordonner A avant B ?) mieux que les heuristiques.
//
// Usage : node scripts/ai_scoring/eval_pairs.mjs [nbPaires=200]
// Env   : AI_PROVIDER=mistral|openai (défaut mistral), MISTRAL_API_KEY / OPENAI_API_KEY,
//         MISTRAL_MODEL / OPENAI_MODEL, SEED (échantillon reproductible),
//         MIN_INTERVAL_MS (throttle, défaut 1100 — plan gratuit Mistral ≈ 1 req/s)
import {
  supabaseClient, fetchAll, aiJson, mapPool, AI_PROVIDER, AI_MODEL,
  makeRng, writeJsonl, periodOf, yearOf, trunc,
} from './lib.mjs';

const TOTAL_PAIRS = Number(process.argv[2]) || 200;
const STRATA = 5; // paires par strate = TOTAL_PAIRS / STRATA

const SYSTEM = `Tu es un expert en culture générale française et en conception de quiz chronologiques.
Tu évalues des paires d'événements historiques pour un jeu mobile grand public francophone
(le joueur doit dire lequel des deux événements est arrivé en premier).
"Joueur français moyen" = culture générale de base, PAS un historien.
Réponds UNIQUEMENT en JSON valide, sans markdown ni texte autour.`;

const pairPrompt = (a, b) => `Événement A : "${a.titre}" (${a.date_formatee || a.date})${a.description_detaillee ? ' — ' + trunc(a.description_detaillee) : ''}
Événement B : "${b.titre}" (${b.date_formatee || b.date})${b.description_detaillee ? ' — ' + trunc(b.description_detaillee) : ''}

Réponds en JSON :
{
  "guessability": <0-100 : probabilité qu'un joueur FR moyen ordonne correctement>,
  "confusability": <0-100 : risque de confusion entre les deux événements>,
  "interest": <0-100 : la paire est-elle intéressante/instructive pour un quiz>,
  "known_a": <0-100 : notoriété de A en France>,
  "known_b": <0-100 : notoriété de B en France>,
  "confidence": <0-100 : ta confiance dans l'évaluation>,
  "reason": "<1 phrase max>"
}`;

const yearDiff = (a, b) => Math.abs(yearOf(a.date) - yearOf(b.date));

async function main() {
  const supabase = supabaseClient();
  const events = await fetchAll(
    supabase, 'evenements',
    'id, titre, date, date_formatee, description_detaillee, notoriete_fr, frequency_score'
  );

  const ad = events.filter(e => e.date && e.date >= '0001-01-01' && e.titre);
  const zoneA = ad.filter(e => (e.notoriete_fr ?? 0) >= 70);
  const outside = ad.filter(e => (e.notoriete_fr ?? 0) < 70);
  const stars = zoneA.filter(e => (e.notoriete_fr ?? 0) >= 90);
  const classics = zoneA.filter(e => (e.notoriete_fr ?? 0) >= 70 && (e.notoriete_fr ?? 0) < 90);

  console.log(`Catalogue AD: ${ad.length} | Zone A (noto>=70): ${zoneA.length} | hors Zone A: ${outside.length}`);

  const rng = makeRng();
  const perStratum = Math.floor(TOTAL_PAIRS / STRATA);
  const strata = [
    {
      tag: 'star_vs_star', n: perStratum,
      gen: () => {
        const a = stars[Math.floor(rng() * stars.length)];
        const b = stars[Math.floor(rng() * stars.length)];
        return [a, b];
      },
    },
    {
      tag: 'star_vs_classic', n: perStratum,
      gen: () => {
        const a = stars[Math.floor(rng() * stars.length)];
        const b = classics[Math.floor(rng() * classics.length)];
        return [a, b];
      },
    },
    {
      tag: 'same_period', n: perStratum,
      gen: () => {
        const a = zoneA[Math.floor(rng() * zoneA.length)];
        const b = zoneA[Math.floor(rng() * zoneA.length)];
        return periodOf(a.date) === periodOf(b.date) ? [a, b] : null;
      },
    },
    {
      tag: 'far_apart', n: perStratum,
      gen: () => {
        const a = zoneA[Math.floor(rng() * zoneA.length)];
        const b = zoneA[Math.floor(rng() * zoneA.length)];
        return yearDiff(a, b) >= 500 ? [a, b] : null;
      },
    },
    {
      tag: 'expansion', n: perStratum,
      gen: () => {
        const a = zoneA[Math.floor(rng() * zoneA.length)];
        const b = outside[Math.floor(rng() * outside.length)];
        return [a, b];
      },
    },
  ];

  const usedPairs = new Set();
  const pairs = [];
  for (const s of strata) {
    let got = 0, tries = 0;
    while (got < s.n && tries < s.n * 100) {
      tries++;
      const res = s.gen();
      if (!res) continue;
      const [a, b] = res;
      if (!a || !b || a.id === b.id || yearOf(a.date) === yearOf(b.date)) continue;
      const key = [a.id, b.id].sort().join('|');
      if (usedPairs.has(key)) continue;
      usedPairs.add(key);
      pairs.push({ stratum: s.tag, a, b });
      got++;
    }
    if (got < s.n) console.warn(`Strate ${s.tag}: seulement ${got}/${s.n} paires générées`);
  }

  console.log(`Paires échantillonnées: ${pairs.length} — appels ${AI_PROVIDER} (${AI_MODEL})...`);

  let done = 0;
  const results = await mapPool(pairs, 6, async ({ stratum, a, b }) => {
    let out;
    try {
      out = await aiJson(SYSTEM, pairPrompt(a, b));
    } catch (err) {
      out = { error: err.message };
    }
    done++;
    if (done % 20 === 0) console.log(`  ${done}/${pairs.length}`);
    return {
      stratum,
      a_id: a.id, a_titre: a.titre, a_year: yearOf(a.date), a_noto: a.notoriete_fr,
      b_id: b.id, b_titre: b.titre, b_year: yearOf(b.date), b_noto: b.notoriete_fr,
      year_gap: yearDiff(a, b),
      ...(out.parsed || {}),
      parse_error: out.parsed ? undefined : (out.error || 'json_parse_failed'),
    };
  });

  const file = writeJsonl(`pairs_${Date.now()}.jsonl`, results);
  console.log(`\nRésultats → ${file}`);

  // Résumé par strate
  console.log('\n=== RÉSUMÉ PAR STRATE ===');
  for (const s of strata.map(x => x.tag)) {
    const rows = results.filter(r => r.stratum === s && typeof r.guessability === 'number');
    if (!rows.length) { console.log(`${s}: aucun résultat`); continue; }
    const avg = (k) => (rows.reduce((t, r) => t + (r[k] ?? 0), 0) / rows.length).toFixed(1);
    console.log(`${s.padEnd(16)} n=${rows.length} | guess=${avg('guessability')} | confus=${avg('confusability')} | intérêt=${avg('interest')} | conf=${avg('confidence')}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
