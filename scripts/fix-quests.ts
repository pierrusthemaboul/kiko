import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Charger les variables d'environnement
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const PIERRE_USER_ID = '9d97c5fe-9051-4da5-881a-f4f380cbb6b0';

async function main() {
  console.log('🔍 Vérification des quêtes existantes...\n');

  // 1. Lister les quêtes actives
  const { data: existingQuests, error: questsError } = await supabase
    .from('daily_quests')
    .select('quest_key, title, quest_type, target_value, xp_reward, is_active')
    .eq('is_active', true)
    .order('quest_type', { ascending: true })
    .order('quest_key', { ascending: true });

  if (questsError) {
    console.error('❌ Erreur récupération quêtes:', questsError);
    return;
  }

  console.log(`✅ ${existingQuests?.length || 0} quêtes actives trouvées\n`);

  // Grouper par type
  const byType: Record<string, any[]> = {};
  existingQuests?.forEach(q => {
    if (!byType[q.quest_type]) byType[q.quest_type] = [];
    byType[q.quest_type].push(q);
  });

  Object.entries(byType).forEach(([type, quests]) => {
    console.log(`\n📋 ${type.toUpperCase()} (${quests.length}):`);
    quests.forEach(q => {
      const target = q.target_value !== null ? q.target_value : '⚠️ NULL';
      console.log(`  - ${q.quest_key}: ${q.title || '⚠️ NO TITLE'} (target: ${target}, xp: ${q.xp_reward})`);
    });
  });

  // 2. Vérifier si weekly_champion_50000 existe
  const hasWeeklyChampion = existingQuests?.some(q =>
    q.quest_key === 'weekly_champion_50000' ||
    q.quest_key === 'weekly_score_50000' ||
    (q.quest_type === 'weekly' && q.target_value === 50000)
  );

  console.log('\n\n🏆 Quête "Champion de la semaine" (50 000 points):');
  if (hasWeeklyChampion) {
    console.log('  ✅ Trouvée !');
  } else {
    console.log('  ❌ Absente - Création...');

    const { error: insertError } = await supabase
      .from('daily_quests')
      .upsert({
        quest_key: 'weekly_champion_50000',
        title: '🏆 Champion de la Semaine',
        description: 'Marquer 50 000 points cumulés cette semaine',
        quest_type: 'weekly',
        target_value: 50000,
        xp_reward: 500,
        parts_reward: 0,
        is_active: true,
      }, {
        onConflict: 'quest_key'
      });

    if (insertError) {
      console.error('  ❌ Erreur création:', insertError);
    } else {
      console.log('  ✅ Créée avec succès !');
    }
  }

  // 3. Corriger les quêtes avec target_value NULL
  const nullTargetQuests = existingQuests?.filter(q => q.target_value === null) || [];

  if (nullTargetQuests.length > 0) {
    console.log(`\n\n⚠️  ${nullTargetQuests.length} quêtes avec target_value NULL:`);
    nullTargetQuests.forEach(q => {
      console.log(`  - ${q.quest_key}: ${q.title || 'NO TITLE'}`);
    });

    // Extraire target_value depuis le nom de la quête (ex: daily_score_1000 -> 1000)
    console.log('\n🔧 Tentative de correction automatique...');

    for (const quest of nullTargetQuests) {
      const match = quest.quest_key.match(/_(\d+)$/);
      if (match) {
        const targetValue = parseInt(match[1]);
        console.log(`  - ${quest.quest_key}: target_value NULL -> ${targetValue}`);

        const { error } = await supabase
          .from('daily_quests')
          .update({ target_value: targetValue })
          .eq('quest_key', quest.quest_key);

        if (error) {
          console.error(`    ❌ Erreur:`, error.message);
        } else {
          console.log(`    ✅ Corrigé`);
        }
      } else {
        console.log(`  - ${quest.quest_key}: ⚠️  Impossible de deviner target_value`);
      }
    }
  }

  // 4. Réinitialiser les quest_progress de Pierre
  console.log('\n\n🔄 Réinitialisation des quest_progress pour Pierre...');

  const { error: deleteError } = await supabase
    .from('quest_progress')
    .delete()
    .eq('user_id', PIERRE_USER_ID);

  if (deleteError) {
    console.error('❌ Erreur suppression:', deleteError);
  } else {
    console.log('✅ Toutes les progressions supprimées');
    console.log('ℹ️  Elles seront recréées automatiquement au prochain lancement de l\'app');
  }

  console.log('\n\n✨ Terminé ! Redémarre l\'app pour voir les changements.\n');
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('💥 Erreur fatale:', err);
    process.exit(1);
  });
