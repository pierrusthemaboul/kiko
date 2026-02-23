import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixQuestSystem() {
  console.log('\n🔧 ===== CORRECTION DU SYSTÈME DE QUÊTES =====\n');

  try {
    // 1. Vérifier les doublons de quest_key dans daily_quests
    console.log('📋 1. Vérification de l\'unicité de quest_key...');
    const { data: duplicates, error: dupError } = await supabase.rpc('check_quest_key_duplicates', {});

    // Note: Si cette RPC n'existe pas, on fait la vérification autrement
    const { data: allQuests } = await supabase
      .from('daily_quests')
      .select('quest_key');

    if (allQuests) {
      const questKeys = allQuests.map(q => q.quest_key);
      const duplicateKeys = questKeys.filter((item, index) => questKeys.indexOf(item) !== index);

      if (duplicateKeys.length > 0) {
        console.log('   ⚠️  Doublons détectés:', duplicateKeys);
        console.log('   ⚠️  Impossible de créer la foreign key avec des doublons!');
        return;
      } else {
        console.log('   ✅ Pas de doublons - quest_key est unique');
      }
    }

    // 2. Créer la contrainte unique sur quest_key dans daily_quests
    console.log('\n🔑 2. Création de la contrainte unique sur daily_quests.quest_key...');
    const { error: uniqueError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE daily_quests ADD CONSTRAINT daily_quests_quest_key_unique UNIQUE (quest_key);'
    });

    // Si RPC n'existe pas, on doit utiliser une autre méthode
    // Note: Supabase client ne peut pas exécuter de DDL directement
    console.log('   ℹ️  Cette opération doit être faite manuellement via le Dashboard Supabase ou psql');
    console.log('   SQL à exécuter:');
    console.log('   ');
    console.log('   ALTER TABLE daily_quests');
    console.log('   ADD CONSTRAINT daily_quests_quest_key_unique UNIQUE (quest_key);');
    console.log('   ');
    console.log('   ALTER TABLE quest_progress');
    console.log('   ADD CONSTRAINT quest_progress_quest_key_fkey');
    console.log('   FOREIGN KEY (quest_key)');
    console.log('   REFERENCES daily_quests(quest_key)');
    console.log('   ON DELETE CASCADE');
    console.log('   ON UPDATE CASCADE;');
    console.log('   ');

    // 3. Désactiver les quêtes du mode Précision
    console.log('\n🎯 3. Désactivation des quêtes du mode Précision...');
    const precisionQuests = ['t2_precision_perfect', 'weekly_precision_master'];

    for (const questKey of precisionQuests) {
      const { error: deactivateError } = await supabase
        .from('daily_quests')
        .update({ is_active: false })
        .eq('quest_key', questKey);

      if (deactivateError) {
        console.log(`   ❌ Erreur désactivation ${questKey}:`, deactivateError.message);
      } else {
        console.log(`   ✅ Désactivé: ${questKey}`);
      }
    }

    // 4. Supprimer les quest_progress orphelins liés aux quêtes précision
    console.log('\n🧹 4. Nettoyage des quest_progress des quêtes Précision...');
    const { data: deletedProgress, error: deleteError } = await supabase
      .from('quest_progress')
      .delete()
      .in('quest_key', precisionQuests)
      .select();

    if (deleteError) {
      console.log('   ❌ Erreur suppression:', deleteError.message);
    } else {
      console.log(`   ✅ Supprimé ${deletedProgress?.length || 0} quest_progress`);
    }

    // 5. Vérification finale
    console.log('\n📊 5. Vérification finale...');
    const { data: activeQuests } = await supabase
      .from('daily_quests')
      .select('quest_key, title, is_active')
      .eq('is_active', true)
      .order('quest_type');

    console.log(`   ✅ ${activeQuests?.length || 0} quêtes actives`);

    const precisionActive = activeQuests?.filter(q =>
      q.quest_key.toLowerCase().includes('precision')
    );

    if (precisionActive && precisionActive.length > 0) {
      console.log('   ⚠️  Quêtes Précision encore actives:', precisionActive.map(q => q.quest_key));
    } else {
      console.log('   ✅ Aucune quête Précision active');
    }

    console.log('\n✅ ===== CORRECTION TERMINÉE =====');
    console.log('\n⚠️  IMPORTANT: Vous devez exécuter manuellement le SQL ci-dessus');
    console.log('   dans le Dashboard Supabase (SQL Editor) pour créer la foreign key.');

  } catch (error) {
    console.error('\n❌ ERREUR:', error);
  }
}

fixQuestSystem().catch(console.error);
