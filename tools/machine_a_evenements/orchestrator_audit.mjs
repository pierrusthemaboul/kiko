/**
 * PIPELINE D'AUDIT DES ÉVÉNEMENTS — v2
 *
 * Mode strict READ-ONLY sur la table `evenements`.
 * Toutes les écritures vont dans `evenements_audit`.
 *
 * PHASES :
 *   1. Chargement   — lit evenements (prod), filtre les déjà blind-datés
 *   2. BLIND DATING — Claude Haiku, batches de 10, sur TOUS les events
 *   3. COMPARAISON  — code pur, delta original vs blind date
 *   4. ARBITRAGE    — Claude Sonnet, batches de 5 (cas rouges uniquement)
 *   5. RAPPORT      — stats finales
 *
 * Usage :
 *   node orchestrator_audit.mjs           → pipeline complet
 *   node orchestrator_audit.mjs --from=3  → reprend à partir de la phase 3
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import { getSupabase } from './AGENTS/shared_utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENTS = path.join(__dirname, 'AGENTS');

// ─── Configuration ────────────────────────────────────────────────────────────
const SEUIL_ORANGE  = 3;     // delta > 3 ans → orange
const SEUIL_ROUGE   = 15;    // delta > 15 ans → rouge
const BATCH_BLIND   = 10;    // Taille batch Claude Haiku
const BATCH_ARBITRE = 5;     // Taille batch Claude Sonnet
const DELAY_MS      = 1500;  // Pause entre batches (ms)
const AUDIT_VERSION = 1;

// ─── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const FROM_PHASE = parseInt(args.find(a => a.startsWith('--from='))?.split('=')[1] || '1');
if (FROM_PHASE > 1) console.log(`[CONFIG] Démarrage à partir de la phase ${FROM_PHASE}`);

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabase = getSupabase('prod');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function runAgent(name) {
  const dir = path.join(AGENTS, name);
  console.log(`  → [${name}]`);
  execSync('node agent.js', { cwd: dir, stdio: 'inherit' });
}

async function upsertAudit(records) {
  if (!records.length) return;
  const { error } = await supabase
    .from('evenements_audit')
    .upsert(records, { onConflict: 'evenement_id,audit_version' });
  if (error) console.error('[SUPABASE] Erreur upsert :', error.message);
}

// ─── PHASE 1 : Chargement ─────────────────────────────────────────────────────
async function loadPendingEvents() {
  console.log('\n[PHASE 1] Chargement depuis Supabase prod...');

  let all = [];
  let from = 0;
  const PAGE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('evenements')
      .select('id, code, titre, date, date_formatee, date_precision, description_detaillee, pays, region, types_evenement, epoque, mots_cles, notoriete, universel')
      .range(from, from + PAGE - 1);

    if (error) throw new Error(`Supabase read error : ${error.message}`);
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  console.log(`[PHASE 1] ${all.length} événements chargés`);

  // Filtre les déjà blind-datés — paginé pour dépasser la limite 1000 de Supabase
  let doneRows = [];
  let doneFrom = 0;
  while (true) {
    const { data: page } = await supabase
      .from('evenements_audit')
      .select('evenement_id')
      .eq('audit_version', AUDIT_VERSION)
      .not('blind_dated_at', 'is', null)
      .range(doneFrom, doneFrom + 999);
    if (!page || page.length === 0) break;
    doneRows = doneRows.concat(page);
    if (page.length < 1000) break;
    doneFrom += 1000;
  }

  const doneIds = new Set(doneRows.map(a => a.evenement_id));
  const pending = all.filter(e => !doneIds.has(e.id));

  console.log(`[PHASE 1] ${doneIds.size} déjà blind-datés → ${pending.length} à traiter`);
  return { all, pending };
}

// ─── PHASE 2 : Blind Dating sur TOUS les events (Claude Haiku) ────────────────
async function blindDateEvents(pending) {
  console.log(`\n[PHASE 2] BLIND DATING — ${pending.length} événements, batches de ${BATCH_BLIND}`);

  if (pending.length === 0) {
    console.log('[PHASE 2] Rien à dater.');
    return [];
  }

  const inputPath  = path.join(AGENTS, 'BLIND_DATER/STORAGE/INPUT/batch.json');
  const outputPath = path.join(AGENTS, 'BLIND_DATER/STORAGE/OUTPUT/blind_dater_result.json');
  fs.mkdirSync(path.dirname(inputPath), { recursive: true });

  const allBlind = [];
  const batches  = chunk(pending, BATCH_BLIND);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    process.stdout.write(`  Batch ${i + 1}/${batches.length} (${batch.length} evt)... `);

    fs.writeFileSync(inputPath, JSON.stringify(batch, null, 2));
    runAgent('BLIND_DATER');

    const results = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
    allBlind.push(...results);

    await upsertAudit(results
      .filter(r => r.evenement_id)
      .map(r => ({
        evenement_id:          r.evenement_id,
        blind_date_year:       r.estimated_year,
        blind_date_min:        r.year_min,
        blind_date_max:        r.year_max,
        blind_date_confidence: r.confidence,
        blind_date_reasoning:  r.reasoning,
        blind_dated_at:        new Date().toISOString(),
        audit_version:         AUDIT_VERSION
      }))
    );

    console.log(`✓ (conf moy. ${Math.round(results.reduce((s, r) => s + (r.confidence || 0), 0) / results.length)}/100)`);
    if (i < batches.length - 1) await sleep(DELAY_MS);
  }

  console.log(`[PHASE 2] Terminé. ${allBlind.length} événements blind-datés`);
  return allBlind;
}

// ─── PHASE 3 : Comparaison (code pur) ─────────────────────────────────────────
async function compareResults(all) {
  // Lit DEPUIS LA DB tous les blind-datés sans compared_at (pas juste le run courant)
  let toCompare = [];
  let dbFrom = 0;
  while (true) {
    const { data: page } = await supabase
      .from('evenements_audit')
      .select('evenement_id, blind_date_year')
      .eq('audit_version', AUDIT_VERSION)
      .not('blind_dated_at', 'is', null)
      .is('compared_at', null)
      .range(dbFrom, dbFrom + 999);
    if (!page || page.length === 0) break;
    toCompare = toCompare.concat(page);
    if (page.length < 1000) break;
    dbFrom += 1000;
  }

  console.log(`\n[PHASE 3] COMPARAISON — ${toCompare.length} événements à comparer`);

  if (toCompare.length === 0) {
    console.log('[PHASE 3] Rien à comparer.');
    return [];
  }

  const eventMap = Object.fromEntries(all.map(e => [e.id, e]));

  const compItems = toCompare
    .filter(r => r.evenement_id)
    .map(r => ({
      evenement_id:   r.evenement_id,
      code:           eventMap[r.evenement_id]?.code,
      original_date:  eventMap[r.evenement_id]?.date,
      estimated_year: r.blind_date_year
    }));

  const inputPath  = path.join(AGENTS, 'COMPARATEUR/STORAGE/INPUT/comparateur_input.json');
  const outputPath = path.join(AGENTS, 'COMPARATEUR/STORAGE/OUTPUT/comparateur_result.json');
  fs.mkdirSync(path.dirname(inputPath), { recursive: true });

  fs.writeFileSync(inputPath, JSON.stringify(compItems, null, 2));
  runAgent('COMPARATEUR');

  const results = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));

  await upsertAudit(results
    .filter(r => r.evenement_id)
    .map(r => ({
      evenement_id:  r.evenement_id,
      original_year: r.original_year,
      delta_years:   r.delta_years,
      statut:        r.statut,
      compared_at:   new Date().toISOString(),
      audit_version: AUDIT_VERSION
    }))
  );

  const stats = {
    vert:   results.filter(r => r.statut === 'vert').length,
    orange: results.filter(r => r.statut === 'orange').length,
    rouge:  results.filter(r => r.statut === 'rouge').length
  };
  console.log(`[PHASE 3] ${stats.vert} vert | ${stats.orange} orange | ${stats.rouge} rouge`);
  return results;
}

// ─── PHASE 4 : Arbitrage sur les rouges (Claude Sonnet) ───────────────────────
async function arbitrateRed(all) {
  // Lit DEPUIS LA DB tous les rouges sans arbitrated_at
  let rougeRows = [];
  let dbFrom = 0;
  while (true) {
    const { data: page } = await supabase
      .from('evenements_audit')
      .select('evenement_id, blind_date_year, blind_date_min, blind_date_max, blind_date_confidence, blind_date_reasoning, original_year, delta_years')
      .eq('audit_version', AUDIT_VERSION)
      .eq('statut', 'rouge')
      .is('arbitrated_at', null)
      .range(dbFrom, dbFrom + 999);
    if (!page || page.length === 0) break;
    rougeRows = rougeRows.concat(page);
    if (page.length < 1000) break;
    dbFrom += 1000;
  }

  console.log(`\n[PHASE 4] ARBITRAGE — ${rougeRows.length} cas rouges, batches de ${BATCH_ARBITRE}`);

  if (rougeRows.length === 0) {
    console.log('[PHASE 4] Aucun cas rouge.');
    return;
  }

  const eventMap = Object.fromEntries(all.map(e => [e.id, e]));

  const rougeEvents = rougeRows
    .map(r => {
      const e = eventMap[r.evenement_id];
      if (!e) return null;
      return {
        ...e,
        estimated_year:   r.blind_date_year,
        year_min:         r.blind_date_min,
        year_max:         r.blind_date_max,
        blind_confidence: r.blind_date_confidence,
        blind_reasoning:  r.blind_date_reasoning,
        original_year:    r.original_year,
        delta_years:      r.delta_years
      };
    })
    .filter(Boolean);

  const inputPath  = path.join(AGENTS, 'ARBITRE/STORAGE/INPUT/batch.json');
  const outputPath = path.join(AGENTS, 'ARBITRE/STORAGE/OUTPUT/arbitre_result.json');
  fs.mkdirSync(path.dirname(inputPath), { recursive: true });

  const batches = chunk(rougeEvents, BATCH_ARBITRE);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    process.stdout.write(`  Batch ${i + 1}/${batches.length} (${batch.length} evt)... `);

    fs.writeFileSync(inputPath, JSON.stringify(batch, null, 2));
    runAgent('ARBITRE');

    const results = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));

    await upsertAudit(results
      .filter(r => r.evenement_id)
      .map(r => ({
        evenement_id:        r.evenement_id,
        verdict:             r.verdict,
        verdict_confidence:  r.verdict_confidence,
        correction_suggeree: r.correction_suggeree,
        arbitrated_at:       new Date().toISOString(),
        audit_version:       AUDIT_VERSION
      }))
    );

    console.log('✓');
    if (i < batches.length - 1) await sleep(2000);
  }

  console.log('[PHASE 4] Arbitrage terminé');
}

// ─── RAPPORT FINAL ────────────────────────────────────────────────────────────
async function generateReport() {
  console.log('\n[RAPPORT] Génération...');

  let data = [];
  let rFrom = 0;
  while (true) {
    const { data: page } = await supabase
      .from('evenements_audit')
      .select('statut, verdict, delta_years, blind_date_confidence, blind_dated_at')
      .eq('audit_version', AUDIT_VERSION)
      .range(rFrom, rFrom + 999);
    if (!page || page.length === 0) break;
    data = data.concat(page);
    if (page.length < 1000) break;
    rFrom += 1000;
  }

  if (data.length === 0) { console.log('[RAPPORT] Aucune donnée.'); return; }

  const blind_dated = data.filter(r => r.blind_dated_at !== null).length;
  const report = {
    generated_at: new Date().toISOString(),
    total_audite: data.length,
    blind_dated,
    statuts: {
      vert:      data.filter(r => r.statut === 'vert').length,
      orange:    data.filter(r => r.statut === 'orange').length,
      rouge:     data.filter(r => r.statut === 'rouge').length,
      en_cours:  data.filter(r => r.statut === null).length
    },
    verdicts: {
      date_correcte:       data.filter(r => r.verdict === 'DATE_ORIGINALE_CORRECTE').length,
      blind_plus_probable: data.filter(r => r.verdict === 'BLIND_DATE_PLUS_PROBABLE').length,
      erreur_grave:        data.filter(r => r.verdict === 'ERREUR_GRAVE').length,
      incertain:           data.filter(r => r.verdict === 'INCERTAIN').length
    },
    delta_moyen_rouges: (() => {
      const rouges = data.filter(r => r.statut === 'rouge' && r.delta_years !== null);
      return rouges.length ? Math.round(rouges.reduce((s, r) => s + r.delta_years, 0) / rouges.length) : null;
    })()
  };

  console.log('\n' + JSON.stringify(report, null, 2));

  const reportPath = path.join(__dirname, 'audit_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nRapport sauvegardé : ${reportPath}`);
  return report;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log("  PIPELINE D'AUDIT v2 — evenements → evenements_audit");
  console.log('  Stratégie : Blind Dating sur TOUS les événements');
  console.log(`  Date : ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════');

  try {
    const { all, pending } = await loadPendingEvents();

    if (pending.length === 0) {
      console.log('\nTous les événements sont déjà blind-datés.');
      await generateReport();
      return;
    }

    if (FROM_PHASE <= 2) await blindDateEvents(pending);
    if (FROM_PHASE <= 3) await compareResults(all);
    if (FROM_PHASE <= 4) await arbitrateRed(all);

    await generateReport();

    console.log('\n═══════════════════════════════════════════════════');
    console.log('  AUDIT TERMINÉ');
    console.log('═══════════════════════════════════════════════════');

  } catch (err) {
    console.error('\n[ORCHESTRATEUR] Erreur fatale :', err);
    process.exit(1);
  }
}

main();

