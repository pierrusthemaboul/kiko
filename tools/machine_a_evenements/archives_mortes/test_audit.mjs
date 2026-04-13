/**
 * Test mini du pipeline d'audit — 15 événements seulement
 * Lance : node tools/machine_a_evenements/test_audit.mjs
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import { getSupabase } from './AGENTS/shared_utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENTS = path.join(__dirname, 'AGENTS');

const supabase = getSupabase('prod');

async function main() {
  console.log('=== TEST AUDIT (15 événements) ===\n');

  // 1. Fetch 15 events from prod
  console.log('[1] Récupération de 15 événements depuis Supabase prod...');
  const { data: events, error } = await supabase
    .from('evenements')
    .select('id, code, titre, date, date_formatee, date_precision, description_detaillee, pays, region, types_evenement, epoque, mots_cles, notoriete, universel')
    .limit(15);

  if (error) throw new Error(`Supabase : ${error.message}`);
  console.log(`    → ${events.length} événements chargés`);
  events.forEach(e => console.log(`      • [${e.date}] ${e.titre}`));

  // 2. Run SCOREUR
  console.log('\n[2] SCOREUR (Gemini 2 Flash)...');
  const scoreurInput = path.join(AGENTS, 'SCOREUR/STORAGE/INPUT/batch.json');
  const scoreurOutput = path.join(AGENTS, 'SCOREUR/STORAGE/OUTPUT/scoreur_result.json');
  fs.mkdirSync(path.dirname(scoreurInput), { recursive: true });
  fs.writeFileSync(scoreurInput, JSON.stringify(events, null, 2));
  execSync('node agent.js', { cwd: path.join(AGENTS, 'SCOREUR'), stdio: 'inherit' });

  const scores = JSON.parse(fs.readFileSync(scoreurOutput, 'utf-8'));
  console.log('\n  Résultats SCOREUR :');
  scores.forEach(s => {
    const flag = s.score_confiance < 70 ? '⚠ ' : '✓ ';
    console.log(`  ${flag} [${s.score_confiance}/100] ${s.code} — ${s.raison}`);
    if (s.flags?.length) console.log(`       flags: ${s.flags.join(', ')}`);
  });

  const suspects = scores.filter(s => s.score_confiance < 70);
  console.log(`\n  → ${suspects.length} suspects sur ${scores.length}`);

  if (suspects.length === 0) {
    console.log('\n  Tous fiables, pas de blind dating nécessaire sur ce sample.');
    console.log('\n=== TEST TERMINÉ ✓ ===');
    return;
  }

  // 3. Run BLIND_DATER sur les suspects seulement
  console.log(`\n[3] BLIND_DATER (Claude Haiku) sur ${suspects.length} suspects...`);
  const suspectIds = new Set(suspects.map(s => s.evenement_id));
  const suspectEvents = events.filter(e => suspectIds.has(e.id));

  const blindInput = path.join(AGENTS, 'BLIND_DATER/STORAGE/INPUT/batch.json');
  const blindOutput = path.join(AGENTS, 'BLIND_DATER/STORAGE/OUTPUT/blind_dater_result.json');
  fs.mkdirSync(path.dirname(blindInput), { recursive: true });
  fs.writeFileSync(blindInput, JSON.stringify(suspectEvents, null, 2));
  execSync('node agent.js', { cwd: path.join(AGENTS, 'BLIND_DATER'), stdio: 'inherit' });

  const blindDates = JSON.parse(fs.readFileSync(blindOutput, 'utf-8'));

  // 4. Comparaison manuelle inline
  console.log('\n[4] COMPARAISON (code pur) :');
  const eventMap = Object.fromEntries(events.map(e => [e.id, e]));

  let rouge = 0, orange = 0, vert = 0;
  for (const bd of blindDates) {
    const original = eventMap[bd.evenement_id];
    if (!original) continue;

    const origYear = original.date ? parseInt(original.date.split('-')[0]) : null;
    const estYear  = bd.estimated_year;
    const delta    = origYear !== null && estYear ? Math.abs(origYear - estYear) : null;
    const statut   = delta === null ? '?' : delta <= 3 ? 'VERT' : delta <= 15 ? 'ORANGE' : 'ROUGE';

    if (statut === 'ROUGE') rouge++;
    else if (statut === 'ORANGE') orange++;
    else if (statut === 'VERT') vert++;

    console.log(`  [${statut}] ${bd.code}`);
    console.log(`    Original : ${origYear} | Blind : ${estYear} (conf ${bd.confidence}/100) | Δ ${delta ?? '?'} ans`);
    console.log(`    Raison blind : ${bd.reasoning}`);
  }
  console.log(`\n  → ${vert} vert | ${orange} orange | ${rouge} rouge`);

  console.log('\n=== TEST TERMINÉ ✓ ===');
  console.log('Si les résultats semblent cohérents → lance l\'orchestrateur complet.');
}

main().catch(err => {
  console.error('Erreur :', err);
  process.exit(1);
});

