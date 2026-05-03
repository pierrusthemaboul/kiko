
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function findAnythingRecent() {
  const tables = ['profiles', 'remote_debug_logs', 'user_feedback', 'game_events', 'analytics']
  for (const table of tables) {
    console.log(`Checking ${table} for recent activity...`)
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (error) {
       // Table might not exist, ignore
    } else if (data && data.length > 0) {
      console.log(`Recent in ${table}:`, JSON.stringify(data, null, 2))
    }
  }
}

findAnythingRecent()
