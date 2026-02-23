import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('\n🔍 ===== VÉRIFICATION DU SCHÉMA quest_progress =====\n');

  // 1. Récupérer un échantillon
  const { data: sample, error } = await supabase
    .from('quest_progress')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Erreur:', error.message);
    return;
  }

  if (sample && sample.length > 0) {
    console.log('📋 Colonnes présentes dans quest_progress:');
    console.log('');
    Object.keys(sample[0]).forEach(col => {
      console.log(`   ✅ ${col}: ${typeof sample[0][col]}`);
    });

    console.log('\n\n❌ Colonnes MANQUANTES:');
    const expectedColumns = ['claimed'];

    expectedColumns.forEach(col => {
      if (!sample[0].hasOwnProperty(col)) {
        console.log(`   ⚠️  ${col}`);
      }
    });

    console.log('\n\n💡 SOLUTION:');
    console.log('\n   Pour ajouter la colonne "claimed", exécutez ce SQL:');
    console.log('\n   ALTER TABLE quest_progress');
    console.log('   ADD COLUMN claimed BOOLEAN DEFAULT false;');
    console.log('\n   UPDATE quest_progress');
    console.log('   SET claimed = false');
    console.log('   WHERE claimed IS NULL;');
    console.log('');
  } else {
    console.log('⚠️  Aucune donnée dans quest_progress');
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

checkSchema().catch(console.error);
