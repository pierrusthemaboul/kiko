import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { assertSupabaseConfig, getProdDb } from './tempete/supabase.mjs';
import { ensureDir } from './tempete/utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const REPORTS_DIR = path.join(__dirname, '..', 'reports');
const DEFAULT_RUN_STAMP = 'quality-overnight-sensitive';
const DEFAULT_BASE_NAME = `historical-quality-pipeline-${DEFAULT_RUN_STAMP}`;

function safeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function now() {
  return new Date().toISOString();
}

function readEnvBool(name, fallback = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return fallback;
  return /^(1|true|yes|on)$/i.test(String(raw).trim());
}

function readEnvFloat(name, fallback) {
  const raw = process.env[name];
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getRuntimeOptions() {
  const baseName = safeText(process.env.HISTORICAL_APPLY_BASENAME) || DEFAULT_BASE_NAME;
  return {
    baseName,
    dryRun: readEnvBool('HISTORICAL_APPLY_DRY_RUN', true),
    includeDelete: readEnvBool('HISTORICAL_APPLY_INCLUDE_DELETE', true),
    includeUpdateDate: readEnvBool('HISTORICAL_APPLY_INCLUDE_UPDATE_DATE', true),
    includeUpdateTitle: readEnvBool('HISTORICAL_APPLY_INCLUDE_UPDATE_TITLE', false),
    includeUpdateBoth: readEnvBool('HISTORICAL_APPLY_INCLUDE_UPDATE_BOTH', false),
    minUpdateDateConfidence: readEnvFloat('HISTORICAL_APPLY_MIN_UPDATE_DATE_CONFIDENCE', 0.9),
    minUpdateTitleConfidence: readEnvFloat('HISTORICAL_APPLY_MIN_UPDATE_TITLE_CONFIDENCE', 0.9),
    minUpdateBothConfidence: readEnvFloat('HISTORICAL_APPLY_MIN_UPDATE_BOTH_CONFIDENCE', 0.95),
    minDeleteConfidence: readEnvFloat('HISTORICAL_APPLY_MIN_DELETE_CONFIDENCE', 0.9),
  };
}

function buildPaths(baseName) {
  return {
    safeUpdatesJson: path.join(REPORTS_DIR, `${baseName}.safe_updates.json`),
    deleteJson: path.join(REPORTS_DIR, `${baseName}.delete.json`),
    fullJson: path.join(REPORTS_DIR, `${baseName}.json`),
    applyLogJson: path.join(REPORTS_DIR, `${baseName}.apply-log.json`),
    applySummaryJson: path.join(REPORTS_DIR, `${baseName}.apply-summary.json`),
  };
}

function ensureFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier introuvable: ${filePath}`);
  }
}

function buildOperations(paths, options) {
  ensureFileExists(paths.fullJson);

  const fullPayload = loadJson(paths.fullJson);
  const fullResults = Array.isArray(fullPayload?.results) ? fullPayload.results : [];

  const operations = [];

  const updateDateRows = options.includeUpdateDate
    ? fullResults.filter((row) => (
      safeText(row?.final_decision).toUpperCase() === 'UPDATE_DATE'
      && safeText(row?.evidence_level).toUpperCase() === 'A'
      && Number(row?.confidence || 0) >= options.minUpdateDateConfidence
      && /^\d{4}-\d{2}-\d{2}$/.test(safeText(row?.proposed_date_iso))
    ))
    : [];
  const updateTitleRows = options.includeUpdateTitle
    ? fullResults.filter((row) => (
      safeText(row?.final_decision).toUpperCase() === 'UPDATE_TITLE'
      && safeText(row?.evidence_level).toUpperCase() === 'A'
      && Number(row?.confidence || 0) >= options.minUpdateTitleConfidence
      && safeText(row?.proposed_title)
    ))
    : [];
  const updateBothRows = options.includeUpdateBoth
    ? fullResults.filter((row) => (
      safeText(row?.final_decision).toUpperCase() === 'UPDATE_BOTH'
      && safeText(row?.evidence_level).toUpperCase() === 'A'
      && Number(row?.confidence || 0) >= options.minUpdateBothConfidence
      && safeText(row?.proposed_title)
      && /^\d{4}-\d{2}-\d{2}$/.test(safeText(row?.proposed_date_iso))
    ))
    : [];
  const deleteRows = options.includeDelete
    ? fullResults.filter((row) => (
      safeText(row?.final_decision).toUpperCase() === 'DELETE'
      && safeText(row?.evidence_level).toUpperCase() === 'A'
      && Number(row?.confidence || 0) >= options.minDeleteConfidence
    ))
    : [];

  for (const row of updateDateRows) {
    operations.push({
      kind: 'UPDATE_DATE',
      id: row.id,
      current_title: row.current_title,
      current_date: row.current_date,
      next_title: null,
      next_date: row.proposed_date_iso,
      source_file: path.basename(paths.fullJson),
      confidence: row.confidence,
      evidence_level: row.evidence_level,
    });
  }

  for (const row of updateTitleRows) {
    operations.push({
      kind: 'UPDATE_TITLE',
      id: row.id,
      current_title: row.current_title,
      current_date: row.current_date,
      next_title: row.proposed_title || null,
      next_date: null,
      source_file: path.basename(paths.fullJson),
      confidence: row.confidence,
      evidence_level: row.evidence_level,
    });
  }

  for (const row of updateBothRows) {
    operations.push({
      kind: 'UPDATE_BOTH',
      id: row.id,
      current_title: row.current_title,
      current_date: row.current_date,
      next_title: row.proposed_title || null,
      next_date: row.proposed_date_iso || null,
      source_file: path.basename(paths.fullJson),
      confidence: row.confidence,
      evidence_level: row.evidence_level,
    });
  }

  for (const row of deleteRows) {
    operations.push({
      kind: 'DELETE',
      id: row.id,
      current_title: row.current_title,
      current_date: row.current_date,
      next_title: null,
      next_date: null,
      source_file: path.basename(paths.deleteJson),
      confidence: row.confidence,
      evidence_level: row.evidence_level,
      delete_reason: row.delete_reason || null,
    });
  }

  const deduped = [];
  const seen = new Set();
  for (const op of operations) {
    const key = `${op.kind}:${op.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(op);
  }
  return deduped;
}

async function fetchCurrentRows(db, ids) {
  const rowsById = new Map();
  const chunkSize = 100;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { data, error } = await db
      .from('evenements')
      .select('id, titre, date, donnee_corrigee, updated_at')
      .in('id', chunk);
    if (error) throw error;
    for (const row of data || []) rowsById.set(row.id, row);
  }
  return rowsById;
}

async function applyOperations(db, operations, options) {
  const ids = operations.map((item) => item.id);
  const currentRows = await fetchCurrentRows(db, ids);
  const logs = [];
  let applied = 0;
  let skipped = 0;
  let failed = 0;

  for (const op of operations) {
    const current = currentRows.get(op.id) || null;
    if (!current) {
      logs.push({ ...op, status: 'missing_in_db', at: now() });
      skipped += 1;
      continue;
    }

    try {
      if (options.dryRun) {
        logs.push({
          ...op,
          status: 'dry_run',
          at: now(),
          db_current_title: current.titre,
          db_current_date: current.date,
        });
        skipped += 1;
        continue;
      }

      if (op.kind === 'DELETE') {
        const { error } = await db.from('evenements').delete().eq('id', op.id);
        if (error) throw error;
      } else {
        const payload = {
          donnee_corrigee: true,
          updated_at: now(),
        };
        if (op.next_date) payload.date = op.next_date;
        if ((op.kind === 'UPDATE_TITLE' || op.kind === 'UPDATE_BOTH') && op.next_title) payload.titre = op.next_title;
        const { error } = await db.from('evenements').update(payload).eq('id', op.id);
        if (error) throw error;
      }

      logs.push({
        ...op,
        status: 'applied',
        at: now(),
        db_current_title: current.titre,
        db_current_date: current.date,
      });
      applied += 1;
    } catch (error) {
      logs.push({
        ...op,
        status: 'failed',
        at: now(),
        error_message: error?.message || String(error),
        db_current_title: current.titre,
        db_current_date: current.date,
      });
      failed += 1;
    }
  }

  return {
    logs,
    summary: {
      generated_at: now(),
      dry_run: options.dryRun,
      total_operations: operations.length,
      applied,
      skipped,
      failed,
      by_kind: operations.reduce((acc, op) => {
        acc[op.kind] = (acc[op.kind] || 0) + 1;
        return acc;
      }, {}),
    },
  };
}

async function main() {
  assertSupabaseConfig();
  ensureDir(REPORTS_DIR);
  const options = getRuntimeOptions();
  const paths = buildPaths(options.baseName);
  const operations = buildOperations(paths, options);
  const db = getProdDb();

  console.log(`[${now()}] Application historique production — démarrage`);
  console.log(`[${now()}] Base name: ${options.baseName}`);
  console.log(`[${now()}] Dry run: ${options.dryRun}`);
  console.log(`[${now()}] Operations: ${operations.length}`);

  const { logs, summary } = await applyOperations(db, operations, options);
  fs.writeFileSync(paths.applyLogJson, JSON.stringify(logs, null, 2), 'utf8');
  fs.writeFileSync(paths.applySummaryJson, JSON.stringify(summary, null, 2), 'utf8');

  console.log(`[${now()}] Terminé.`);
  console.log(summary);
  console.log(`Log: ${paths.applyLogJson}`);
  console.log(`Summary: ${paths.applySummaryJson}`);
}

main().catch((error) => {
  console.error(`[${now()}] FATAL: ${error?.stack || error?.message || error}`);
  process.exit(1);
});

