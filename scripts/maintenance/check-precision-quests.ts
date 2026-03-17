import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY4OTkxMjcsImV4cCI6MjA0MjQ3NTEyN30.0z2be74E3db-XvyIKXPlogI__9Ric1Il4cZ1Fs7TJ5U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const userId = '9d97c5fe-9051-4da5-881a-f4f380cbb6b0';

async function checkPrecisionQuests() {
  console.log('\n🔍 === VÉRIFICATION DES QUÊTES ET PARTIES ===\n');

  // 1. Dernières parties (runs)
  console.log('📊 Dernières 5 parties:');
  const { data: runs, error: runsError } = await supabase
    .from('runs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (runsError) {
    console.error('❌ Erreur runs:', runsError);
  } else {
    runs?.forEach((run, i) => {
      console.log(`  ${i + 1}. ${run.mode} - ${run.points} pts - ${new Date(run.created_at).toLocaleString('fr-FR')} - Eco applied: ${run.economy_applied_at ? '✅' : '❌'}`);
    });
  }

  // 2. Parties en mode precision
  console.log('\n🎯 Parties en mode Précision (aujourd\'hui):');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: precisionRuns, error: precisionError } = await supabase
    .from('runs')
    .select('*')
    .eq('user_id', userId)
    .eq('mode', 'precision')
    .gte('created_at', today.toISOString())
    .order('created_at', { ascending: false });

  if (precisionError) {
    console.error('❌ Erreur precision runs:', precisionError);
  } else {
    console.log(`  Total: ${precisionRuns?.length || 0} partie(s)`);
    precisionRuns?.forEach((run, i) => {
      console.log(`  ${i + 1}. ${run.points} pts - ${new Date(run.created_at).toLocaleString('fr-FR')} - Eco applied: ${run.economy_applied_at ? '✅' : '❌'}`);
    });
  }

  // 3. Progression des quêtes non complétées
  console.log('\n📋 Quêtes non complétées (progression):');
  const { data: questProgress, error: progressError } = await supabase
    .from('quest_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('completed', false)
    .order('updated_at', { ascending: false });

  if (progressError) {
    console.error('❌ Erreur quest_progress:', progressError);
  } else {
    console.log(`  Total: ${questProgress?.length || 0} quête(s) en cours`);

    // Récupérer les infos des quêtes
    const questKeys = questProgress?.map(q => q.quest_key) || [];
    const { data: quests } = await supabase
      .from('daily_quests')
      .select('*')
      .in('quest_key', questKeys);

    questProgress?.forEach((progress) => {
      const quest = quests?.find(q => q.quest_key === progress.quest_key);
      const lastUpdate = new Date(progress.updated_at).toLocaleString('fr-FR');
      console.log(`  - ${progress.quest_key}: ${progress.current_value}/${quest?.target_value || '?'} (${quest?.quest_type || '?'}) - MAJ: ${lastUpdate}`);
    });
  }

  // 4. Quêtes play_X spécifiquement
  console.log('\n🎮 Quêtes "play" (jouer X parties):');
  const playQuests = questProgress?.filter(q =>
    q.quest_key.includes('_play_') ||
    q.quest_key.startsWith('daily_play_') ||
    q.quest_key.startsWith('weekly_play_') ||
    q.quest_key.startsWith('monthly_play_')
  );

  if (playQuests && playQuests.length > 0) {
    const { data: playQuestDetails } = await supabase
      .from('daily_quests')
      .select('*')
      .in('quest_key', playQuests.map(q => q.quest_key));

    playQuests.forEach((progress) => {
      const quest = playQuestDetails?.find(q => q.quest_key === progress.quest_key);
      console.log(`  - ${quest?.title || progress.quest_key}: ${progress.current_value}/${quest?.target_value || '?'}`);
    });
  } else {
    console.log('  Aucune quête "play" trouvée');
  }

  // 5. Vérifier s'il y a des quêtes actives dans daily_quests
  console.log('\n📚 Quêtes actives dans la base (daily_quests):');
  const { data: allActiveQuests } = await supabase
    .from('daily_quests')
    .select('quest_key, title, quest_type, target_value, is_active')
    .eq('is_active', true)
    .order('quest_type', { ascending: true });

  const grouped = {
    daily: allActiveQuests?.filter(q => q.quest_type === 'daily') || [],
    weekly: allActiveQuests?.filter(q => q.quest_type === 'weekly') || [],
    monthly: allActiveQuests?.filter(q => q.quest_type === 'monthly') || [],
  };

  console.log(`  Daily: ${grouped.daily.length} quêtes`);
  console.log(`  Weekly: ${grouped.weekly.length} quêtes`);
  console.log(`  Monthly: ${grouped.monthly.length} quêtes`);
}

checkPrecisionQuests().catch(console.error);

