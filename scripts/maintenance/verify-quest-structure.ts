import { createClient } from '@supabase/supabase-js';

// Utiliser la clé service pour pouvoir modifier
const SUPABASE_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifyStructure() {
  console.log('🔍 VÉRIFICATION DE LA STRUCTURE DE LA TABLE daily_quests\n');

  // Récupérer une quête pour examiner la structure
  const { data, error } = await supabase
    .from('daily_quests')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  Aucune quête trouvée dans la table');
    return;
  }

  console.log('📋 Colonnes actuelles:\n');
  const quest = data[0] as any;
  const columns = Object.keys(quest);

  columns.forEach(col => {
    const value = quest[col];
    const type = typeof value;
    console.log(`  - ${col.padEnd(25)} (${type})`);
  });

  console.log('\n🎯 Colonnes requises pour le scaling:\n');

  const requiredColumns = ['min_rank_index', 'max_rank_index'];
  const missingColumns: string[] = [];

  requiredColumns.forEach(col => {
    if (columns.includes(col)) {
      console.log(`  ✅ ${col} - existe`);
    } else {
      console.log(`  ❌ ${col} - manquante`);
      missingColumns.push(col);
    }
  });

  if (missingColumns.length > 0) {
    console.log('\n⚠️  COLONNES MANQUANTES DÉTECTÉES\n');
    console.log('📝 Exécutez le script SQL suivant dans Supabase:\n');
    console.log('   scripts/add-quest-rank-columns.sql\n');
    console.log('Ou exécutez directement:');
    console.log('```sql');
    console.log('ALTER TABLE daily_quests');
    console.log('  ADD COLUMN IF NOT EXISTS min_rank_index INTEGER DEFAULT 0,');
    console.log('  ADD COLUMN IF NOT EXISTS max_rank_index INTEGER DEFAULT 99;');
    console.log('```\n');
  } else {
    console.log('\n✅ Structure prête pour le scaling par grade !');
    console.log('🚀 Vous pouvez maintenant exécuter: npx ts-node scripts/fix-quests-text-and-scaling.ts\n');
  }

  // Afficher quelques quêtes actuelles
  console.log('\n📊 Exemple de quêtes actuelles:\n');

  const { data: sampleQuests } = await supabase
    .from('daily_quests')
    .select('quest_key, title, description, target_value, xp_reward, quest_type')
    .eq('is_active', true)
    .order('quest_type')
    .limit(5);

  if (sampleQuests) {
    sampleQuests.forEach((q: any) => {
      console.log(`[${q.quest_type.toUpperCase()}] ${q.quest_key}`);
      console.log(`  ${q.title}: ${q.description}`);
      console.log(`  Objectif: ${q.target_value} | Récompense: ${q.xp_reward} XP\n`);
    });
  }
}

verifyStructure().catch(console.error);

