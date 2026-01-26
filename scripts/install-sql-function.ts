import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const SQL_FUNCTION = `
CREATE OR REPLACE FUNCTION public.reset_expired_quests()
RETURNS TABLE(deleted_count INTEGER, created_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_created_count INTEGER := 0;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Supprimer toutes les quêtes dont la date de reset est dépassée
  DELETE FROM quest_progress
  WHERE reset_at < v_now;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Réinitialiser les quêtes pour tous les utilisateurs actifs
  WITH active_users AS (
    SELECT DISTINCT user_id
    FROM profiles
    WHERE last_play_date >= (CURRENT_DATE - INTERVAL '7 days')
  ),
  active_quests AS (
    SELECT quest_key, quest_type
    FROM daily_quests
    WHERE is_active = true
  ),
  new_progress AS (
    SELECT
      au.user_id,
      aq.quest_key,
      0 as current_value,
      false as completed,
      CASE aq.quest_type
        WHEN 'daily' THEN
          (CURRENT_DATE + INTERVAL '1 day')::timestamp with time zone
        WHEN 'weekly' THEN
          (CURRENT_DATE + ((8 - EXTRACT(DOW FROM CURRENT_DATE)::integer) % 7) * INTERVAL '1 day')::timestamp with time zone
        WHEN 'monthly' THEN
          (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::timestamp with time zone
      END as reset_at
    FROM active_users au
    CROSS JOIN active_quests aq
  )
  INSERT INTO quest_progress (user_id, quest_key, current_value, completed, reset_at)
  SELECT user_id, quest_key, current_value, completed, reset_at
  FROM new_progress
  ON CONFLICT (user_id, quest_key) DO NOTHING;

  GET DIAGNOSTICS v_created_count = ROW_COUNT;

  RETURN QUERY SELECT v_deleted_count, v_created_count;
END;
$$;
`;

async function installSQLFunction() {
  console.log('🔧 Installation de la fonction SQL reset_expired_quests\n');
  console.log('─'.repeat(80));

  try {
    // Essayer d'exécuter le SQL directement via l'API REST
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ query: SQL_FUNCTION }),
    });

    if (!response.ok) {
      console.log('❌ Impossible de créer la fonction via l\'API REST');
      console.log('   Status:', response.status);

      // Afficher les instructions manuelles
      console.log('\n📋 INSTRUCTIONS MANUELLES REQUISES:\n');
      console.log('1. Ouvrir le Dashboard Supabase:');
      console.log('   https://supabase.com/dashboard/project/ppxmtnuewcixbbmhnzzc/editor\n');
      console.log('2. Aller dans "SQL Editor"\n');
      console.log('3. Créer une nouvelle requête\n');
      console.log('4. Copier-coller le contenu du fichier:');
      console.log('   scripts/setup-quest-reset-cron.sql\n');
      console.log('5. Exécuter la requête\n');
      console.log('─'.repeat(80));
      return;
    }

    console.log('✅ Fonction SQL créée avec succès!\n');

    // Tester la fonction
    console.log('🧪 Test de la fonction...\n');
    const { data, error } = await supabase.rpc('reset_expired_quests');

    if (error) {
      console.log('❌ Erreur lors du test:', error.message);
    } else {
      console.log('✅ Test réussi!');
      console.log('   Résultat:', data);
    }

  } catch (err) {
    console.log('❌ Exception:', err);
    console.log('\n📋 INSTRUCTIONS MANUELLES REQUISES:\n');
    console.log('1. Ouvrir le Dashboard Supabase:');
    console.log('   https://supabase.com/dashboard/project/ppxmtnuewcixbbmhnzzc/editor\n');
    console.log('2. Aller dans "SQL Editor"\n');
    console.log('3. Créer une nouvelle requête\n');
    console.log('4. Copier-coller le contenu du fichier:');
    console.log('   scripts/setup-quest-reset-cron.sql\n');
    console.log('5. Exécuter la requête\n');
  }

  console.log('\n─'.repeat(80));
  console.log('\n⚠️  IMPORTANT: Configuration du CRON JOB\n');
  console.log('Après avoir créé la fonction, il faut configurer pg_cron:');
  console.log('\n1. Activer pg_cron:');
  console.log('   Dashboard > Database > Extensions > pg_cron (Enable)\n');
  console.log('2. Créer le cron job dans SQL Editor:');
  console.log('   SELECT cron.schedule(');
  console.log('     \'reset-daily-quests\',');
  console.log('     \'0 22 * * *\',  -- 22h UTC = minuit en France (hiver)');
  console.log('     $$SELECT public.reset_expired_quests();$$');
  console.log('   );\n');
  console.log('3. Vérifier:');
  console.log('   SELECT * FROM cron.job WHERE jobname = \'reset-daily-quests\';\n');
  console.log('─'.repeat(80));
}

installSQLFunction().catch(console.error);
