import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureDir } from './tempete/utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORTS_DIR = path.join(__dirname, '..', 'reports');

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function main() {
  ensureDir(REPORTS_DIR);

  const sensitive = loadJson(path.join(REPORTS_DIR, 'historical-quality-pipeline-quality-overnight-sensitive.json'));
  const insufficient = loadJson(path.join(REPORTS_DIR, 'historical-quality-pipeline-quality-overnight-insufficient-evidence.json'));
  const reviewRemaining = loadJson(path.join(REPORTS_DIR, 'historical-quality-final-combined.review_remaining.json'));

  const ids = new Set((Array.isArray(reviewRemaining) ? reviewRemaining : []).map((row) => row.id).filter(Boolean));
  const allResults = [
    ...(Array.isArray(sensitive?.results) ? sensitive.results : []),
    ...(Array.isArray(insufficient?.results) ? insufficient.results : []),
  ];

  const selectedResults = allResults.filter((row) => ids.has(row.id));
  const payload = {
    generated_at: new Date().toISOString(),
    source_reports: [
      'historical-quality-pipeline-quality-overnight-sensitive.json',
      'historical-quality-pipeline-quality-overnight-insufficient-evidence.json',
    ],
    selected_event_ids: selectedResults.map((row) => row.id),
    summary_by_status: selectedResults.reduce((acc, row) => {
      const key = String(row?.status || 'UNKNOWN');
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
    results: selectedResults,
  };

  const outPath = path.join(REPORTS_DIR, 'historical-quality-review-remaining-input.json');
  writeJson(outPath, payload);
  console.log({ count: selectedResults.length, outPath });
}

main();

