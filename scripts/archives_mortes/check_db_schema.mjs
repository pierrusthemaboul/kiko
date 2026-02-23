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
  console.log('\n🔍 ===== VÉRIFICATION DU SCHÉMA DE LA BASE =====\n');

  // 1. Vérifier la structure de quest_progress
  console.log('📋 1. Structure de quest_progress:');
  const { data: questProgressSample, error: qpError } = await supabase
    .from('quest_progress')
    .select('*')
    .limit(1);

  if (qpError) {
    console.error('❌ Erreur:', qpError);
  } else if (questProgressSample && questProgressSample.length > 0) {
    console.log('   Colonnes:', Object.keys(questProgressSample[0]));
  }

  // 2. Vérifier la structure de daily_quests
  console.log('\n📋 2. Structure de daily_quests:');
  const { data: dailyQuestsSample, error: dqError } = await supabase
    .from('daily_quests')
    .select('*')
    .limit(1);

  if (dqError) {
    console.error('❌ Erreur:', dqError);
  } else if (dailyQuestsSample && dailyQuestsSample.length > 0) {
    console.log('   Colonnes:', Object.keys(dailyQuestsSample[0]));
  }

  // 3. Vérifier la relation via SQL direct
  console.log('\n🔗 3. Test de relation via RPC (SQL):');

  // Vérifier si on peut faire un JOIN manuel
  console.log('\n   Test 1: Récupération séparée puis JOIN manuel...');
  const { data: qp } = await supabase
    .from('quest_progress')
    .select('id, quest_key, user_id, current_value, completed, claimed')
    .limit(5);

  if (qp && qp.length > 0) {
    console.log(`   ✅ Récupéré ${qp.length} quest_progress`);

    for (const progress of qp) {
      const { data: quest, error } = await supabase
        .from('daily_quests')
        .select('quest_key, title, xp_reward, target_value')
        .eq('quest_key', progress.quest_key)
        .single();

      if (error) {
        console.log(`   ⚠️  Impossible de trouver la quête "${progress.quest_key}":`, error.message);
      } else if (quest) {
        console.log(`   ✅ quest_key="${progress.quest_key}" -> Quête trouvée: "${quest.title}"`);
      }
    }
  }

  // 4. Vérifier les clés étrangères
  console.log('\n🔑 4. Vérification des foreign keys:');
  console.log('   Note: Supabase client ne peut pas directement lire les contraintes.');
  console.log('   Vérification manuelle nécessaire dans le dashboard Supabase.');

  // 5. Test du JOIN exact utilisé dans le code
  console.log('\n🧪 5. Test du JOIN exact du code (quest_progress -> daily_quests):');
  const { data: joinResult, error: joinError } = await supabase
    .from('quest_progress')
    .select('*, daily_quests(*)')
    .limit(1);

  if (joinError) {
    console.log('   ❌ ÉCHEC:', joinError.message);
    console.log('   Code:', joinError.code);
    console.log('\n   💡 SOLUTION: Il faut créer une foreign key dans quest_progress.quest_key -> daily_quests.quest_key');
  } else {
    console.log('   ✅ JOIN fonctionne!');
    if (joinResult && joinResult.length > 0) {
      console.log('   Données:', JSON.stringify(joinResult[0], null, 2));
    }
  }

  // 6. Vérifier la clé primaire de daily_quests
  console.log('\n🔑 6. Vérification de la clé primaire de daily_quests:');
  const { data: dqKeys } = await supabase
    .from('daily_quests')
    .select('id, quest_key')
    .limit(3);

  if (dqKeys) {
    console.log('   Échantillon:');
    dqKeys.forEach(q => {
      console.log(`      id=${q.id}, quest_key="${q.quest_key}"`);
    });
  }

  console.log('\n✅ ===== FIN DE LA VÉRIFICATION =====\n');
}

checkSchema().catch(console.error);
