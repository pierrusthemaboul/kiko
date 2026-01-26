import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkGameScoresStructure() {
  try {
    console.log('Récupération d\'un échantillon de game_scores...');

    const { data, error } = await supabase
      .from('game_scores')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Erreur lors de la récupération:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('\nStructure de la table game_scores:');
      console.log('Colonnes disponibles:', Object.keys(data[0]));
      console.log('\nExemple de données:', JSON.stringify(data[0], null, 2));
    } else {
      console.log('Aucune donnée trouvée dans game_scores');
    }

    // Vérifier aussi la table runs qui pourrait avoir le mode
    console.log('\n\nRécupération d\'un échantillon de runs...');
    const { data: runsData, error: runsError } = await supabase
      .from('runs')
      .select('*')
      .limit(1);

    if (runsError) {
      console.error('Erreur lors de la récupération des runs:', runsError);
      return;
    }

    if (runsData && runsData.length > 0) {
      console.log('\nStructure de la table runs:');
      console.log('Colonnes disponibles:', Object.keys(runsData[0]));
      console.log('\nExemple de données:', JSON.stringify(runsData[0], null, 2));
    }

  } catch (error) {
    console.error('Erreur:', error);
  }
}

checkGameScoresStructure();
