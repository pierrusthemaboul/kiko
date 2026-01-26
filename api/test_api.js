/**
 * Script de test de l'API Timalaus
 *
 * Valide que l'API fonctionne correctement avant utilisation par Reporters
 *
 * Usage: node api/test_api.js
 */

const { GameAPI } = require('./core/GameAPI');

console.log('🧪 TEST API TIMALAUS\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let testsReussis = 0;
let testsEchoues = 0;

async function test(nom, fn) {
  process.stdout.write(`📋 ${nom}... `);
  try {
    await fn();
    console.log('✅');
    testsReussis++;
  } catch (e) {
    console.log('❌');
    console.error(`   Erreur: ${e.message}`);
    testsEchoues++;
  }
}

async function main() {
  // Test 1 : Chargement événements
  await test('Chargement des événements', async () => {
    const evenements = await GameAPI.chargerEvenements({});
    if (evenements.length === 0) {
      throw new Error('Aucun événement chargé (table vide ?)');
    }
    console.log(`\n   → ${evenements.length} événements chargés`);
  });

  // Test 2 : Simulation partie gagnante
  await test('Simulation partie gagnante', async () => {
    const partie = await GameAPI.simulerPartie('Classique', {
      type: 'gagnante',
      evenementsCount: 6,
    });

    if (partie.resultat !== 'victoire') {
      throw new Error(`Attendu 'victoire', reçu '${partie.resultat}'`);
    }

    if (partie.erreurs !== 0) {
      throw new Error(`Attendu 0 erreurs, reçu ${partie.erreurs}`);
    }

    console.log(`\n   → Score: ${partie.score}`);
  });

  // Test 3 : Simulation partie perdante
  await test('Simulation partie perdante', async () => {
    const partie = await GameAPI.simulerPartie('Classique', {
      type: 'perdante',
      evenementsCount: 6,
      tourErreur: 3,
    });

    if (partie.resultat !== 'defaite') {
      throw new Error(`Attendu 'defaite', reçu '${partie.resultat}'`);
    }

    if (partie.erreurs === 0) {
      throw new Error('Aucune erreur détectée dans partie perdante');
    }

    const tourErreur = partie.choix.findIndex(c => !c.correct) + 1;
    console.log(`\n   → Erreur au tour ${tourErreur}`);
  });

  // Test 4 : Filtrage par période
  await test('Filtrage par période', async () => {
    const evenements = await GameAPI.chargerEvenements({
      periode: '1800-1900',
    });

    if (evenements.length === 0) {
      throw new Error('Aucun événement trouvé pour période 1800-1900');
    }

    // Vérifier que tous les événements sont dans la période
    const horsPlage = evenements.filter(e => e.date < 1800 || e.date > 1900);
    if (horsPlage.length > 0) {
      throw new Error(`${horsPlage.length} événements hors période`);
    }

    console.log(`\n   → ${evenements.length} événements dans la période`);
  });

  // Test 5 : Recherche meilleure partie
  await test('Recherche meilleure partie (3 tentatives)', async () => {
    const meilleure = await GameAPI.trouverMeilleurePartie(
      'Classique',
      { type: 'gagnante' },
      3
    );

    if (!meilleure || !meilleure.score) {
      throw new Error('Aucune partie retournée');
    }

    console.log(`\n   → Meilleur score: ${meilleure.score}`);
  });

  // Test 6 : Obtenir les stats
  await test('Extraction des stats', async () => {
    const partie = await GameAPI.simulerPartie('Classique', {
      type: 'gagnante',
    });

    const stats = GameAPI.getStats(partie);

    if (!stats.mode || !stats.score || !stats.precision) {
      throw new Error('Stats incomplètes');
    }

    console.log(`\n   → Précision: ${stats.precision}%`);
  });

  // Résumé
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📊 RÉSULTAT DES TESTS\n');
  console.log(`   ✅ Réussis: ${testsReussis}`);
  console.log(`   ❌ Échoués: ${testsEchoues}`);
  console.log(`   📈 Taux de réussite: ${(testsReussis / (testsReussis + testsEchoues) * 100).toFixed(1)}%`);

  if (testsEchoues === 0) {
    console.log('\n🎉 TOUS LES TESTS SONT PASSÉS !');
    console.log('\n✅ L\'API est prête à être utilisée par Reporters\n');
    console.log('📋 PROCHAINES ÉTAPES:');
    console.log('   1. Tester avec Reporters: cd Architecture_MD/Reporters/TOOLS');
    console.log('   2. Lancer: node tom_api_simulator.js --type gagnante');
    console.log('   3. Vérifier les fichiers générés dans ASSETS_RAW/\n');
  } else {
    console.log('\n⚠️  CERTAINS TESTS ONT ÉCHOUÉ');
    console.log('\n🔧 VÉRIFICATIONS:');
    console.log('   1. Variables d\'environnement Supabase configurées ?');
    console.log('   2. Table "evenements" existe et contient des données ?');
    console.log('   3. Connexion Supabase fonctionnelle ?\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\n💥 ERREUR FATALE:', err.message);
  console.error(err.stack);
  process.exit(1);
});
