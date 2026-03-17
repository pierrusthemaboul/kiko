import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  buildOutputPayload,
  buildSearchVariants,
  classifyOperationalBucket,
  isPeriodLikeTitle,
  looksFrenchEnough,
  titleHasDate,
  validateDecision,
  writeDecisionCsvExports,
  writeOperationalExports,
} from '../machine_a_evenements/quality_pipeline_historical_dates.mjs';

test('buildSearchVariants produit des variantes dédupliquées et nettoyées', () => {
  const variants = buildSearchVariants('Début de la construction de Notre-Dame de Paris (1163)');

  assert.ok(variants.includes('Début de la construction de Notre-Dame de Paris (1163)'));
  assert.ok(variants.includes('Début de la construction de Notre-Dame de Paris 1163'));
  assert.ok(variants.some((item) => item.includes('Notre-Dame de Paris')));
  assert.equal(new Set(variants).size, variants.length);
});

test('looksFrenchEnough détecte un titre français plausible', () => {
  assert.equal(looksFrenchEnough("Traité de l'Élysée"), true);
  assert.equal(looksFrenchEnough('Treaty of Verdun'), false);
});

test('titleHasDate détecte les dates interdites dans le titre', () => {
  assert.equal(titleHasDate('Traité de Verdun 843'), true);
  assert.equal(titleHasDate("Traité de l'Élysée"), false);
});

test('isPeriodLikeTitle détecte les intitulés de type période', () => {
  assert.equal(isPeriodLikeTitle('Le règne de Christine de Suède'), true);
  assert.equal(isPeriodLikeTitle('Petite ère glaciaire'), true);
  assert.equal(isPeriodLikeTitle('Traité de Verdun'), false);
});

test('validateDecision force REVIEW si le titre proposé contient une date', () => {
  const result = validateDecision({
    decision: 'UPDATE_TITLE',
    proposed_title: 'Traité de Verdun 843',
    proposed_date_iso: null,
    confidence: 0.95,
    evidence_level: 'A',
    title_unambiguous: true,
    event_is_singular: true,
    description_consistent: true,
    review_required: false,
  }, { status: 'POTENTIAL_DATE_ERROR' });

  assert.equal(result.final_decision, 'REVIEW');
  assert.equal(result.review_required, true);
});

test('validateDecision force REVIEW si le niveau de preuve est trop faible pour une modification', () => {
  const result = validateDecision({
    decision: 'UPDATE_DATE',
    proposed_title: null,
    proposed_date_iso: '1713-01-01',
    confidence: 0.92,
    evidence_level: 'C',
    title_unambiguous: true,
    event_is_singular: true,
    description_consistent: true,
    review_required: false,
  }, { status: 'POTENTIAL_DATE_ERROR' });

  assert.equal(result.final_decision, 'REVIEW');
});

test('validateDecision force DELETE pour une entrée de type règne/période', () => {
  const result = validateDecision({
    decision: 'REVIEW',
    proposed_title: null,
    proposed_date_iso: null,
    confidence: 0.4,
    evidence_level: 'C',
    title_unambiguous: true,
    event_is_singular: false,
    description_consistent: false,
    review_required: true,
  }, { status: 'DISPUTED_DATE', current_title: 'Le règne de Christine de Suède' });

  assert.equal(result.final_decision, 'DELETE');
  assert.equal(result.review_required, true);
});

test('validateDecision accepte un KEEP solide sur un événement confirmé', () => {
  const result = validateDecision({
    decision: 'KEEP',
    proposed_title: null,
    proposed_date_iso: null,
    confidence: 0.9,
    evidence_level: 'A',
    title_unambiguous: true,
    event_is_singular: true,
    description_consistent: true,
    review_required: false,
  }, { status: 'CONFIRMED' });

  assert.equal(result.final_decision, 'KEEP');
  assert.equal(result.review_required, false);
});

test('validateDecision convertit KEEP en KEEP_ACCEPTABLE pour INSUFFICIENT_EVIDENCE suffisamment solide', () => {
  const result = validateDecision({
    decision: 'KEEP',
    proposed_title: null,
    proposed_date_iso: null,
    confidence: 0.78,
    evidence_level: 'B',
    title_unambiguous: true,
    event_is_singular: true,
    description_consistent: true,
    review_required: false,
  }, { status: 'INSUFFICIENT_EVIDENCE' });

  assert.equal(result.final_decision, 'KEEP_ACCEPTABLE');
  assert.equal(result.review_required, false);
});

test('validateDecision refuse KEEP_ACCEPTABLE si le cas insuffisamment étayé est ambigu', () => {
  const result = validateDecision({
    decision: 'KEEP_ACCEPTABLE',
    proposed_title: null,
    proposed_date_iso: null,
    confidence: 0.8,
    evidence_level: 'B',
    title_unambiguous: false,
    event_is_singular: true,
    description_consistent: true,
    review_required: false,
  }, { status: 'INSUFFICIENT_EVIDENCE' });

  assert.equal(result.final_decision, 'REVIEW');
});

test('validateDecision force REVIEW pour un DELETE insuffisamment étayé', () => {
  const result = validateDecision({
    decision: 'DELETE',
    proposed_title: null,
    proposed_date_iso: null,
    confidence: 0.82,
    evidence_level: 'B',
    title_unambiguous: false,
    event_is_singular: false,
    description_consistent: false,
    review_required: false,
  }, { status: 'INSUFFICIENT_EVIDENCE' });

  assert.equal(result.final_decision, 'REVIEW');
  assert.equal(result.review_required, true);
});

test('buildOutputPayload agrège les décisions et statuts', () => {
  const payload = buildOutputPayload(
    [
      { id: '1', decision: 'KEEP', final_decision: 'KEEP', status: 'CONFIRMED', result_bucket: 'confirme' },
      { id: '2', decision: 'UPDATE_DATE', final_decision: 'REVIEW', status: 'POTENTIAL_DATE_ERROR', result_bucket: 'divergence_date' },
    ],
    [
      { id: '1' },
      { id: '2' },
    ],
    'run-1',
    { limit: 2 },
    { checkpoint: true, completed: false }
  );

  assert.deepEqual(payload.selected_event_ids, ['1', '2']);
  assert.deepEqual(payload.summary_by_decision, { KEEP: 1, UPDATE_DATE: 1 });
  assert.deepEqual(payload.summary_by_final_decision, { KEEP: 1, REVIEW: 1 });
  assert.deepEqual(payload.summary_by_status, { CONFIRMED: 1, POTENTIAL_DATE_ERROR: 1 });
  assert.equal(payload.checkpoint, true);
  assert.equal(payload.completed, false);
});

test('writeDecisionCsvExports écrit un CSV par décision finale', () => {
  const reportsDir = path.join(process.cwd(), 'reports');
  const keepPath = path.join(reportsDir, 'batch-x.keep.csv');
  const reviewPath = path.join(reportsDir, 'batch-x.review.csv');

  try {
    fs.mkdirSync(reportsDir, { recursive: true });
    if (fs.existsSync(keepPath)) fs.rmSync(keepPath, { force: true });
    if (fs.existsSync(reviewPath)) fs.rmSync(reviewPath, { force: true });
    writeDecisionCsvExports('batch-x', [
      { id: '1', final_decision: 'KEEP', current_title: 'A' },
      { id: '2', final_decision: 'REVIEW', current_title: 'B' },
    ]);

    assert.equal(fs.existsSync(keepPath), true);
    assert.equal(fs.existsSync(reviewPath), true);
    assert.match(fs.readFileSync(keepPath, 'utf8'), /id,current_title/);
    assert.match(fs.readFileSync(reviewPath, 'utf8'), /REVIEW|current_title/);
  } finally {
    if (fs.existsSync(keepPath)) fs.rmSync(keepPath, { force: true });
    if (fs.existsSync(reviewPath)) fs.rmSync(reviewPath, { force: true });
  }
});

test('classifyOperationalBucket classe les updates sûrs à part', () => {
  assert.equal(classifyOperationalBucket({
    final_decision: 'UPDATE_DATE',
    status: 'POTENTIAL_DATE_ERROR',
    evidence_level: 'A',
    confidence: 0.95,
  }), 'safe_updates');

  assert.equal(classifyOperationalBucket({
    final_decision: 'REVIEW',
  }), 'review');

  assert.equal(classifyOperationalBucket({
    final_decision: 'DELETE',
  }), 'delete');

  assert.equal(classifyOperationalBucket({
    final_decision: 'KEEP_ACCEPTABLE',
  }), 'keep_acceptable');
});

test('writeOperationalExports écrit les fichiers safe_updates/review/delete', () => {
  const reportsDir = path.join(process.cwd(), 'reports');
  const safePath = path.join(reportsDir, 'batch-y.safe_updates.csv');
  const keepAcceptablePath = path.join(reportsDir, 'batch-y.keep_acceptable.csv');
  const reviewPath = path.join(reportsDir, 'batch-y.review.csv');
  const deletePath = path.join(reportsDir, 'batch-y.delete.csv');

  try {
    fs.mkdirSync(reportsDir, { recursive: true });
    for (const filePath of [safePath, keepAcceptablePath, reviewPath, deletePath]) {
      if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
    }

    writeOperationalExports('batch-y', [
      { id: '1', final_decision: 'UPDATE_DATE', status: 'POTENTIAL_DATE_ERROR', evidence_level: 'A', confidence: 0.95, current_title: 'A' },
      { id: '2', final_decision: 'KEEP_ACCEPTABLE', current_title: 'B' },
      { id: '3', final_decision: 'REVIEW', current_title: 'C' },
      { id: '4', final_decision: 'DELETE', current_title: 'D' },
    ]);

    assert.equal(fs.existsSync(safePath), true);
    assert.equal(fs.existsSync(keepAcceptablePath), true);
    assert.equal(fs.existsSync(reviewPath), true);
    assert.equal(fs.existsSync(deletePath), true);
  } finally {
    for (const filePath of [
      safePath,
      keepAcceptablePath,
      reviewPath,
      deletePath,
      path.join(reportsDir, 'batch-y.safe_updates.json'),
      path.join(reportsDir, 'batch-y.keep_acceptable.json'),
      path.join(reportsDir, 'batch-y.review.json'),
      path.join(reportsDir, 'batch-y.delete.json'),
    ]) {
      if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
    }
  }
});
