import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function createPlayConsoleStatsTable() {
  console.log('🔧 Création de la table play_console_stats...\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS play_console_stats (
      id BIGSERIAL PRIMARY KEY,
      package_name TEXT NOT NULL,
      total_reviews INTEGER DEFAULT 0,
      average_rating NUMERIC(3,2) DEFAULT 0,
      fetched_at TIMESTAMP DEFAULT NOW(),
      reviews_data JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_play_console_package ON play_console_stats(package_name);
    CREATE INDEX IF NOT EXISTS idx_play_console_fetched ON play_console_stats(fetched_at DESC);
  `;

  console.log('📝 SQL à exécuter:');
  console.log(createTableSQL);
  console.log('\n⚠️  Note: Cette opération nécessite des permissions SQL directes.');
  console.log('   Pour créer la table, va sur:');
  console.log('   https://supabase.com/dashboard/project/ppxmtnuewcixbbmhnzzc/editor');
  console.log('   SQL Editor > New Query > Coller le SQL ci-dessus > Run\n');

  // Alternative: Essayer via RPC si disponible
  console.log('🔄 Tentative de création via l\'API...');

  // Test si la table existe déjà
  const { error: testError } = await supabase
    .from('play_console_stats')
    .select('count')
    .limit(1);

  if (testError) {
    console.log('❌ Table n\'existe pas encore');
    console.log('\n💡 SOLUTIONS:');
    console.log('\nOption 1 (Recommandée) - Via Supabase Dashboard:');
    console.log('1. Va sur https://supabase.com/dashboard/project/ppxmtnuewcixbbmhnzzc');
    console.log('2. Clique sur "SQL Editor" dans le menu de gauche');
    console.log('3. Clique "New Query"');
    console.log('4. Colle le SQL ci-dessus');
    console.log('5. Clique "Run" (ou Ctrl+Enter)');

    console.log('\nOption 2 - Via Supabase CLI:');
    console.log('supabase db execute --file create-table.sql');

  } else {
    console.log('✅ Table play_console_stats existe déjà !');
  }
}

createPlayConsoleStatsTable().catch(console.error);
