import { supabase } from '../lib/supabase/supabaseClients.ts';

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
    const quests = data.filter((q: any) => q.quest_type === type);
    console.log(`\n--- ${type.toUpperCase()} (${quests.length}) ---`);
    quests.forEach((q: any) => {
      console.log(`\nKey: ${q.quest_key}`);
      console.log(`Titre: ${q.title}`);
      console.log(`Description: ${q.description}`);
      console.log(`Objectif: ${q.target_value}`);
      console.log(`Récompense XP: ${q.xp_reward}`);
    });
  });
}

getQuests().then(() => process.exit(0));
