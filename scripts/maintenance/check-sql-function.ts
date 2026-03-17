import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkSQLFunctions() {
  console.log('🔍 Vérification des fonctions SQL et triggers\n');

  console.log('📋 Tentative d\'appel de reset_expired_quests...\n');

  // Essayer d'appeler directement la fonction pour voir ce qu'elle fait
  try {
    const { data: result, error: execError } = await supabase
      .rpc('reset_expired_quests');

    if (execError) {
      console.log('❌ Erreur lors de l\'appel de reset_expired_quests:', execError.message);
    } else {
      console.log('✅ Fonction reset_expired_quests exécutée avec succès');
      console.log('Résultat:', result);
    }
  } catch (err) {
    console.log('❌ Exception lors de l\'appel:', err);
  }

  console.log('\n📅 Vérification des pg_cron jobs...\n');

  // Vérifier si pg_cron est activé et s'il y a des jobs
  try {
    const { data: cronJobs, error: cronError } = await supabase
      .from('cron.job')
      .select('*');

    if (cronError || !cronJobs) {
      console.log('❌ Impossible d\'accéder à cron.job (pg_cron peut ne pas être activé)');
      console.log('   Erreur:', cronError?.message);
    } else {
      console.log('✅ pg_cron est activé');
      console.log('Jobs trouvés:', cronJobs.length);
      for (const job of cronJobs) {
        console.log(`  - ${job.jobname}: ${job.schedule} -> ${job.command}`);
      }
    }
  } catch (err) {
    console.log('❌ Exception:', err);
  }

  console.log('\n✅ Vérification terminée');
}

checkSQLFunctions().catch(console.error);

