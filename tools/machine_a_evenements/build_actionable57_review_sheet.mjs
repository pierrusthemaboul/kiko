import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureDir } from './tempete/utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORTS_DIR = path.join(__dirname, '..', 'reports');
const INPUT_PATH = path.join(REPORTS_DIR, 'historical-quality-pipeline-quality-final-review-remaining.json');
const OUTPUT_BASE = path.join(REPORTS_DIR, 'historical-quality-final-actionable57-review');

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function escapeCsv(value) {
  const text = String(value ?? '');
  if (/[,"\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function writeCsv(filePath, rows) {
  const keys = Array.from(new Set((rows || []).flatMap((row) => Object.keys(row || {}))));
  const lines = [keys.join(',')];
  for (const row of rows || []) {
    lines.push(keys.map((key) => escapeCsv(row?.[key] ?? '')).join(','));
  }
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}

function buildOpinion(row) {
  if (row.final_decision === 'DELETE') {
    return 'Je ne supprimerais pas automatiquement : revue manuelle nécessaire avant suppression.';
  }
  if (row.evidence_level === 'A' && Number(row.confidence || 0) >= 0.9) {
    if (row.final_decision === 'UPDATE_DATE') return 'Favorable : correction de date solide, déjà appliquée en production.';
    if (row.final_decision === 'UPDATE_TITLE') return 'Favorable : correction de titre solide, déjà appliquée en production.';
    if (row.final_decision === 'UPDATE_BOTH') return 'Favorable : recadrage titre + date solide, déjà appliqué en production.';
  }
  return 'À vérifier manuellement.';
}

function buildAppliedFlag(row) {
  return row.final_decision !== 'DELETE' && row.evidence_level === 'A' && Number(row.confidence || 0) >= 0.9;
}

function main() {
  ensureDir(REPORTS_DIR);
  const payload = loadJson(INPUT_PATH);
  const rows = (Array.isArray(payload?.results) ? payload.results : [])
    .filter((row) => ['UPDATE_DATE', 'UPDATE_TITLE', 'UPDATE_BOTH', 'DELETE'].includes(row.final_decision))
    .map((row) => ({
      id: row.id,
      current_title: row.current_title,
      current_date: row.current_date,
      final_decision: row.final_decision,
      proposed_title: row.proposed_title || null,
      proposed_date_iso: row.proposed_date_iso || null,
      confidence: row.confidence,
      evidence_level: row.evidence_level,
      status: row.status,
      result_bucket: row.result_bucket,
      recommendation: row.recommendation || null,
      reasoning_short: row.reasoning_short || null,
      delete_reason: row.delete_reason || null,
      applied_in_production: buildAppliedFlag(row),
      opinion: buildOpinion(row),
    }));

  writeJson(`${OUTPUT_BASE}.json`, rows);
  writeCsv(`${OUTPUT_BASE}.csv`, rows);
  console.log({ count: rows.length, output: `${OUTPUT_BASE}.json` });
}

main();

