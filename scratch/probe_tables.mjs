
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function listAllTables() {
  // Since we don't have execute_sql, let's try to query some known tables and look for clues
  // Or try to use a generic query that might fail but give us table names in error messages?
  // Actually, we can try to get the list of tables from the API if possible, but PostgREST doesn't expose it easily.
  // Let's try common names.
  const common = ['profiles', 'remote_debug_logs', 'evenements', 'game_results', 'user_settings', 'feedback', 'devices', 'tutorial_progress']
  for (const table of common) {
    const { data, error } = await supabase.from(table).select('*').limit(1)
    if (!error) console.log(`Table exists: ${table}`)
  }
}

listAllTables()
