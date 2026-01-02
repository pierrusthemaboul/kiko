import { createClient } from '@supabase/supabase-js';

// Bonnes URLs et clés
const SUPABASE_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkQuests() {
  console.log('🔍 VÉRIFICATION DES QUÊTES ACTUELLES\n');

  const { data, error } = await supabase
    .from('daily_quests')
    .select('*')
    .eq('is_active', true)
    .order('quest_type', { ascending: true })
    .order('quest_key', { ascending: true });

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  Aucune quête trouvée');
    return;
  }

  console.log(`✅ ${data.length} quêtes actives trouvées\n`);

  ['daily', 'weekly', 'monthly'].forEach(type => {
    const quests = data.filter((q: any) => q.quest_type === type);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${type.toUpperCase()} (${quests.length} quêtes)`);
    console.log('='.repeat(60));

    quests.forEach((q: any) => {
      console.log(`\n📌 ${q.quest_key}`);
      console.log(`   Titre: ${q.title}`);
      console.log(`   Description: ${q.description}`);
      console.log(`   Objectif: ${q.target_value}`);
      console.log(`   Récompense: ${q.xp_reward} XP`);
    });
  });

  // Vérifier aussi les grades disponibles
  console.log('\n\n🏆 VÉRIFICATION DES GRADES\n');

  const { data: profiles } = await supabase
    .from('profiles')
    .select('display_name, xp_total, title_key')
    .order('xp_total', { ascending: false })
    .limit(5);

  if (profiles && profiles.length > 0) {
    console.log('Top 5 joueurs:');
    profiles.forEach((p: any) => {
      console.log(`  - ${p.display_name}: ${p.xp_total} XP (${p.title_key})`);
    });
  }
}

checkQuests().catch(console.error);
