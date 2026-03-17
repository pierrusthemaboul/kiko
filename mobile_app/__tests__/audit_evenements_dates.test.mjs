import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  buildOutputPayload,
  buildSampleFromCheckpoint,
  buildTechnicalErrorResult,
  compareDbDateWithCandidate,
  finalizeStatus,
  inferResultBucket,
  normalizeAuditForStatus,
  summarizeBuckets,
  summarizeResults,
  toCsv,
  writeCheckpoint,
  writeOutputs,
} from '../machine_a_evenements/audit_evenements_dates.mjs';

test('compareDbDateWithCandidate compare correctement les années', () => {
  assert.equal(compareDbDateWithCandidate('1796-01-01', '1796-09-01', 'year'), true);
  assert.equal(compareDbDateWithCandidate('1796-01-01', '1797-01-01', 'year'), false);
  assert.equal(compareDbDateWithCandidate('1796-01-01', null, 'year'), null);
});

test('finalizeStatus retourne CONFIRMED pour une même année avec forte confiance', () => {
  const status = finalizeStatus({
    needs_human_review: false,
    status: 'CONFIRMED',
    is_disputed: false,
    ambiguous_identity: false,
    title_not_self_sufficient: false,
    title_self_sufficient: true,
    proposed_date_iso: '1558-01-01',
    precision: 'year',
    is_time_span: false,
    is_period_based: false,
    is_not_singular_event: false,
    exact_year_supported: true,
    confidence: 0.9,
  }, '1558-11-17');

  assert.equal(status, 'CONFIRMED');
});

test('finalizeStatus retourne INSUFFICIENT_EVIDENCE pour un événement de période', () => {
  const status = finalizeStatus({
    needs_human_review: false,
    status: 'LIKELY_CORRECT',
    is_disputed: false,
    ambiguous_identity: false,
    title_not_self_sufficient: false,
    title_self_sufficient: true,
    proposed_date_iso: '1796-01-01',
    precision: 'year',
    is_time_span: true,
    is_period_based: true,
    is_not_singular_event: false,
    exact_year_supported: true,
    confidence: 0.9,
  }, '1796-01-01');

  assert.equal(status, 'INSUFFICIENT_EVIDENCE');
});

test('normalizeAuditForStatus neutralise les champs contradictoires pour INSUFFICIENT_EVIDENCE', () => {
  const normalized = normalizeAuditForStatus({
    proposed_date_iso: '1796-01-01',
    precision: 'year',
    confidence: 0.9,
    evidence_used: ['wikipedia_fr_article'],
    needs_human_review: false,
  }, 'INSUFFICIENT_EVIDENCE');

  assert.equal(normalized.proposed_date_iso, null);
  assert.equal(normalized.precision, null);
  assert.equal(normalized.confidence, 0);
  assert.deepEqual(normalized.evidence_used, []);
  assert.equal(normalized.needs_human_review, true);
});

test('inferResultBucket classe un LIKELY_CORRECT cohérent en probable_mais_a_confirmer', () => {
  const bucket = inferResultBucket(
    'LIKELY_CORRECT',
    {
      event_identity: 'Fondation de la Pennsylvanie',
      proposed_date_iso: '1681-01-01',
      precision: 'year',
      is_time_span: false,
      is_period_based: false,
      is_not_singular_event: false,
      exact_year_supported: true,
    },
    [
      {
        title: 'Province de Pennsylvanie',
        date_iso: '1681-01-01',
      },
    ],
    '1681-01-01'
  );

  assert.equal(bucket, 'probable_mais_a_confirmer');
});

test('summaries comptent correctement status et buckets', () => {
  const results = [
    { status: 'CONFIRMED', result_bucket: 'confirme' },
    { status: 'CONFIRMED', result_bucket: 'confirme' },
    { status: 'INSUFFICIENT_EVIDENCE', result_bucket: 'annee_exacte_introuvable' },
  ];

  assert.deepEqual(summarizeResults(results), {
    CONFIRMED: 2,
    INSUFFICIENT_EVIDENCE: 1,
  });

  assert.deepEqual(summarizeBuckets(results), {
    confirme: 2,
    annee_exacte_introuvable: 1,
  });
});

test('buildTechnicalErrorResult produit un fallback exploitable', () => {
  const result = buildTechnicalErrorResult(
    { id: 'evt-1', titre: 'Test', date: '1900-01-01' },
    new Error('boom')
  );

  assert.equal(result.status, 'INSUFFICIENT_EVIDENCE');
  assert.equal(result.result_bucket, 'erreur_technique');
  assert.equal(result.date_candidate, null);
  assert.equal(result.needs_human_review, true);
  assert.match(result.reasoning_short, /boom/i);
});

test('buildSampleFromCheckpoint recharge exactement les ids du checkpoint', () => {
  const allEvents = [
    { id: 'a', titre: 'A', date: '1900-01-01' },
    { id: 'b', titre: 'B', date: '1901-01-01' },
    { id: 'c', titre: 'C', date: '1902-01-01' },
  ];

  const sample = buildSampleFromCheckpoint(allEvents, {
    sample_event_ids: ['c', 'a'],
    results: [],
  });

  assert.deepEqual(sample.map((item) => item.id), ['c', 'a']);
});

test('buildOutputPayload inclut les résumés et les sample_event_ids', () => {
  const results = [
    { id: 'a', status: 'CONFIRMED', result_bucket: 'confirme' },
    { id: 'b', status: 'LIKELY_CORRECT', result_bucket: 'probable_mais_a_confirmer' },
  ];
  const sample = [
    { id: 'a' },
    { id: 'b' },
  ];

  const payload = buildOutputPayload(results, sample, 'run-1', { sampleSize: 2 }, { checkpoint: true });

  assert.deepEqual(payload.sample_event_ids, ['a', 'b']);
  assert.deepEqual(payload.summary_by_status, {
    CONFIRMED: 1,
    LIKELY_CORRECT: 1,
  });
  assert.deepEqual(payload.summary_by_bucket, {
    confirme: 1,
    probable_mais_a_confirmer: 1,
  });
  assert.equal(payload.checkpoint, true);
});

test('toCsv, writeOutputs et writeCheckpoint écrivent des fichiers lisibles', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-dates-test-'));
  const outputJson = path.join(tmpDir, 'out.json');
  const outputCsv = path.join(tmpDir, 'out.csv');
  const checkpointPath = path.join(tmpDir, 'checkpoint.json');

  const payload = {
    results: [
      {
        id: 'evt-1',
        titre: 'Événement test',
        date_in_db: '2000-01-01',
        date_candidate: '2000-01-01',
        precision: 'year',
        status: 'CONFIRMED',
        result_bucket: 'confirme',
        confidence: 1,
        needs_human_review: false,
        recommendation: 'OK',
        matched_article_fr: 'Article FR',
        matched_article_en: '',
        wikidata_id: 'Q1',
      },
    ],
  };

  const csv = toCsv(payload.results);
  assert.match(csv, /Événement test/);
  assert.match(csv, /CONFIRMED/);

  writeOutputs(outputJson, outputCsv, payload);
  writeCheckpoint(checkpointPath, payload);

  assert.deepEqual(JSON.parse(fs.readFileSync(outputJson, 'utf8')), payload);
  assert.match(fs.readFileSync(outputCsv, 'utf8'), /result_bucket/);
  assert.deepEqual(JSON.parse(fs.readFileSync(checkpointPath, 'utf8')), payload);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
