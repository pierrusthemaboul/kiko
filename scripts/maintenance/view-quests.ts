import { supabase } from '../lib/supabase/supabaseClients.js';

async function viewQuests() {
  console.log('=== QUÊTES QUOTIDIENNES ===\n');

  const { data: quests, error: questsError } = await supabase
    .from('daily_quests')
    .select('*')
    .order('quest_key', { ascending: true });

  if (questsError) {
    console.error('Erreur lors de la récupération des quêtes:', questsError);
    return;
  }

  if (!quests || quests.length === 0) {
    console.log('❌ Aucune quête quotidienne trouvée dans la base de données.\n');
  } else {
    console.log(`✅ ${quests.length} quête(s) trouvée(s):\n`);
    quests.forEach((q, i) => {
      console.log(`${i + 1}. ${q.title}`);
      console.log(`   Key: ${q.quest_key}`);
      console.log(`   Type: ${q.quest_type}`);
      console.log(`   Description: ${q.description}`);
      console.log(`   Objectif: ${q.target_value}`);
      console.log(`   Récompense XP: ${q.xp_reward}`);
      console.log(`   Active: ${q.is_active ? '✓' : '✗'}`);
      console.log('');
    });
  }

  console.log('\n=== ACHIEVEMENTS ===\n');

  const { data: achievements, error: achievementsError } = await supabase
    .from('achievements')
    .select('*')
    .order('achievement_type', { ascending: true });

  if (achievementsError) {
    console.error('Erreur lors de la récupération des achievements:', achievementsError);
    return;
  }

  if (!achievements || achievements.length === 0) {
    console.log('❌ Aucun achievement trouvé dans la base de données.\n');
    console.log('ℹ️  Les achievements sont définis dans le code (lib/economy/quests.ts)\n');
  } else {
    console.log(`✅ ${achievements.length} achievement(s) trouvé(s):\n`);

    const byType: Record<string, any[]> = {};
    achievements.forEach(a => {
      if (!byType[a.achievement_type]) byType[a.achievement_type] = [];
      byType[a.achievement_type].push(a);
    });

    Object.entries(byType).forEach(([type, items]) => {
      console.log(`📌 ${type.toUpperCase()}:`);
      items.forEach(a => {
        console.log(`   - ${a.title} (${a.achievement_key}): ${a.xp_bonus} XP`);
      });
      console.log('');
    });
  }

  console.log('\n=== STATISTIQUES ===\n');

  // Compter les utilisateurs
  const { count: userCount, error: userError } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true });

  if (!userError) {
    console.log(`👥 Utilisateurs: ${userCount || 0}`);
  }

  // Compter les parties jouées
  const { count: runsCount, error: runsError } = await supabase
    .from('runs')
    .select('id', { count: 'exact', head: true });

  if (!runsError) {
    console.log(`🎮 Parties jouées: ${runsCount || 0}`);
  }

  // Progression moyenne des quêtes
  const { data: progressData, error: progressError } = await supabase
    .from('quest_progress')
    .select('quest_key, current_value, completed');

  if (!progressError && progressData && progressData.length > 0) {
    console.log(`\n📊 Progression des quêtes:`);
    const progressByQuest: Record<string, { total: number; completed: number; avgProgress: number }> = {};

    progressData.forEach(p => {
      if (!progressByQuest[p.quest_key]) {
        progressByQuest[p.quest_key] = { total: 0, completed: 0, avgProgress: 0 };
      }
      progressByQuest[p.quest_key].total++;
      if (p.completed) progressByQuest[p.quest_key].completed++;
      progressByQuest[p.quest_key].avgProgress += p.current_value;
    });

    Object.entries(progressByQuest).forEach(([key, stats]) => {
      const completionRate = ((stats.completed / stats.total) * 100).toFixed(1);
      console.log(`   ${key}: ${completionRate}% complété (${stats.completed}/${stats.total})`);
    });
  }

  console.log('\n=== FIN ===\n');
}

viewQuests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erreur fatale:', err);
    process.exit(1);
  });

