// upload_scores.mjs — pousse les scores IA (JSONL locaux) vers Supabase.
//   evenements_scores_ia ← scratch/ai_scoring/notoriety_final.json
//   evenements_paires    ← scratch/ai_scoring/pairs_progress.jsonl
// Usage : node scripts/ai_scoring/upload_scores.mjs [--dry-run]
import path from 'node:path';
import fs from 'node:fs';
import { supabaseClient, OUT_DIR } from './lib.mjs';

const DRY = process.argv.includes('--dry-run');
const CHUNK = 500;

const loadJsonl = (f) => fs.existsSync(f)
  ? fs.readFileSync(f, 'utf8').trim().split('\n').map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  : [];

async function upsertAll(sb, table, rows, conflict) {
  let done = 0, err = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await sb.from(table).upsert(chunk, { onConflict: conflict });
    if (error) { err += chunk.length; console.error(`  ${table} chunk ${i}: ${error.message}`); }
    else done += chunk.length;
  }
  console.log(`${table}: ${done} upsertés, ${err} erreurs`);
}

async function main() {
  const sb = supabaseClient();

  // --- Notoriété consensus ---
  const notoPath = path.join(OUT_DIR, 'notoriety_final.json');
  if (!fs.existsSync(notoPath)) { console.error('notoriety_final.json absent — lance d\'abord l\'analyse.'); process.exit(1); }
  const noto = JSON.parse(fs.readFileSync(notoPath, 'utf8'));
  const notoRows = noto.filter(r => r.id && typeof r.ai_consensus === 'number').map(r => ({
    event_id: r.id,
    notoriety_ai: r.ai_consensus,
    notoriety_ai_gemini: r.ai_gemini,
    notoriety_ai_deepseek: r.ai_deepseek,
    delta_vs_notoriete: typeof r.noto_fr === 'number' ? r.ai_consensus - r.noto_fr : null,
    confidence: r.confidence ?? null,
    reason: r.reason ?? null,
  }));

  // --- Paires ---
  const pairs = loadJsonl(path.join(OUT_DIR, 'pairs_progress.jsonl'))
    .filter(p => p.a_id && p.b_id && typeof p.guessability === 'number');
  const seen = new Set();
  const pairRows = [];
  for (const p of pairs) {
    const [a, b] = p.a_id < p.b_id ? [p.a_id, p.b_id] : [p.b_id, p.a_id];
    const key = a + '|' + b;
    if (seen.has(key)) continue;
    seen.add(key);
    pairRows.push({
      a_id: a, b_id: b,
      guessability: p.guessability, confusability: p.confusability,
      interest: p.interest ?? null,
      tag: p.tag || p.stratum || 'unknown',
      year_gap: p.year_gap ?? null,
      provider: p.provider ?? null, model: p.model ?? null,
    });
  }

  console.log(`À pousser: ${notoRows.length} scores notoriété | ${pairRows.length} paires (${pairs.length} lignes lues)`);
  if (DRY) { console.log('--dry-run : rien n\'est écrit.'); return; }

  await upsertAll(sb, 'evenements_scores_ia', notoRows, 'event_id');
  await upsertAll(sb, 'evenements_paires', pairRows, 'a_id,b_id');
}

main().catch(e => { console.error(e); process.exit(1); });
