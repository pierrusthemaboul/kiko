import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Système de grades (copie de lib/economy/ranks.ts)
const RANKS = [
  { index: 0, label: 'Page', tier: 1 },
  { index: 1, label: 'Écuyer', tier: 1 },
  { index: 2, label: 'Chevalier Bachelier', tier: 1 },
  { index: 3, label: 'Chevalier Banneret', tier: 1 },
  { index: 4, label: 'Baronnet', tier: 2 },
  { index: 5, label: 'Baron', tier: 2 },
  { index: 6, label: 'Vicomte', tier: 2 },
  { index: 7, label: 'Seigneur', tier: 2 },
  { index: 8, label: 'Comte', tier: 3 },
  { index: 9, label: 'Comte Palatin', tier: 3 },
  { index: 10, label: 'Marquis', tier: 3 },
  { index: 11, label: 'Margrave', tier: 3 },
  { index: 12, label: 'Duc', tier: 4 },
  { index: 13, label: 'Grand Duc', tier: 4 },
  { index: 14, label: 'Prince', tier: 4 },
  { index: 15, label: 'Prince Électeur', tier: 4 },
];

// Fonction de scaling (copie de utils/questSelection.ts)
function scaleTargetValue(baseValue, rankIndex) {
  const progressInTier = rankIndex % 4;
  const multiplier = 1 + (progressInTier * 0.05);
  const scaled = baseValue * multiplier;

  if (scaled >= 1000) {
    return Math.round(scaled / 100) * 100;
  }
  return Math.ceil(scaled);
}

async function analyzeCoherence() {
  console.log('\n🔍 ===== ANALYSE DE COHÉRENCE DES QUÊTES =====\n');
  console.log('📊 HYPOTHÈSES:');
  console.log('   - Bon joueur: 20 000 points/partie');
  console.log('   - Joueur moyen: 15 000 points/partie');
  console.log('   - Joueur faible: 10 000 points/partie\n');

  // Récupérer toutes les quêtes actives
  const { data: allQuests, error } = await supabase
    .from('daily_quests')
    .select('*')
    .eq('is_active', true)
    .order('quest_type')
    .order('difficulty')
    .order('target_value');

  if (error) {
    console.error('❌ Erreur:', error.message);
    return;
  }

  console.log('=' .repeat(120));
  console.log('\n📋 ANALYSE PAR TIER ET TYPE DE QUÊTE\n');

  // Grouper par type et tier
  const byTypeAndTier = {};

  allQuests.forEach(q => {
    const key = `${q.quest_type}_T${q.difficulty}`;
    if (!byTypeAndTier[key]) {
      byTypeAndTier[key] = [];
    }
    byTypeAndTier[key].push(q);
  });

  // Analyser chaque groupe
  for (const [key, quests] of Object.entries(byTypeAndTier).sort()) {
    const [type, tier] = key.split('_');
    const tierNum = parseInt(tier.substring(1));

    console.log(`\n${'='.repeat(120)}`);
    console.log(`\n📌 ${type.toUpperCase()} - TIER ${tierNum}`);

    // Définir les grades correspondants
    const ranksInTier = RANKS.filter(r => r.tier === tierNum);
    console.log(`   Grades: ${ranksInTier.map(r => r.label).join(', ')}\n`);

    // Filtrer les quêtes de score uniquement
    const scoreQuests = quests.filter(q =>
      q.quest_key.includes('score') ||
      q.quest_key.includes('champion') ||
      q.quest_key.includes('points')
    );

    if (scoreQuests.length === 0) {
      console.log('   ℹ️  Pas de quêtes de score dans ce groupe\n');
      continue;
    }

    console.log('   ' + '-'.repeat(116));
    console.log('   Quest Key'.padEnd(35) +
                'Base'.padStart(8) +
                'Début'.padStart(10) +
                'Fin'.padStart(10) +
                'Parties (10k)'.padStart(15) +
                'Parties (15k)'.padStart(15) +
                'Parties (20k)'.padStart(15) +
                'Cohérence');
    console.log('   ' + '-'.repeat(116));

    scoreQuests.forEach(quest => {
      const baseValue = quest.target_value;
      const firstRankInTier = ranksInTier[0].index;
      const lastRankInTier = ranksInTier[ranksInTier.length - 1].index;

      const scaledFirst = scaleTargetValue(baseValue, firstRankInTier);
      const scaledLast = scaleTargetValue(baseValue, lastRankInTier);

      // Calculer le nombre de parties nécessaires
      const parties10kFirst = Math.ceil(scaledFirst / 10000);
      const parties10kLast = Math.ceil(scaledLast / 10000);
      const parties15kFirst = Math.ceil(scaledFirst / 15000);
      const parties15kLast = Math.ceil(scaledLast / 15000);
      const parties20kFirst = Math.ceil(scaledFirst / 20000);
      const parties20kLast = Math.ceil(scaledLast / 20000);

      // Évaluer la cohérence
      let coherence = '✅ OK';

      if (type === 'daily') {
        // Pour les daily, on veut que ce soit faisable en 1-3 parties
        if (quest.quest_key.startsWith('daily_score_')) {
          // One-shot : doit être atteignable en 1 partie
          if (scaledLast > 20000) coherence = '⚠️ Trop élevé (1 partie)';
        } else {
          // Cumulatif
          if (parties20kLast > 3) coherence = '⚠️ Trop de parties';
          if (parties10kLast > 5) coherence = '🔴 Beaucoup trop';
        }
      } else if (type === 'weekly') {
        // Pour les weekly, on veut 2-20 parties (jouant 2-3x/jour)
        if (parties20kLast > 30) coherence = '⚠️ Trop de parties';
        if (parties20kLast > 50) coherence = '🔴 Beaucoup trop';
        if (parties10kFirst < 2) coherence = '⚠️ Trop facile';
      } else if (type === 'monthly') {
        // Pour les monthly, on veut 10-80 parties (jouant 1-3x/jour)
        if (parties20kLast > 150) coherence = '⚠️ Trop de parties';
        if (parties20kLast > 250) coherence = '🔴 Beaucoup trop';
        if (parties10kFirst < 5) coherence = '⚠️ Trop facile';
      }

      console.log(`   ${quest.quest_key.padEnd(35)}${baseValue.toString().padStart(8)}${scaledFirst.toString().padStart(10)}${scaledLast.toString().padStart(10)}${`${parties10kFirst}-${parties10kLast}`.padStart(15)}${`${parties15kFirst}-${parties15kLast}`.padStart(15)}${`${parties20kFirst}-${parties20kLast}`.padStart(15)}  ${coherence}`);
    });

    console.log('   ' + '-'.repeat(116));
  }

  // Résumé des problèmes
  console.log('\n\n' + '='.repeat(120));
  console.log('\n📝 RÉSUMÉ DES INCOHÉRENCES\n');

  const problems = [];

  allQuests.forEach(quest => {
    if (!quest.quest_key.includes('score') && !quest.quest_key.includes('champion') && !quest.quest_key.includes('points')) {
      return;
    }

    const tierNum = quest.difficulty;
    const ranksInTier = RANKS.filter(r => r.tier === tierNum);
    const lastRankInTier = ranksInTier[ranksInTier.length - 1].index;
    const scaled = scaleTargetValue(quest.target_value, lastRankInTier);
    const parties20k = Math.ceil(scaled / 20000);

    if (quest.quest_type === 'daily') {
      if (quest.quest_key.startsWith('daily_score_') && scaled > 20000) {
        problems.push({
          quest: quest.quest_key,
          type: 'daily',
          issue: `One-shot impossible (${scaled} pts > 20k)`,
          recommendation: `Réduire à max 20 000 points`
        });
      } else if (parties20k > 3) {
        problems.push({
          quest: quest.quest_key,
          type: 'daily',
          issue: `Trop de parties (${parties20k})`,
          recommendation: `Réduire ou déplacer en weekly`
        });
      }
    } else if (quest.quest_type === 'weekly' && parties20k > 30) {
      problems.push({
        quest: quest.quest_key,
        type: 'weekly',
        issue: `Trop de parties (${parties20k})`,
        recommendation: `Réduire ou déplacer en monthly`
      });
    } else if (quest.quest_type === 'monthly' && parties20k > 150) {
      problems.push({
        quest: quest.quest_key,
        type: 'monthly',
        issue: `Trop de parties (${parties20k})`,
        recommendation: `Réduire la cible`
      });
    }
  });

  if (problems.length === 0) {
    console.log('   ✅ Aucune incohérence détectée ! Le système est bien équilibré.\n');
  } else {
    console.log(`   ⚠️  ${problems.length} incohérence(s) détectée(s):\n`);
    problems.forEach((p, i) => {
      console.log(`   ${i + 1}. [${p.type.toUpperCase()}] ${p.quest}`);
      console.log(`      Problème: ${p.issue}`);
      console.log(`      Recommandation: ${p.recommendation}\n`);
    });
  }

  console.log('='.repeat(120) + '\n');
}

analyzeCoherence().catch(console.error);
