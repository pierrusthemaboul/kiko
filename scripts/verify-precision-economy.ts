import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY4OTkxMjcsImV4cCI6MjA0MjQ3NTEyN30.0z2be74E3db-XvyIKXPlogI__9Ric1Il4cZ1Fs7TJ5U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const userId = '9d97c5fe-9051-4da5-881a-f4f380cbb6b0';

async function verifyPrecisionEconomy() {
  console.log('\n🔍 === VÉRIFICATION APRÈS PARTIE PRÉCISION ===\n');

  // 1. Runs en mode precision
  console.log('🎯 Runs en mode Précision:');
  const { data: precisionRuns } = await supabase
    .from('runs')
    .select('*')
    .eq('user_id', userId)
    .eq('mode', 'precision')
    .order('created_at', { ascending: false })
    .limit(5);

  if (precisionRuns && precisionRuns.length > 0) {
    console.log(`  ✅ ${precisionRuns.length} run(s) trouvé(s) en mode Précision`);
    precisionRuns.forEach((run, i) => {
      const date = new Date(run.created_at).toLocaleString('fr-FR');
      console.log(`  ${i + 1}. Score: ${run.points} pts - ${date} - XP: ${run.xp_earned}`);
    });
  } else {
    console.log('  ❌ Aucun run en mode Précision trouvé');
  }

  // 2. Profil (XP total)
  console.log('\n👤 Profil:');
  const { data: profile } = await supabase
    .from('profiles')
    .select('xp_total, games_played, high_score_precision, current_streak')
    .eq('id', userId)
    .single();

  if (profile) {
    console.log(`  XP Total: ${profile.xp_total}`);
    console.log(`  Parties jouées: ${profile.games_played}`);
    console.log(`  Meilleur score Précision: ${profile.high_score_precision}`);
    console.log(`  Streak actuel: ${profile.current_streak}`);
  }

  // 3. Quest progress
  console.log('\n📋 Progression des quêtes:');
  const { data: questProgress } = await supabase
    .from('quest_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('completed', false)
    .order('updated_at', { ascending: false });

  if (questProgress && questProgress.length > 0) {
    console.log(`  ${questProgress.length} quête(s) en cours\n`);

    // Récupérer les détails des quêtes
    const questKeys = questProgress.map(q => q.quest_key);
    const { data: quests } = await supabase
      .from('daily_quests')
      .select('*')
      .in('quest_key', questKeys);

    // Afficher les quêtes "play"
    const playQuests = questProgress.filter(q =>
      q.quest_key.includes('_play_') ||
      q.quest_key.startsWith('daily_play_') ||
      q.quest_key.startsWith('weekly_play_') ||
      q.quest_key.startsWith('monthly_play_')
    );

    if (playQuests.length > 0) {
      console.log('  🎮 Quêtes "Jouer X parties":');
      playQuests.forEach(progress => {
        const quest = quests?.find(q => q.quest_key === progress.quest_key);
        const lastUpdate = new Date(progress.updated_at).toLocaleString('fr-FR');
        console.log(`    - ${quest?.title || progress.quest_key}: ${progress.current_value}/${quest?.target_value || '?'} (MAJ: ${lastUpdate})`);
      });
    }

    // Afficher les quêtes de score
    const scoreQuests = questProgress.filter(q =>
      q.quest_key.includes('_score_') ||
      q.quest_key.includes('_champion') ||
      q.quest_key.includes('_points')
    );

    if (scoreQuests.length > 0) {
      console.log('\n  💯 Quêtes de score:');
      scoreQuests.forEach(progress => {
        const quest = quests?.find(q => q.quest_key === progress.quest_key);
        const lastUpdate = new Date(progress.updated_at).toLocaleString('fr-FR');
        console.log(`    - ${quest?.title || progress.quest_key}: ${progress.current_value}/${quest?.target_value || '?'} (MAJ: ${lastUpdate})`);
      });
    }
  } else {
    console.log('  ⚠️ Aucune quête en cours (elles sont peut-être toutes complétées?)');
  }

  // 4. Quêtes complétées récemment
  console.log('\n✅ Quêtes complétées (dernières 24h):');
  const oneDayAgo = new Date();
  oneDayAgo.setHours(oneDayAgo.getHours() - 24);

  const { data: completedQuests } = await supabase
    .from('quest_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('completed_at', oneDayAgo.toISOString())
    .order('completed_at', { ascending: false });

  if (completedQuests && completedQuests.length > 0) {
    console.log(`  ${completedQuests.length} quête(s) complétée(s)\n`);

    const questKeys = completedQuests.map(q => q.quest_key);
    const { data: quests } = await supabase
      .from('daily_quests')
      .select('*')
      .in('quest_key', questKeys);

    completedQuests.forEach(progress => {
      const quest = quests?.find(q => q.quest_key === progress.quest_key);
      const completedAt = new Date(progress.completed_at!).toLocaleString('fr-FR');
      console.log(`    ✅ ${quest?.title || progress.quest_key} - ${completedAt} (+${quest?.xp_reward || 0} XP)`);
    });
  } else {
    console.log('  Aucune quête complétée dans les dernières 24h');
  }

  console.log('\n');
}

verifyPrecisionEconomy().catch(console.error);
