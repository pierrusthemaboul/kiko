import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ppxmtnuewcixbbmhnzzc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY4OTkxMjcsImV4cCI6MjA0MjQ3NTEyN30.0z2be74E3db-XvyIKXPlogI__9Ric1Il4cZ1Fs7TJ5U'
);

const PIERRE_USER_ID = '9d97c5fe-9051-4da5-881a-f4f380cbb6b0';

function getResetDate(questType: 'daily' | 'weekly' | 'monthly'): string {
  const now = new Date();

  if (questType === 'daily') {
    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0);
    return tomorrow.toISOString();
  } else if (questType === 'weekly') {
    const nextMonday = new Date(now);
    const dayOfWeek = nextMonday.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);
    return nextMonday.toISOString();
  } else {
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);
    return nextMonth.toISOString();
  }
}

async function createProgress() {
  console.log('🚀 Création des quest_progress pour Pierre...\n');

  // Récupérer TOUTES les quêtes actives
  const { data: allQuests, error: questsError } = await supabase
    .from('daily_quests')
    .select('quest_key, quest_type')
    .eq('is_active', true)
    .order('quest_type')
    .order('quest_key');

  if (questsError) {
    console.error('❌ Erreur récupération quêtes:', questsError);
    return;
  }

  console.log(`✅ ${allQuests?.length} quêtes actives trouvées\n`);

  // Créer les quest_progress
  const progressToCreate = allQuests?.map(quest => ({
    user_id: PIERRE_USER_ID,
    quest_key: quest.quest_key,
    current_value: 0,
    completed: false,
    reset_at: getResetDate(quest.quest_type as 'daily' | 'weekly' | 'monthly'),
  }));

  console.log('📝 Création de', progressToCreate?.length, 'quest_progress...\n');

  const { data: created, error: createError } = await supabase
    .from('quest_progress')
    .insert(progressToCreate)
    .select();

  if (createError) {
    console.error('❌ Erreur création:', createError);
    console.error('\n⚠️  Possible problème RLS (Row Level Security)');
    console.error('Vérifie les politiques dans Supabase Dashboard > quest_progress > Policies');
  } else {
    console.log(`✅ ${created?.length} quest_progress créés avec succès !`);

    // Afficher les quêtes de score
    const scoreQuests = created?.filter(p =>
      p.quest_key.includes('score') ||
      p.quest_key.includes('champion')
    ) || [];

    console.log(`\n📊 Quêtes de score/champion créées (${scoreQuests.length}):`);
    scoreQuests.forEach(p => {
      console.log(`  ✅ ${p.quest_key}`);
    });
  }

  console.log('\n✨ Terminé ! Redémarre l\'app pour voir les quêtes.');
}

createProgress()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('💥 Erreur fatale:', err);
    process.exit(1);
  });
