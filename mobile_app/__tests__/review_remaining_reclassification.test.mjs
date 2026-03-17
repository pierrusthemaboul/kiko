import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyReviewRow,
  isDocumentCollision,
  isLongProcessTitle,
  titleIsPreciseEnough,
} from '../machine_a_evenements/reclassify_review_remaining.mjs';

test('isLongProcessTitle détecte les processus longs', () => {
  assert.equal(isLongProcessTitle("L'arianisme devient dominant chez les Goths"), true);
  assert.equal(isLongProcessTitle('Bataille de Montlhéry'), false);
});

test('titleIsPreciseEnough exige un intitulé suffisamment spécifique', () => {
  assert.equal(titleIsPreciseEnough("Déclenchement de l'affaire des diamants de Bokassa"), true);
  assert.equal(titleIsPreciseEnough('Affaire'), false);
});

test('isDocumentCollision repère une source sans rapport clair', () => {
  assert.equal(isDocumentCollision({
    current_title: "Destruction de l'Université de Nalanda",
    sources_checked: [
      { title: 'Université' },
    ],
  }), true);
});

test('classifyReviewRow supprime Nalanda selon la règle éditoriale décidée', () => {
  const result = classifyReviewRow({
    id: 'nalanda',
    current_title: "Destruction de l'Université de Nalanda",
    current_date: '1193-01-01',
    current_description: '...',
    status: 'INSUFFICIENT_EVIDENCE',
    result_bucket: 'annee_exacte_introuvable',
    final_decision: 'REVIEW',
    decision: 'UPDATE_DATE',
    confidence: 0.8,
    evidence_level: 'B',
    description_consistent: true,
    event_is_singular: true,
    title_unambiguous: true,
    sources_checked: [{ title: 'Université' }],
  });

  assert.equal(result.final_decision, 'DELETE');
});

test('classifyReviewRow maintient Bokassa en revue tant que la description doit être réécrite', () => {
  const result = classifyReviewRow({
    id: 'bokassa',
    current_title: 'Affaire des diamants de Bokassa',
    current_date: '1975-01-01',
    current_description: 'Relations franco-centrafricaines en 1975...',
    status: 'INSUFFICIENT_EVIDENCE',
    result_bucket: 'absence_de_singularite',
    final_decision: 'REVIEW',
    decision: 'UPDATE_DATE',
    confidence: 0.9,
    evidence_level: 'A',
    description_consistent: false,
    event_is_singular: true,
    title_unambiguous: true,
    proposed_date_iso: '1979-10-01',
    sources_checked: [{ title: 'Affaire des diamants' }],
  });

  assert.equal(result.final_decision, 'REVIEW');
  assert.equal(result.proposed_title, "Déclenchement de l'affaire des diamants de Bokassa");
  assert.equal(result.proposed_date_iso, '1979-10-01');
});

test('classifyReviewRow promeut un retrieval insuffisant solide en update', () => {
  const result = classifyReviewRow({
    id: 'uefa',
    current_title: "Création de l'UEFA",
    current_date: '1954-01-01',
    current_description: '...',
    status: 'INSUFFICIENT_EVIDENCE',
    result_bucket: 'retrieval_insuffisant',
    final_decision: 'REVIEW',
    decision: 'UPDATE_DATE',
    proposed_date_iso: '1954-06-15',
    confidence: 0.9,
    evidence_level: 'A',
    description_consistent: true,
    event_is_singular: true,
    title_unambiguous: true,
    sources_checked: [{ title: "Création de l'UEFA" }],
  });

  assert.equal(result.final_decision, 'UPDATE_DATE');
  assert.equal(result.proposed_date_iso, '1954-06-15');
});
