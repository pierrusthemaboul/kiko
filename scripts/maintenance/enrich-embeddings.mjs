/**
 * enrich-embeddings.mjs
 *
 * Génère des embeddings OpenAI (text-embedding-3-small, 1536d) pour :
 *   - source_type = 'description'      : description_detaillee seule
 *   - source_type = 'titre_description': titre + "\n" + description_detaillee
 *
 * Insère dans evenements_embeddings (table sidecar). N'écrit RIEN dans evenements.
 * Idempotent : saute les événements déjà couverts pour le source_type donné.
 * Traite par batches de 50 pour ne pas saturer l'API OpenAI.
 *
 * Usage :
 *   node scripts/maintenance/enrich-embeddings.mjs
 *   node scripts/maintenance/enrich-embeddings.mjs --source_type description --batch_size 50 --limit 100
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', 'credentials', '.env') });
dotenv.config(); // fallback sur .env à la racine

// --- Config via args ---
const args = process.argv.slice(2);
const getArg = (name, def) => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : def;
};

const SOURCE_TYPE = getArg('source_type', 'all'); // 'all' | 'description' | 'titre_description'
const BATCH_SIZE  = parseInt(getArg('batch_size', '50'), 10);
const LIMIT       = parseInt(getArg('limit', '0'), 10);       // 0 = pas de limite
const DRY_RUN     = args.includes('--dry-run');

const MODEL       = 'text-embedding-3-small';
const DIMENSIONS  = 1536;
const CONCURRENCY = 5; // appels OpenAI en parallèle dans chaque batch

// --- Clients ---
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_PROD_SERVICE_ROLE_KEY
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

async function embedText(text) {
  const res = await openai.embeddings.create({ model: MODEL, input: text });
  return res.data[0].embedding;
}

async function upsertEmbedding(id, vector, sourceType) {
  const { error } = await supabase
    .from('evenements_embeddings')
    .upsert(
      {
        id,
        source_type: sourceType,
        model_name: MODEL,
        embedding_1536: JSON.stringify(vector),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id,source_type' }
    );
  if (error) throw new Error(`Upsert failed for ${id} (${sourceType}): ${error.message}`);
}

async function processBatch(events, sourceType, stats) {
  const chunks = [];
  for (let i = 0; i < events.length; i += CONCURRENCY) {
    chunks.push(events.slice(i, i + CONCURRENCY));
  }

  for (const chunk of chunks) {
    await Promise.all(chunk.map(async (ev) => {
      try {
        let text = '';
        if (sourceType === 'description') {
          text = (ev.description_detaillee || '').trim();
        } else if (sourceType === 'titre_description') {
          const desc = (ev.description_detaillee || '').trim();
          text = desc ? `${ev.titre}\n${desc}` : ev.titre;
        }

        if (!text || text.length < 5) {
          stats.skipped++;
          return;
        }

        if (DRY_RUN) {
          console.log(`  [DRY] ${sourceType} | ${ev.id} | "${text.substring(0, 60)}..."`);
          stats.done++;
          return;
        }

        const vector = await embedText(text);
        await upsertEmbedding(ev.id, vector, sourceType);
        stats.done++;
      } catch (err) {
        console.error(`  ❌ ${ev.id}: ${err.message}`);
        stats.errors++;
      }
    }));
  }
}

async function enrichSourceType(sourceType) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  Enrichissement source_type = '${sourceType}'`);
  console.log(`${'═'.repeat(60)}`);

  // Récupérer les IDs déjà traités (avec pagination pour contourner la limite Supabase de 1000)
  const doneIds = new Set();
  {
    const PAGE = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('evenements_embeddings')
        .select('id')
        .eq('source_type', sourceType)
        .not('embedding_1536', 'is', null)
        .range(from, from + PAGE - 1);
      if (error) throw new Error(`Lecture existing (page ${from}): ${error.message}`);
      if (!data || data.length === 0) break;
      data.forEach(r => doneIds.add(r.id));
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }
  console.log(`  Déjà traités : ${doneIds.size}`);

  // Récupérer TOUS les événements avec pagination (contourne la limite Supabase de 1000)
  const allEvents = [];
  {
    const PAGE = 1000;
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('evenements')
        .select('id, titre, description_detaillee')
        .not('description_detaillee', 'is', null)
        .neq('description_detaillee', '')
        .range(from, from + PAGE - 1);
      if (error) throw new Error(`Lecture evenements (page ${from}): ${error.message}`);
      if (!data || data.length === 0) break;
      allEvents.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }

  const toProcess = allEvents.filter(e => !doneIds.has(e.id));
  const limited   = LIMIT > 0 ? toProcess.slice(0, LIMIT) : toProcess;

  console.log(`  À traiter     : ${limited.length}`);
  if (DRY_RUN) console.log(`  [DRY-RUN] aucun upsert réel`);

  const stats = { done: 0, skipped: 0, errors: 0 };
  let batchNum = 0;

  for (let i = 0; i < limited.length; i += BATCH_SIZE) {
    batchNum++;
    const batch = limited.slice(i, i + BATCH_SIZE);
    process.stdout.write(`  Batch ${batchNum} (${i + 1}-${Math.min(i + BATCH_SIZE, limited.length)}/${limited.length})... `);
    await processBatch(batch, sourceType, stats);
    process.stdout.write(`✅ done=${stats.done} skip=${stats.skipped} err=${stats.errors}\n`);

    // Pause courte entre batches pour ménager l'API
    if (i + BATCH_SIZE < limited.length) await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n  Résultat final : ${stats.done} insérés, ${stats.skipped} sautés, ${stats.errors} erreurs`);
  return stats;
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   enrich-embeddings.mjs — Enrichissement Sidecar         ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  Model       : ${MODEL} (${DIMENSIONS}d)`);
  console.log(`  Batch size  : ${BATCH_SIZE}`);
  console.log(`  Concurrency : ${CONCURRENCY}`);
  console.log(`  Limit       : ${LIMIT > 0 ? LIMIT : 'aucune'}`);
  console.log(`  Source type : ${SOURCE_TYPE}`);
  console.log(`  Dry run     : ${DRY_RUN}`);

  if (!process.env.OPENAI_API_KEY) {
    console.error('\n❌ OPENAI_API_KEY manquante dans les variables d\'environnement');
    process.exit(1);
  }
  if (!process.env.SUPABASE_PROD_SERVICE_ROLE_KEY) {
    console.error('\n❌ SUPABASE_PROD_SERVICE_ROLE_KEY manquante');
    process.exit(1);
  }

  const types = SOURCE_TYPE === 'all'
    ? ['description', 'titre_description']
    : [SOURCE_TYPE];

  const totalStats = { done: 0, skipped: 0, errors: 0 };

  for (const t of types) {
    const s = await enrichSourceType(t);
    totalStats.done    += s.done;
    totalStats.skipped += s.skipped;
    totalStats.errors  += s.errors;
  }

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   RÉSUMÉ GLOBAL                                           ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`  ✅ Insérés  : ${totalStats.done}`);
  console.log(`  ⏭️  Sautés   : ${totalStats.skipped}`);
  console.log(`  ❌ Erreurs  : ${totalStats.errors}`);
  console.log('');

  if (totalStats.errors > 0) process.exit(1);
}

main().catch(err => {
  console.error('\n❌ Erreur fatale:', err.message);
  process.exit(1);
});
