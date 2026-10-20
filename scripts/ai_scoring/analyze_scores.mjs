// analyze_scores.mjs — analyse croisée des scores IA vs données de prod.
// Vérifie : (1) notoriété IA vs notoriete_fr vs répétition réelle (user_event_usage)
//           (2) cohérence entre modèles (les notoriétés viennent de 8 modèles)
//           (3) couverture des paires pour les événements hors Zone A
// Usage : node scripts/ai_scoring/analyze_scores.mjs
import path from 'node:path';
import fs from 'node:fs';
import { supabaseClient, fetchAll, OUT_DIR } from './lib.mjs';

const loadJsonl = (f) => fs.existsSync(f)
  ? fs.readFileSync(f, 'utf8').trim().split('\n').map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  : [];

const mean = (a) => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; };

async function main() {
  const noto = loadJsonl(path.join(OUT_DIR, 'notoriety_progress.jsonl'));
  const pairs = loadJsonl(path.join(OUT_DIR, 'pairs_progress.jsonl'));
  console.log(`Scores chargés: ${noto.length} notoriétés, ${pairs.length} paires`);

  const sb = supabaseClient();
  const usage = await fetchAll(sb, 'user_event_usage', 'event_id, times_seen');
  const seenBy = {};
  const totalSeen = {};
  usage.forEach(u => {
    seenBy[u.event_id] = (seenBy[u.event_id] || 0) + 1;          // nb de joueurs distincts
    totalSeen[u.event_id] = (totalSeen[u.event_id] || 0) + (u.times_seen || 1); // impressions totales
  });
  console.log(`Usage: ${usage.length} lignes user_event_usage`);

  // ------------------------------------------------------------------
  // 1. Notoriété : deltas + lien avec les répétitions
  // ------------------------------------------------------------------
  const scored = noto.filter(r => typeof r.ai_notoriety === 'number');
  const deltas = scored.map(r => r.delta ?? (r.ai_notoriety - (r.notoriete_fr ?? 0)));
  console.log(`\n=== NOTORIÉTÉ : ${scored.length} événements scorés ===`);
  console.log(`delta moyen (AI - noto_fr): ${mean(deltas).toFixed(1)} | médian: ${median(deltas)}`);
  console.log(`p10/p90 des deltas: ${pct(deltas, 0.1)} / ${pct(deltas, 0.9)}`);
  console.log(`confiance moyenne: ${mean(scored.map(r => r.confidence || 0)).toFixed(0)}`);

  const over = scored.filter(r => (r.delta ?? 0) <= -40).sort((a, b) => a.delta - b.delta);
  const under = scored.filter(r => (r.delta ?? 0) >= 25).sort((a, b) => b.delta - a.delta);
  console.log(`\nSurévalués (delta ≤ -40): ${over.length}`);
  over.slice(0, 10).forEach(r => console.log(`  ${r.notoriete_fr}→${r.ai_notoriety} (${r.delta}) ×${totalSeen[r.id] || 0} vues — ${r.titre}`));
  console.log(`\nSous-évalués (delta ≥ +25): ${under.length}`);
  under.slice(0, 10).forEach(r => console.log(`  ${r.notoriete_fr}→${r.ai_notoriety} (+${r.delta}) ×${totalSeen[r.id] || 0} vues — ${r.titre}`));

  // Corrélation simple : les plus vus sont-ils surévalués ?
  const top50 = [...scored].sort((a, b) => (totalSeen[b.id] || 0) - (totalSeen[a.id] || 0)).slice(0, 50);
  console.log(`\nTop 50 événements les plus vus : noto_fr moyen ${mean(top50.map(r => r.notoriete_fr || 0)).toFixed(0)} → AI moyen ${mean(top50.map(r => r.ai_notoriety)).toFixed(0)} (delta ${mean(top50.map(r => r.delta ?? 0)).toFixed(1)})`);
  const neverSeen = scored.filter(r => !totalSeen[r.id]);
  console.log(`Jamais vus: ${neverSeen.length} | noto_fr moyen ${mean(neverSeen.map(r => r.notoriete_fr || 0)).toFixed(0)} → AI ${mean(neverSeen.map(r => r.ai_notoriety)).toFixed(0)}`);

  // ------------------------------------------------------------------
  // 2. Cohérence inter-modèles (biais systématique par modèle ?)
  // ------------------------------------------------------------------
  console.log('\n=== COHÉRENCE MODÈLES (notoriété) ===');
  const byModel = {};
  scored.forEach(r => { const m = r.model || '?'; (byModel[m] = byModel[m] || []).push(r.ai_notoriety); });
  Object.entries(byModel).sort((a, b) => b[1].length - a[1].length)
    .forEach(([m, arr]) => console.log(`  ${m.padEnd(28)} n=${String(arr.length).padStart(4)} | moyenne ${mean(arr).toFixed(1)} | médiane ${median(arr)}`));

  // ------------------------------------------------------------------
  // 3. Paires : couverture des événements invisibles + mauvaises questions
  // ------------------------------------------------------------------
  console.log('\n=== PAIRES ===');
  const pOk = pairs.filter(p => typeof p.guessability === 'number');
  const PLAYABLE = 70, TRAP = 40;

  // Couverture : chaque événement a-t-il ≥1 partenaire jouable ?
  const partnerGuess = {}; // id -> [guessability...]
  pOk.forEach(p => {
    (partnerGuess[p.a_id] = partnerGuess[p.a_id] || []).push(p.guessability);
    (partnerGuess[p.b_id] = partnerGuess[p.b_id] || []).push(p.guessability);
  });
  const covered = Object.keys(partnerGuess).length;
  const noPartner = scored.filter(r => !partnerGuess[r.id]);
  const weakCoverage = Object.entries(partnerGuess).filter(([, gs]) => Math.max(...gs) < PLAYABLE);
  console.log(`${pOk.length} paires valides | ${covered} événements couverts | ${noPartner.length} événements scorés sans aucune paire`);
  console.log(`${weakCoverage.length} événements sans partenaire "jouable" (guessability ≥ ${PLAYABLE})`);

  // Paires-pièges utiles pour niveaux élevés
  const traps = pOk.filter(p => p.confusability >= TRAP && p.guessability < PLAYABLE);
  console.log(`Paires piégeuses (confus ≥ ${TRAP}, guess < ${PLAYABLE}): ${traps.length}`);
  traps.sort((a, b) => b.confusability - a.confusability).slice(0, 8)
    .forEach(p => console.log(`  confus=${p.confusability} guess=${p.guessability} — "${p.a_titre}" vs "${p.b_titre}"`));

  // Mauvaises questions actuelles : deux stars (noto ≥90) mais guessability faible
  const badStar = pOk.filter(p => (p.a_noto ?? 0) >= 90 && (p.b_noto ?? 0) >= 90 && p.guessability < 50);
  console.log(`\n"Mauvaises questions" (2 stars noto≥90 mais guess<50): ${badStar.length}`);
  badStar.slice(0, 8).forEach(p => console.log(`  guess=${p.guessability} confus=${p.confusability} — "${p.a_titre}"(${p.a_year}) vs "${p.b_titre}"(${p.b_year})`));

  // Événements hors Zone A devenus jouables via expansion
  const exp = pOk.filter(p => (p.tag === 'expansion' || p.stratum === 'expansion'));
  const outside = exp.map(p => (p.a_noto ?? 0) < 70 ? p.b_id : p.a_id); // le côté hors Zone A
  const playableOutside = new Set(exp.filter(p => p.guessability >= PLAYABLE).map(p => (p.a_noto ?? 0) < 70 ? p.b_id : p.a_id));
  console.log(`\nExpansion: ${exp.length} paires | ${playableOutside.size} événements hors Zone A avec ≥1 partenaire jouable`);

  // ------------------------------------------------------------------
  // 4. Résumé → rapport JSON dans scratch
  // ------------------------------------------------------------------
  const report = {
    generated_at: new Date().toISOString(),
    notoriety: {
      scored: scored.length,
      delta_mean: +mean(deltas).toFixed(1), delta_median: median(deltas),
      over_scored: over.length, under_scored: under.length,
      top50_seen_delta: +mean(top50.map(r => r.delta ?? 0)).toFixed(1),
      never_seen: neverSeen.length,
      model_means: Object.fromEntries(Object.entries(byModel).map(([m, a]) => [m, +mean(a).toFixed(1)])),
    },
    pairs: {
      scored: pOk.length, covered_events: covered,
      events_without_playable_partner: weakCoverage.length,
      trap_pairs: traps.length, bad_star_pairs: badStar.length,
      expansion_playable_outside: playableOutside.size,
    },
  };
  const out = path.join(OUT_DIR, 'analysis_report.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(`\nRapport → ${out}`);
}

main().catch(e => { console.error(e); process.exit(1); });
