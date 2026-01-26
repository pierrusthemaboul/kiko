const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase (nouvelle URL)
const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY4OTkxMjcsImV4cCI6MjA0MjQ3NTEyN30.0z2be74E3db-XvyIKXPlogI__9Ric1Il4cZ1Fs7TJ5U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getQuests() {
  const { data, error } = await supabase
    .from('daily_quests')
    .select('*')
    .eq('is_active', true)
    .order('quest_type', { ascending: true })
    .order('quest_key', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!data) {
    console.log('Aucune quête trouvée');
    return;
  }

  console.log('=== QUÊTES ACTIVES ===\n');

  ['daily', 'weekly', 'monthly'].forEach(type => {
    const quests = data.filter(q => q.quest_type === type);
    console.log(`\n--- ${type.toUpperCase()} (${quests.length}) ---`);
    quests.forEach(q => {
      console.log(`\nKey: ${q.quest_key}`);
      console.log(`Titre: ${q.title}`);
      console.log(`Description: ${q.description}`);
      console.log(`Objectif: ${q.target_value}`);
      console.log(`Récompense XP: ${q.xp_reward}`);
    });
  });
}

getQuests().then(() => process.exit(0));
