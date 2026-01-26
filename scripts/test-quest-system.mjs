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

// Fonction de sélection des quêtes quotidiennes (même logique que questSelection.ts)
function getDailySeed() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  return year * 10000 + month * 100 + day;
}

function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648;
    return value / 2147483648;
  };
}

function shuffleWithSeed(array, seed) {
  const shuffled = [...array];
  const random = seededRandom(seed);

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

async function testQuestSystem() {
  console.log('🧪 TEST DU NOUVEAU SYSTÈME DE QUÊTES\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Vérifier les quêtes quotidiennes
  console.log('1️⃣  QUÊTES QUOTIDIENNES (Pool)\n');

  const { data: dailyQuests, error: dailyError } = await supabase
    .from('daily_quests')
    .select('*')
    .eq('quest_type', 'daily')
    .eq('is_active', true);

  if (dailyError) {
    console.error('❌ Erreur:', dailyError);
    return;
  }

  console.log(`   ✅ ${dailyQuests.length} quêtes quotidiennes dans le pool\n`);

  // Sélection aléatoire (seed du jour)
  const seed = getDailySeed();
  const shuffled = shuffleWithSeed(dailyQuests, seed);
  const selectedDaily = shuffled.slice(0, 3);

  console.log(`   📋 3 quêtes sélectionnées pour aujourd\'hui (seed: ${seed}):\n`);
  selectedDaily.forEach((q, i) => {
    console.log(`   ${i + 1}. ${q.title}`);
    console.log(`      → ${q.xp_reward} XP${q.parts_reward > 0 ? ` + ${q.parts_reward} partie(s)` : ''}`);
    console.log(`      Difficulté: ${'⭐'.repeat(q.difficulty)}\n`);
  });

  // 2. Vérifier les quêtes hebdomadaires
  console.log('2️⃣  QUÊTES HEBDOMADAIRES\n');

  const { data: weeklyQuests, error: weeklyError } = await supabase
    .from('daily_quests')
    .select('*')
    .eq('quest_type', 'weekly')
    .eq('is_active', true)
    .limit(3);

  if (weeklyError) {
    console.error('❌ Erreur:', weeklyError);
    return;
  }

  console.log(`   ✅ ${weeklyQuests.length} quêtes hebdomadaires actives\n`);
  weeklyQuests.forEach((q, i) => {
    console.log(`   ${i + 1}. ${q.title}`);
    console.log(`      → ${q.xp_reward} XP${q.parts_reward > 0 ? ` + ${q.parts_reward} partie(s)` : ''}`);
    console.log(`      Difficulté: ${'⭐'.repeat(q.difficulty)}\n`);
  });

  // 3. Vérifier les quêtes mensuelles
  console.log('3️⃣  QUÊTES MENSUELLES\n');

  const { data: monthlyQuests, error: monthlyError } = await supabase
    .from('daily_quests')
    .select('*')
    .eq('quest_type', 'monthly')
    .eq('is_active', true)
    .limit(3);

  if (monthlyError) {
    console.error('❌ Erreur:', monthlyError);
    return;
  }

  console.log(`   ✅ ${monthlyQuests.length} quêtes mensuelles actives\n`);
  monthlyQuests.forEach((q, i) => {
    console.log(`   ${i + 1}. ${q.title}`);
    console.log(`      → ${q.xp_reward} XP${q.parts_reward > 0 ? ` + ${q.parts_reward} partie(s)` : ''}`);
    console.log(`      Difficulté: ${'⭐'.repeat(q.difficulty)}\n`);
  });

  // 4. Calculer les récompenses totales possibles
  console.log('4️⃣  RÉCOMPENSES TOTALES POSSIBLES\n');

  const totalDailyXP = selectedDaily.reduce((sum, q) => sum + q.xp_reward, 0);
  const totalDailyParts = selectedDaily.reduce((sum, q) => sum + q.parts_reward, 0);

  const totalWeeklyXP = weeklyQuests.reduce((sum, q) => sum + q.xp_reward, 0);
  const totalWeeklyParts = weeklyQuests.reduce((sum, q) => sum + q.parts_reward, 0);

  const totalMonthlyXP = monthlyQuests.reduce((sum, q) => sum + q.xp_reward, 0);
  const totalMonthlyParts = monthlyQuests.reduce((sum, q) => sum + q.parts_reward, 0);

  console.log(`   Aujourd'hui:`);
  console.log(`      ${totalDailyXP} XP + ${totalDailyParts} partie(s)\n`);

  console.log(`   Cette semaine:`);
  console.log(`      ${totalWeeklyXP} XP + ${totalWeeklyParts} partie(s)\n`);

  console.log(`   Ce mois:`);
  console.log(`      ${totalMonthlyXP} XP + ${totalMonthlyParts} partie(s)\n`);

  const totalWeekXP = (totalDailyXP * 7) + totalWeeklyXP;
  const totalWeekParts = (totalDailyParts * 7) + totalWeeklyParts;

  console.log(`   📊 Par semaine (en complétant tout):`);
  console.log(`      ~${totalWeekXP} XP + ~${totalWeekParts} partie(s)\n`);

  const totalMonthXP = (totalDailyXP * 30) + totalWeeklyXP + totalMonthlyXP;
  const totalMonthParts = (totalDailyParts * 30) + totalWeeklyParts + totalMonthlyParts;

  console.log(`   📊 Par mois (en complétant tout):`);
  console.log(`      ~${totalMonthXP} XP + ~${totalMonthParts} partie(s)\n`);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ SYSTÈME DE QUÊTES OPÉRATIONNEL !\n');

  console.log('📝 PROCHAINES ÉTAPES:\n');
  console.log('   1. Tester l\'affichage dans vue1 (composant QuestCarousel)');
  console.log('   2. Implémenter la logique de tracking des quêtes');
  console.log('   3. Ajouter les récompenses en parties au système');
  console.log('   4. Tester la rotation automatique des quêtes\n');
}

testQuestSystem()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
  });
