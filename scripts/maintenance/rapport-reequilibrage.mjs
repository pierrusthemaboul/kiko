import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Anciennes formules
function oldXpCurve(index) {
  return Math.round(250 * index * index + 150 * index + 200);
}

function oldPointsToXP(points, mode) {
  const bases = { classic: 30, date: 40 };
  const ks = { classic: 0.6, date: 0.7 };
  const alphas = { classic: 0.72, date: 0.7 };

  const x = Math.max(points, 0);
  const xpBase = bases[mode];
  const k = ks[mode];
  const alpha = alphas[mode];

  let xpRaw = xpBase + k * Math.pow(x, alpha);

  if (x > 800) {
    const surplus = x - 800;
    xpRaw += k * (0.5 * Math.sqrt(surplus));
  }

  const xpRounded = Math.round(xpRaw);
  return Math.min(Math.max(xpRounded, 10), 400);
}

// Nouvelles formules
function newXpCurve(index) {
  return Math.round(180 * index * index + 120 * index + 150);
}

function newPointsToXP(points, mode) {
  const bases = { classic: 50, date: 60 };
  const ks = { classic: 0.8, date: 0.9 };
  const alphas = { classic: 0.72, date: 0.7 };

  const x = Math.max(points, 0);
  const xpBase = bases[mode];
  const k = ks[mode];
  const alpha = alphas[mode];

  let xpRaw = xpBase + k * Math.pow(x, alpha);

  if (x > 1000) {
    const surplus = x - 1000;
    xpRaw += k * (0.6 * Math.sqrt(surplus));
  }

  const xpRounded = Math.round(xpRaw);
  return Math.min(Math.max(xpRounded, 20), 600);
}

const ranks = [
  { index: 0, key: 'page', label: 'Page' },
  { index: 1, key: 'ecuyer', label: 'Écuyer' },
  { index: 5, key: 'baron', label: 'Baron' },
  { index: 6, key: 'vicomte', label: 'Vicomte' },
  { index: 8, key: 'comte', label: 'Comte' },
  { index: 10, key: 'marquis', label: 'Marquis' },
  { index: 12, key: 'duc', label: 'Duc' },
  { index: 14, key: 'prince', label: 'Prince' },
  { index: 19, key: 'roi', label: 'Roi' },
  { index: 22, key: 'empereur', label: 'Empereur' },
  { index: 25, key: 'empereur-des-empereurs', label: 'Empereur des Empereurs' },
];

async function generateReport() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  📊 RAPPORT DE RÉÉQUILIBRAGE - SYSTÈME DE PROGRESSION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Courbe XP des rangs
  console.log('1️⃣  COURBE XP DES RANGS\n');
  console.log('┌────────────────────────────┬─────────┬─────────┬──────────┐');
  console.log('│ Rang                       │ Ancien  │ Nouveau │ Gain     │');
  console.log('├────────────────────────────┼─────────┼─────────┼──────────┤');

  ranks.forEach(rank => {
    const oldXP = oldXpCurve(rank.index);
    const newXP = newXpCurve(rank.index);
    const diff = ((newXP - oldXP) / oldXP * 100).toFixed(0);
    const sign = diff >= 0 ? '+' : '';
    console.log(
      `│ ${rank.label.padEnd(26)} │ ${oldXP.toString().padStart(7)} │ ${newXP.toString().padStart(7)} │ ${(sign + diff + '%').padStart(8)} │`
    );
  });
  console.log('└────────────────────────────┴─────────┴─────────┴──────────┘\n');

  // 2. Conversion Points → XP
  console.log('2️⃣  CONVERSION POINTS → XP (Mode Classique)\n');
  console.log('┌────────┬─────────┬─────────┬──────────┐');
  console.log('│ Points │ Ancien  │ Nouveau │ Gain     │');
  console.log('├────────┼─────────┼─────────┼──────────┤');

  const pointsSamples = [100, 300, 500, 800, 1000, 1500, 2000, 3000];
  pointsSamples.forEach(pts => {
    const oldXP = oldPointsToXP(pts, 'classic');
    const newXP = newPointsToXP(pts, 'classic');
    const diff = ((newXP - oldXP) / oldXP * 100).toFixed(0);
    const sign = diff >= 0 ? '+' : '';
    console.log(
      `│ ${pts.toString().padStart(6)} │ ${oldXP.toString().padStart(7)} │ ${newXP.toString().padStart(7)} │ ${(sign + diff + '%').padStart(8)} │`
    );
  });
  console.log('└────────┴─────────┴─────────┴──────────┘\n');

  // 3. Quêtes quotidiennes
  const { data: quests } = await supabase.from('daily_quests').select('*');

  console.log('3️⃣  QUÊTES QUOTIDIENNES\n');
  console.log(`✅ ${quests?.length || 0} quêtes disponibles (au lieu de 3)\n`);

  let totalQuestXP = 0;
  const questsByType = {};

  if (quests) {
    quests.forEach(q => {
      if (!questsByType[q.quest_type]) questsByType[q.quest_type] = [];
      questsByType[q.quest_type].push(q);
      totalQuestXP += q.xp_reward;
    });

    Object.entries(questsByType).forEach(([type, items]) => {
      console.log(`  ${type.toUpperCase()}:`);
      items.forEach(q => {
        console.log(`    • ${q.title} → ${q.xp_reward} XP`);
      });
      console.log('');
    });
  }

  console.log(`  💰 XP total disponible: ${totalQuestXP} XP/jour\n`);
  console.log(`  📈 Ancien système: ~225 XP/jour`);
  console.log(`  📈 Nouveau système: ~${totalQuestXP} XP/jour`);
  console.log(`  🚀 Amélioration: +${((totalQuestXP - 225) / 225 * 100).toFixed(0)}%\n`);

  // 4. Achievements
  const { data: achievements } = await supabase.from('achievements').select('*');

  console.log('4️⃣  ACHIEVEMENTS\n');
  console.log(`✅ ${achievements?.length || 0} achievements disponibles (au lieu de 10)\n`);

  let totalAchXP = 0;
  const achByType = {};

  if (achievements) {
    achievements.forEach(a => {
      if (!achByType[a.achievement_type]) achByType[a.achievement_type] = { count: 0, xp: 0 };
      achByType[a.achievement_type].count++;
      achByType[a.achievement_type].xp += a.xp_bonus;
      totalAchXP += a.xp_bonus;
    });

    console.log('┌───────────┬────────┬──────────┐');
    console.log('│ Type      │ Nombre │ XP Total │');
    console.log('├───────────┼────────┼──────────┤');
    Object.entries(achByType).forEach(([type, stats]) => {
      console.log(`│ ${type.padEnd(9)} │ ${stats.count.toString().padStart(6)} │ ${stats.xp.toString().padStart(8)} │`);
    });
    console.log('└───────────┴────────┴──────────┘\n');
  }

  console.log(`  💰 XP total disponible: ${totalAchXP} XP`);
  console.log(`  📈 Ancien système: ~31,000 XP`);
  console.log(`  📈 Nouveau système: ~${totalAchXP} XP`);
  console.log(`  🚀 Amélioration: +${((totalAchXP - 31000) / 31000 * 100).toFixed(0)}%\n`);

  // 5. Estimation de progression
  console.log('5️⃣  ESTIMATION DE PROGRESSION\n');

  const avgPointsPerGame = 600; // Estimation moyenne
  const gamesPerDay = 3;
  const avgQuestXP = totalQuestXP * 0.6; // 60% des quêtes complétées

  const oldXPPerGame = oldPointsToXP(avgPointsPerGame, 'classic');
  const newXPPerGame = newPointsToXP(avgPointsPerGame, 'classic');

  const oldDailyXP = (oldXPPerGame * gamesPerDay) + (225 * 0.5); // 50% quêtes anciennes
  const newDailyXP = (newXPPerGame * gamesPerDay) + avgQuestXP;

  console.log(`  Par partie (${avgPointsPerGame} pts):`);
  console.log(`    Ancien: ${oldXPPerGame} XP`);
  console.log(`    Nouveau: ${newXPPerGame} XP`);
  console.log(`    Gain: +${((newXPPerGame - oldXPPerGame) / oldXPPerGame * 100).toFixed(0)}%\n`);

  console.log(`  Par jour (${gamesPerDay} parties + quêtes):`);
  console.log(`    Ancien: ~${Math.round(oldDailyXP)} XP`);
  console.log(`    Nouveau: ~${Math.round(newDailyXP)} XP`);
  console.log(`    Gain: +${((newDailyXP - oldDailyXP) / oldDailyXP * 100).toFixed(0)}%\n`);

  // Temps pour atteindre des rangs clés
  const ducOldXP = oldXpCurve(12);
  const ducNewXP = newXpCurve(12);
  const roiOldXP = oldXpCurve(19);
  const roiNewXP = newXpCurve(19);

  console.log(`  Temps pour atteindre Duc:`);
  console.log(`    Ancien: ~${Math.round(ducOldXP / oldDailyXP)} jours`);
  console.log(`    Nouveau: ~${Math.round(ducNewXP / newDailyXP)} jours`);
  console.log(`    Gain: -${Math.round((1 - (ducNewXP / newDailyXP) / (ducOldXP / oldDailyXP)) * 100)}%\n`);

  console.log(`  Temps pour atteindre Roi:`);
  console.log(`    Ancien: ~${Math.round(roiOldXP / oldDailyXP)} jours`);
  console.log(`    Nouveau: ~${Math.round(roiNewXP / newDailyXP)} jours`);
  console.log(`    Gain: -${Math.round((1 - (roiNewXP / newDailyXP) / (roiOldXP / oldDailyXP)) * 100)}%\n`);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ✅ RÉÉQUILIBRAGE TERMINÉ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('📝 RÉSUMÉ DES CHANGEMENTS:\n');
  console.log('  • Courbe XP des rangs: -25% XP requis');
  console.log('  • Conversion Points→XP: +50% XP gagné');
  console.log('  • Quêtes quotidiennes: 9 quêtes (au lieu de 3)');
  console.log('  • Achievements: 17 achievements (au lieu de 10)');
  console.log('  • Progression globale: ~2x plus rapide\n');
}

generateReport()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });

