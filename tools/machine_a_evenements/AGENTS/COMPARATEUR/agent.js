import fs from 'fs';
import path from 'path';
import { logDecision } from '../shared_utils.mjs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENT_NAME = 'COMPARATEUR';

const STORAGE = {
  input: path.join(__dirname, 'STORAGE/INPUT/comparateur_input.json'),
  output: path.join(__dirname, 'STORAGE/OUTPUT/comparateur_result.json'),
  logs: path.join(__dirname, 'STORAGE/LOGS')
};

// Seuils de classification
const SEUIL_ORANGE = 3;   // delta > 3 ans → orange
const SEUIL_ROUGE = 15;   // delta > 15 ans → rouge

function extractYear(dateStr) {
  if (!dateStr) return null;
  // Format ISO : "1789-07-14" → 1789
  const isoMatch = dateStr.match(/^(-?\d+)-\d{2}-\d{2}/);
  if (isoMatch) return parseInt(isoMatch[1]);
  // Année seule : "1789"
  const yearMatch = dateStr.match(/^(-?\d{3,4})$/);
  if (yearMatch) return parseInt(yearMatch[1]);
  // Fallback : premier groupe de 4 chiffres
  const fallback = dateStr.match(/(-?\d{4})/);
  return fallback ? parseInt(fallback[1]) : null;
}

function classify(delta) {
  if (delta === null || delta === undefined) return null;
  if (delta <= SEUIL_ORANGE) return 'vert';
  if (delta <= SEUIL_ROUGE) return 'orange';
  return 'rouge';
}

async function main() {
  console.log(`[${AGENT_NAME}] Démarrage...`);

  fs.mkdirSync(path.dirname(STORAGE.output), { recursive: true });
  fs.mkdirSync(STORAGE.logs, { recursive: true });

  if (!fs.existsSync(STORAGE.input)) {
    console.error(`[${AGENT_NAME}] Aucun input trouvé : ${STORAGE.input}`);
    process.exit(1);
  }

  // Input : [{ evenement_id, code, original_date, estimated_year }]
  const items = JSON.parse(fs.readFileSync(STORAGE.input, 'utf-8'));
  console.log(`[${AGENT_NAME}] Comparaison de ${items.length} événements...`);

  const results = items.map(item => {
    const originalYear = extractYear(item.original_date);
    const estimatedYear = item.estimated_year;

    let delta = null;
    let statut = null;

    if (originalYear !== null && estimatedYear !== null) {
      delta = Math.abs(originalYear - estimatedYear);
      statut = classify(delta);
    }

    return {
      evenement_id: item.evenement_id,
      code: item.code,
      original_year: originalYear,
      estimated_year: estimatedYear,
      delta_years: delta,
      statut
    };
  });

  fs.writeFileSync(STORAGE.output, JSON.stringify(results, null, 2));

  const stats = {
    total: results.length,
    vert: results.filter(r => r.statut === 'vert').length,
    orange: results.filter(r => r.statut === 'orange').length,
    rouge: results.filter(r => r.statut === 'rouge').length,
    sans_statut: results.filter(r => r.statut === null).length
  };

  console.log(`[${AGENT_NAME}] ${stats.vert} vert | ${stats.orange} orange | ${stats.rouge} rouge | ${stats.sans_statut} sans statut`);

  logDecision(
    AGENT_NAME, 'COMPARE',
    { count: items.length },
    'SUCCESS',
    `Comparé ${items.length} : ${stats.vert} vert, ${stats.orange} orange, ${stats.rouge} rouge`,
    stats
  );
}

main().catch(err => {
  console.error(`[${AGENT_NAME}] Erreur fatale :`, err);
  process.exit(1);
});

