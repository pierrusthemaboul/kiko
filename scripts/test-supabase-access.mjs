/**
 * Script de test pour vérifier l'accès Supabase
 *
 * Ce script teste toutes les fonctionnalités du helper
 */

import {
  supabase,
  viewQuests,
  viewAchievements,
  viewStats,
  getTopPlayers,
} from './supabase-helper.mjs';

console.log('🧪 TEST D\'ACCÈS SUPABASE\n');
console.log('═══════════════════════════════════════════════════════════════\n');

async function runTests() {
  let passed = 0;
  let failed = 0;

  // Test 1: Connexion Supabase
  console.log('1️⃣  Test de connexion Supabase...');
  try {
    const { data, error } = await supabase.from('daily_quests').select('count');
    if (error) throw error;
    console.log('   ✅ Connexion réussie\n');
    passed++;
  } catch (err) {
    console.error('   ❌ Échec:', err.message, '\n');
    failed++;
  }

  // Test 2: Récupération des quêtes
  console.log('2️⃣  Test récupération des quêtes...');
  try {
    const quests = await viewQuests();
    if (!quests || quests.length === 0) throw new Error('Aucune quête trouvée');
    console.log('   ✅ Quêtes récupérées\n');
    passed++;
  } catch (err) {
    console.error('   ❌ Échec:', err.message, '\n');
    failed++;
  }

  // Test 3: Récupération des achievements
  console.log('3️⃣  Test récupération des achievements...');
  try {
    const achievements = await viewAchievements();
    if (!achievements || achievements.length === 0) throw new Error('Aucun achievement trouvé');
    console.log('   ✅ Achievements récupérés\n');
    passed++;
  } catch (err) {
    console.error('   ❌ Échec:', err.message, '\n');
    failed++;
  }

  // Test 4: Statistiques
  console.log('4️⃣  Test récupération des statistiques...');
  try {
    const stats = await viewStats();
    if (stats === null) throw new Error('Stats null');
    console.log('   ✅ Statistiques récupérées\n');
    passed++;
  } catch (err) {
    console.error('   ❌ Échec:', err.message, '\n');
    failed++;
  }

  // Test 5: Top players (peut être vide, c'est normal)
  console.log('5️⃣  Test récupération top players...');
  try {
    const players = await getTopPlayers(5);
    console.log(`   ✅ Top players récupérés (${players?.length || 0} joueurs)\n`);
    passed++;
  } catch (err) {
    console.error('   ❌ Échec:', err.message, '\n');
    failed++;
  }

  // Résumé
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\n📊 RÉSULTAT: ${passed}/${passed + failed} tests réussis\n`);

  if (failed === 0) {
    console.log('✅ TOUS LES TESTS SONT PASSÉS !');
    console.log('\n🎉 Claude Code a maintenant un accès permanent à Supabase.');
    console.log('\nDans une nouvelle conversation, vous pouvez simplement demander :');
    console.log('  • "Montre-moi les quêtes"');
    console.log('  • "Affiche les statistiques Supabase"');
    console.log('  • "Combien d\'utilisateurs ?"');
    console.log('\nClaude utilisera automatiquement le helper Supabase.\n');
  } else {
    console.log('❌ CERTAINS TESTS ONT ÉCHOUÉ');
    console.log('\nVérifiez :');
    console.log('  1. Les variables d\'environnement dans .env');
    console.log('  2. La connexion internet');
    console.log('  3. Les permissions Supabase\n');
  }

  console.log('═══════════════════════════════════════════════════════════════\n');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ ERREUR FATALE:', err);
    process.exit(1);
  });
