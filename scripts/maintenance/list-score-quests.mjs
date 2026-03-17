/**
 * Liste toutes les quêtes de score
 */
import { supabase } from './supabase-helper.mjs';

async function listScoreQuests() {
  console.log('🎯 QUÊTES DE SCORE DISPONIBLES\n');

  const { data: quests, error } = await supabase
    .from('daily_quests')
    .select('*')
    .or('quest_key.ilike.%score%,title.ilike.%score%,title.ilike.%points%')
    .order('quest_type, target_value');

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  console.log(`📋 ${quests.length} quête(s) de score trouvée(s):\n`);

  quests.forEach(q => {
    console.log(`• ${q.title || '(sans titre)'}`);
    console.log(`  Key: ${q.quest_key}`);
    console.log(`  Type: ${q.quest_type}`);
    console.log(`  Target: ${q.target_value}`);
    console.log(`  XP: ${q.xp_reward}`);
    console.log('');
  });

  // Chercher spécifiquement une quête 5000 points
  console.log('🔍 Recherche de quête "5000 points"...\n');

  const { data: fiveKQuests } = await supabase
    .from('daily_quests')
    .select('*')
    .or('target_value.eq.5000,title.ilike.%5000%,quest_key.ilike.%5000%');

  if (fiveKQuests && fiveKQuests.length > 0) {
    console.log('✅ Quête(s) 5000 points trouvée(s):');
    fiveKQuests.forEach(q => {
      console.log(`  • ${q.title} (${q.quest_key}) - Target: ${q.target_value}`);
    });
  } else {
    console.log('❌ Aucune quête avec target_value=5000 ou contenant "5000" dans le titre');
  }
}

listScoreQuests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });

