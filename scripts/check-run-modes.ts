import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkRunModes() {
  try {
    console.log('Récupération des modes distincts dans la table runs...');

    const { data, error } = await supabase
      .from('runs')
      .select('mode')
      .not('mode', 'is', null);

    if (error) {
      console.error('Erreur:', error);
      return;
    }

    // Compter les occurrences de chaque mode
    const modes = new Map<string, number>();
    data?.forEach(run => {
      const count = modes.get(run.mode) || 0;
      modes.set(run.mode, count + 1);
    });

    console.log('\nModes trouvés dans la table runs:');
    modes.forEach((count, mode) => {
      console.log(`  ${mode}: ${count} occurrences`);
    });

  } catch (error) {
    console.error('Erreur:', error);
  }
}

checkRunModes();
