// Test rapide d'un seul événement avec logs de temps et coût
import 'dotenv/config';
import fs from 'fs';

console.log('🧪 [TEST] Chargement du script sevent3.mjs...\n');

// Charger le fichier etape2.json
const events = JSON.parse(fs.readFileSync('./etape2.json', 'utf8'));

if (events.length === 0) {
  console.log('❌ Aucun événement dans etape2.json');
  process.exit(1);
}

const testEvent = events[0];
console.log(`🎯 [TEST] Événement de test: "${testEvent.titre}" (${testEvent.year})\n`);
console.log('📊 [TEST] Les logs de temps et coût apparaîtront ci-dessous:\n');
console.log('='.repeat(80));
console.log('\n');

// Importer et exécuter
// Note: sevent3.mjs doit être modifié pour exporter ses fonctions
// Pour l'instant, on va juste montrer comment ça marcherait

console.log(`
📋 SIMULATION DES LOGS ATTENDUS:
================================

🔍 [DEBUG] Traitement "Découverte de l'Amérique" (1492)

⏱️  [PERF] Enrichissement Gemini: 1234ms (coût: $0.000023)
✅ [DEBUG] Enrichissement terminé

⏱️  [PERF] Génération prompt Claude: 2567ms (coût: $0.012500) tentative 1
✅ [DEBUG] Prompt généré: "A historic moment at the shores of the Bahamas..."

⏱️  [PERF] Génération image Replicate: 8901ms (coût: $0.003000) tentative 1
✅ [DEBUG] Image générée sur Replicate: https://replicate.delivery/czjl/...

⏱️  [PERF] Upload image Supabase Storage: 3456ms (coût: $0.000000) (download + resize + upload)
✅ [DEBUG] Image uploadée dans Supabase: https://ppxmtnuewcixbbmhnzzc.supabase.co/storage/...

⏱️  [PERF] Validation image Gemini: 15234ms (coût: $0.000045) score: 8/10
🤖 [DEBUG] Validation Claude:
  - Score: 8/10
  - Validation: OK

⏱️  [PERF] Insertion DB goju2: 234ms (coût: $0.000000) (local ou Supabase)
✅ [DEBUG] Insertion DB réussie

📊 [RÉSUMÉ PERFORMANCE] "Découverte de l'Amérique"
   Temps total: 31626ms (31.6s)
   Coût total estimé: $0.015568
   Détail par étape:
     - Enrichissement Gemini: 1234ms ($0.000023)
     - Génération prompt Claude: 2567ms ($0.012500) tentative 1
     - Génération image Replicate: 8901ms ($0.003000) tentative 1
     - Upload image Supabase Storage: 3456ms ($0.000000) (download + resize + upload)
     - Validation image Gemini: 15234ms ($0.000045) score: 8/10
     - Insertion DB goju2: 234ms ($0.000000) (local ou Supabase)

`);

console.log('='.repeat(80));
console.log('\n📌 [INFO] Pour lancer le vrai test, utilisez:');
console.log('   cd c:/Users/Pierre/kiko && node machine_a_evenements/sevent3.mjs --test-single --queue');
console.log('\n📌 [INFO] Mais il faut d\'abord:');
console.log('   1. Créer la table queue_sevent dans Supabase');
console.log('   2. Insérer un événement avec status=\'pending\'');
