import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkSchema() {
  console.log('🔍 Vérification du schéma quest_progress\n');

  // Prendre un échantillon
  const { data, error } = await supabase
    .from('quest_progress')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Colonnes disponibles:');
    console.log(Object.keys(data[0]).join(', '));
    console.log('\nExemple de données:');
    console.log(JSON.stringify(data[0], null, 2));
  }

  // Vérifier daily_quests aussi
  console.log('\n─'.repeat(80));
  console.log('\n🔍 Vérification du schéma daily_quests\n');

  const { data: questData, error: questError } = await supabase
    .from('daily_quests')
    .select('*')
    .limit(1);

  if (questError) {
    console.error('❌ Erreur:', questError);
    return;
  }

  if (questData && questData.length > 0) {
    console.log('Colonnes disponibles:');
    console.log(Object.keys(questData[0]).join(', '));
    console.log('\nExemple de données:');
    console.log(JSON.stringify(questData[0], null, 2));
  }
}

checkSchema().catch(console.error);

