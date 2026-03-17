import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureDir } from './tempete/utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORTS_DIR = path.join(__dirname, '..', 'reports');
const INPUT_BASENAME = 'historical-quality-pipeline-quality-final-review-remaining';
const OUTPUT_BASENAME = 'historical-quality-review-remaining-reclassified';

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function safeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeText(value) {
  return safeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function escapeCsv(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function writeCsv(filePath, rows) {
  const items = Array.isArray(rows) ? rows : [];
  const keys = Array.from(new Set(items.flatMap((row) => Object.keys(row || {}))));
  const lines = [keys.join(',')];
  for (const row of items) {
    lines.push(keys.map((key) => escapeCsv(row?.[key] ?? '')).join(','));
  }
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}

function hasPreciseIsoDate(value) {
  const text = safeText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [, month, day] = text.match(/^\d{4}-(\d{2})-(\d{2})$/) || [];
  return month !== '00' && day !== '00';
}

function titleIsPreciseEnough(title) {
  const normalized = normalizeText(title);
  if (!normalized) return false;
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);
  if (tokens.length < 2) return false;
  if (/\b(affaire|scandale|trait[ée]|bataille|siege|si[eè]ge|attentat|referendum|referendum|adoption|promulgation|inauguration|fondation|creation|arrestation|cloture|couronnement|declaration|signature|ratachement|rattachement|accident|naufrage|revelations|declenchement)\b/.test(normalized)) {
    return true;
  }
  return tokens.length >= 4;
}

function isLongProcessTitle(title) {
  const normalized = normalizeText(title);
  return /\b(devient dominant|dominent|domination|apparition|essor|debut de la colonisation|debut de la construction|construction de|occupation de|premiers essais|premiere photographie couleur|politique de|relations entre|precurseurs|contexte|retentissement)\b/.test(normalized);
}

function isDocumentCollision(row) {
  const sources = Array.isArray(row?.sources_checked) ? row.sources_checked : [];
  const normalizedTitle = normalizeText(row?.current_title);
  if (!sources.length) return true;
  return sources.some((source) => {
    const sourceTitle = normalizeText(source?.title);
    if (!sourceTitle) return true;
    if (sourceTitle === normalizedTitle) return false;
    if (sourceTitle.includes('universite') && normalizedTitle.includes('nalanda')) return true;
    return !sourceTitle.includes(normalizedTitle) && !normalizedTitle.includes(sourceTitle);
  });
}

function buildBaseOutput(row) {
  return {
    id: row.id,
    current_title: row.current_title,
    current_date: row.current_date,
    current_description: row.current_description,
    status: row.status,
    result_bucket: row.result_bucket,
    original_decision: row.final_decision,
    model_decision: row.decision,
    proposed_title: row.proposed_title || null,
    proposed_date_iso: row.proposed_date_iso || null,
    confidence: row.confidence,
    evidence_level: row.evidence_level,
    reasoning_short: row.reasoning_short || null,
    recommendation: row.recommendation || null,
    delete_reason: row.delete_reason || null,
  };
}

function classifyReviewRow(row) {
  const title = safeText(row?.current_title);
  const normalizedTitle = normalizeText(title);
  const resultBucket = safeText(row?.result_bucket).toUpperCase();
  const status = safeText(row?.status).toUpperCase();
  const evidenceLevel = safeText(row?.evidence_level).toUpperCase();
  const confidence = Number(row?.confidence || 0);
  const base = buildBaseOutput(row);

  if (normalizedTitle === normalizeText("Destruction de l'Université de Nalanda")) {
    return {
      ...base,
      final_decision: 'DELETE',
      delete_reason: 'Date historique trop disputée et récupération documentaire non fiable pour maintenir une fiche ponctuelle propre.',
      reclassification_reason: 'Suppression demandée pour un cas à année exacte introuvable avec sources non concordantes.',
    };
  }

  if (normalizedTitle === normalizeText("L'arianisme devient dominant chez les Goths")) {
    return {
      ...base,
      final_decision: 'DELETE',
      delete_reason: 'Processus religieux progressif non réductible à un événement ponctuel datable proprement.',
      reclassification_reason: 'Suppression demandée pour un processus long non ponctuel.',
    };
  }

  if (normalizedTitle === normalizeText("Affaire des diamants de Bokassa")) {
    return {
      ...base,
      final_decision: 'REVIEW',
      proposed_title: "Déclenchement de l'affaire des diamants de Bokassa",
      proposed_date_iso: '1979-10-01',
      reclassification_reason: 'Titre et date recentrés sur le déclenchement public du scandale, mais la description doit être réécrite pour rester cohérente.',
      recommendation: "Réécrire la description sur les révélations d'octobre 1979 avant toute application.",
    };
  }

  if ((resultBucket === 'ABSENCE_DE_SINGULARITE' || resultBucket === 'ANNEE_EXACTE_INTROUVABLE') && isLongProcessTitle(title)) {
    return {
      ...base,
      final_decision: 'DELETE',
      delete_reason: 'Le titre décrit un processus long ou un phénomène non ponctuel.',
      reclassification_reason: 'Suppression automatique des événements non singuliers ou processuels.',
    };
  }

  if (resultBucket === 'DATE_DISPUTEE') {
    if (hasPreciseIsoDate(row?.proposed_date_iso) && confidence >= 0.9 && evidenceLevel === 'A' && row?.description_consistent === true) {
      const nextTitle = safeText(row?.proposed_title || row?.current_title);
      if (titleIsPreciseEnough(nextTitle)) {
        const nextDecision = row?.proposed_title && safeText(row.proposed_title) !== title ? 'UPDATE_BOTH' : 'UPDATE_DATE';
        return {
          ...base,
          final_decision: nextDecision,
          proposed_title: row?.proposed_title || row?.current_title,
          proposed_date_iso: row?.proposed_date_iso,
          reclassification_reason: 'Conflit de date tranché par priorité à la date de l’acte public singulier avec titre suffisamment précis.',
        };
      }
    }

    return {
      ...base,
      final_decision: 'REVIEW',
      reclassification_reason: 'Cas disputé conservé en revue faute de titre assez précis ou de convention de date suffisamment stabilisée.',
    };
  }

  if (resultBucket === 'RETRIEVAL_INSUFFISANT') {
    if (evidenceLevel === 'A' && confidence >= 0.9 && row?.description_consistent === true && row?.title_unambiguous === true && row?.event_is_singular === true && hasPreciseIsoDate(row?.proposed_date_iso || row?.current_date)) {
      const nextTitle = safeText(row?.proposed_title || row?.current_title);
      if (titleIsPreciseEnough(nextTitle)) {
        const nextDecision = row?.proposed_title && safeText(row.proposed_title) !== title
          ? (hasPreciseIsoDate(row?.proposed_date_iso) && safeText(row.proposed_date_iso) !== safeText(row.current_date) ? 'UPDATE_BOTH' : 'UPDATE_TITLE')
          : 'UPDATE_DATE';
        return {
          ...base,
          final_decision: nextDecision,
          proposed_title: row?.proposed_title || row?.current_title,
          proposed_date_iso: row?.proposed_date_iso || row?.current_date,
          reclassification_reason: 'Collision documentaire résolue par convergence forte du run et des sources récupérées.',
        };
      }
    }

    if (isDocumentCollision(row)) {
      return {
        ...base,
        final_decision: 'DELETE',
        delete_reason: 'Collision documentaire non résolue : les sources récupérées ne correspondent pas clairement à l’événement décrit.',
        reclassification_reason: 'Suppression des collisions documentaires sans convergence suffisante.',
      };
    }
  }

  if (resultBucket === 'ANNEE_EXACTE_INTROUVABLE' && evidenceLevel === 'A' && confidence >= 0.9 && row?.description_consistent === true && row?.event_is_singular === true && hasPreciseIsoDate(row?.proposed_date_iso) && titleIsPreciseEnough(row?.proposed_title || row?.current_title)) {
    const nextDecision = row?.proposed_title && safeText(row.proposed_title) !== title ? 'UPDATE_BOTH' : 'UPDATE_DATE';
    return {
      ...base,
      final_decision: nextDecision,
      proposed_title: row?.proposed_title || row?.current_title,
      proposed_date_iso: row?.proposed_date_iso,
      reclassification_reason: 'Année exacte désormais assez cadrée pour une correction ponctuelle sûre.',
    };
  }

  return {
    ...base,
    final_decision: 'REVIEW',
    reclassification_reason: 'Cas conservé en revue manuelle après application des règles éditoriales renforcées.',
  };
}

function summarize(rows, field) {
  const out = {};
  for (const row of rows) {
    const key = safeText(row?.[field]) || 'UNKNOWN';
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

function buildPayload(results) {
  const deletes = results.filter((row) => row.final_decision === 'DELETE');
  const safeUpdates = results.filter((row) => ['UPDATE_TITLE', 'UPDATE_DATE', 'UPDATE_BOTH'].includes(row.final_decision));
  const hardReview = results.filter((row) => row.final_decision === 'REVIEW');
  return {
    generated_at: new Date().toISOString(),
    source_report: `${INPUT_BASENAME}.json`,
    summary: {
      total_review_rows: results.length,
      delete: deletes.length,
      safe_updates: safeUpdates.length,
      hard_review: hardReview.length,
    },
    summary_by_bucket: summarize(results, 'result_bucket'),
    summary_by_final_decision: summarize(results, 'final_decision'),
    delete: deletes,
    safe_updates: safeUpdates,
    hard_review: hardReview,
    results,
  };
}

function main() {
  ensureDir(REPORTS_DIR);
  const inputPath = path.join(REPORTS_DIR, `${INPUT_BASENAME}.json`);
  const payload = loadJson(inputPath);
  const reviewRows = (Array.isArray(payload?.results) ? payload.results : [])
    .filter((row) => safeText(row?.final_decision).toUpperCase() === 'REVIEW');

  const results = reviewRows.map(classifyReviewRow);
  const outPayload = buildPayload(results);

  writeJson(path.join(REPORTS_DIR, `${OUTPUT_BASENAME}.json`), outPayload);
  writeJson(path.join(REPORTS_DIR, `${OUTPUT_BASENAME}.delete.json`), outPayload.delete);
  writeJson(path.join(REPORTS_DIR, `${OUTPUT_BASENAME}.safe_updates.json`), outPayload.safe_updates);
  writeJson(path.join(REPORTS_DIR, `${OUTPUT_BASENAME}.hard_review.json`), outPayload.hard_review);

  writeCsv(path.join(REPORTS_DIR, `${OUTPUT_BASENAME}.delete.csv`), outPayload.delete);
  writeCsv(path.join(REPORTS_DIR, `${OUTPUT_BASENAME}.safe_updates.csv`), outPayload.safe_updates);
  writeCsv(path.join(REPORTS_DIR, `${OUTPUT_BASENAME}.hard_review.csv`), outPayload.hard_review);

  console.log(outPayload.summary);
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;

export {
  classifyReviewRow,
  isDocumentCollision,
  isLongProcessTitle,
  titleIsPreciseEnough,
};

if (isDirectRun) {
  main();
}

