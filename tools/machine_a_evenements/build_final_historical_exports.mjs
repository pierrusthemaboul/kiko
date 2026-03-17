import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { ensureDir } from './tempete/utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORTS_DIR = path.join(__dirname, '..', 'reports');
const OUTPUT_BASE = 'historical-quality-final-combined';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function safeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function escapeCsv(value) {
  const text = String(value ?? '');
  if (/[,"\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(rows) {
  const items = Array.isArray(rows) ? rows : [];
  const keys = Array.from(new Set(items.flatMap((row) => Object.keys(row || {}))));
  const lines = [keys.join(',')];
  for (const row of items) {
    lines.push(keys.map((key) => escapeCsv(row?.[key] ?? '')).join(','));
  }
  return lines.join('\n');
}

function writeCsv(filePath, rows) {
  fs.writeFileSync(filePath, toCsv(rows), 'utf8');
}

function byId(rows) {
  const map = new Map();
  for (const row of rows || []) {
    if (row?.id) map.set(row.id, row);
  }
  return map;
}

function uniqueByComposite(rows, keyFn) {
  const out = [];
  const seen = new Set();
  for (const row of rows) {
    const key = keyFn(row);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

async function buildDeletedRows(resultIndex, combinedLogs) {
  const appliedDeletes = combinedLogs.filter((row) => row?.status === 'applied' && row?.kind === 'DELETE');
  const failedDeletes = combinedLogs.filter((row) => row?.status === 'failed' && row?.kind === 'DELETE');
  const candidateRows = [...appliedDeletes, ...failedDeletes];
  const candidateIds = [...new Set(candidateRows.map((row) => row.id).filter(Boolean))];

  let existingIds = new Set();
  if (candidateIds.length > 0 && process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.SUPABASE_PROD_SERVICE_ROLE_KEY) {
    const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
      .from('evenements')
      .select('id')
      .in('id', candidateIds);
    if (error) throw error;
    existingIds = new Set((data || []).map((row) => row.id));
  }

  return uniqueByComposite(
    candidateRows
      .filter((row) => row?.id && !existingIds.has(row.id))
      .map((row) => {
        const source = resultIndex.get(row.id) || {};
        return {
          id: row.id,
          deleted_title: row.db_current_title || row.current_title || '',
          deleted_date: row.db_current_date || row.current_date || '',
          final_decision: source.final_decision || 'DELETE',
          confidence: source.confidence ?? row.confidence ?? null,
          evidence_level: source.evidence_level || row.evidence_level || '',
          status: source.status || '',
          result_bucket: source.result_bucket || '',
          delete_reason: source.delete_reason || row.delete_reason || '',
          source_run: row.source_file || '',
        };
      }),
    (row) => row.id,
  );
}

async function main() {
  ensureDir(REPORTS_DIR);

  const sensitiveReport = loadJson(path.join(REPORTS_DIR, 'historical-quality-pipeline-quality-overnight-sensitive.json'));
  const insufficientReport = loadJson(path.join(REPORTS_DIR, 'historical-quality-pipeline-quality-overnight-insufficient-evidence.json'));
  const sensitiveApplyLog = loadJson(path.join(REPORTS_DIR, 'historical-quality-pipeline-quality-overnight-sensitive.apply-log.json'));
  const insufficientApplyLog = loadJson(path.join(REPORTS_DIR, 'historical-quality-pipeline-quality-overnight-insufficient-evidence.apply-log.json'));

  const sensitiveResults = Array.isArray(sensitiveReport?.results) ? sensitiveReport.results : [];
  const insufficientResults = Array.isArray(insufficientReport?.results) ? insufficientReport.results : [];
  const resultIndex = byId([...sensitiveResults, ...insufficientResults]);

  const appliedLogs = [...sensitiveApplyLog, ...insufficientApplyLog].filter((row) => row?.status === 'applied');
  const combinedLogs = [...sensitiveApplyLog, ...insufficientApplyLog];
  const appliedUpdates = uniqueByComposite(
    appliedLogs
      .filter((row) => row.kind !== 'DELETE')
      .map((row) => {
        const source = resultIndex.get(row.id) || {};
        return {
          id: row.id,
          kind: row.kind,
          previous_title: row.db_current_title || row.current_title || '',
          previous_date: row.db_current_date || row.current_date || '',
          applied_title: row.next_title || source.proposed_title || null,
          applied_date: row.next_date || source.proposed_date_iso || null,
          final_decision: source.final_decision || row.kind,
          confidence: source.confidence ?? row.confidence ?? null,
          evidence_level: source.evidence_level || row.evidence_level || '',
          status: source.status || '',
          result_bucket: source.result_bucket || '',
          source_run: row.source_file || '',
        };
      }),
    (row) => `${row.kind}:${row.id}`,
  );

  const deleted = await buildDeletedRows(resultIndex, combinedLogs);

  const keepAcceptable = insufficientResults
    .filter((row) => safeText(row?.final_decision).toUpperCase() === 'KEEP_ACCEPTABLE')
    .map((row) => ({
      id: row.id,
      current_title: row.current_title,
      current_date: row.current_date,
      status: row.status,
      result_bucket: row.result_bucket,
      confidence: row.confidence,
      evidence_level: row.evidence_level,
      recommendation: row.recommendation,
      reasoning_short: row.reasoning_short,
    }));

  const reviewRemaining = [...sensitiveResults, ...insufficientResults]
    .filter((row) => ['REVIEW', 'UPDATE_BOTH'].includes(safeText(row?.final_decision).toUpperCase()))
    .map((row) => ({
      id: row.id,
      current_title: row.current_title,
      current_date: row.current_date,
      status: row.status,
      result_bucket: row.result_bucket,
      final_decision: row.final_decision,
      proposed_title: row.proposed_title || null,
      proposed_date_iso: row.proposed_date_iso || null,
      confidence: row.confidence,
      evidence_level: row.evidence_level,
      recommendation: row.recommendation,
      reasoning_short: row.reasoning_short,
      delete_reason: row.delete_reason || null,
    }));

  const payload = {
    generated_at: new Date().toISOString(),
    summary: {
      applied_updates: appliedUpdates.length,
      deleted: deleted.length,
      keep_acceptable: keepAcceptable.length,
      review_remaining: reviewRemaining.length,
    },
    applied_updates: appliedUpdates,
    deleted,
    keep_acceptable: keepAcceptable,
    review_remaining: reviewRemaining,
  };

  writeJson(path.join(REPORTS_DIR, `${OUTPUT_BASE}.json`), payload);
  writeJson(path.join(REPORTS_DIR, `${OUTPUT_BASE}.applied_updates.json`), appliedUpdates);
  writeJson(path.join(REPORTS_DIR, `${OUTPUT_BASE}.deleted.json`), deleted);
  writeJson(path.join(REPORTS_DIR, `${OUTPUT_BASE}.keep_acceptable.json`), keepAcceptable);
  writeJson(path.join(REPORTS_DIR, `${OUTPUT_BASE}.review_remaining.json`), reviewRemaining);

  writeCsv(path.join(REPORTS_DIR, `${OUTPUT_BASE}.applied_updates.csv`), appliedUpdates);
  writeCsv(path.join(REPORTS_DIR, `${OUTPUT_BASE}.deleted.csv`), deleted);
  writeCsv(path.join(REPORTS_DIR, `${OUTPUT_BASE}.keep_acceptable.csv`), keepAcceptable);
  writeCsv(path.join(REPORTS_DIR, `${OUTPUT_BASE}.review_remaining.csv`), reviewRemaining);

  console.log(payload.summary);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});

