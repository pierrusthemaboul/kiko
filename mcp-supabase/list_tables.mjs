import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Try using pg_catalog which might be accessible
const { data, error } = await supabase
  .rpc('get_tables', { schema: 'public' })
  .select('*');

if (!error && data) {
  console.log('Tables via RPC:');
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

// Fallback: try to query pg_tables directly
const { data: pgData, error: pgError } = await supabase
  .from('pg_tables')
  .select('tablename')
  .eq('schemaname', 'public')
  .order('tablename');

if (!pgError && pgData) {
  console.log('Tables from pg_catalog:');
  console.log(JSON.stringify(pgData, null, 2));
  process.exit(0);
}

// Final fallback: detect common tables
console.log('Trying to detect tables by querying common table names...');
const commonTables = [
  'users', 'profiles', 'evenements', 'quests', 'game_scores', 
  'notifications', 'sessions', 'auth', 'migrations', 'queue_sevent',
  'remote_control', 'game_sessions', 'player_progress', 'achievements',
  'daily_challenges', 'leaderboard', 'social_connections', 'analytics_events'
];
const existingTables = [];

for (const tableName of commonTables) {
  try {
    const { data: tableData, error: tableError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (!tableError) {
      existingTables.push(tableName);
      console.log(`✓ ${tableName}`);
    } else {
      console.log(`✗ ${tableName}: ${tableError.message}`);
    }
  } catch (e) {
    console.log(`✗ ${tableName}: ${e.message}`);
  }
}

console.log('\nDetected tables:', existingTables);
