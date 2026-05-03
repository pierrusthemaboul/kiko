
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function getRecentLogs() {
  console.log('Fetching logs for today (2026-05-03)...')
  
  const today = new Date('2026-05-03T00:00:00Z').toISOString()
  
  const { data: logs, error } = await supabase
    .from('remote_debug_logs')
    .select('*')
    .gte('created_at', today)
    .order('created_at', { ascending: false })
    .limit(50)
  
  if (error) {
    console.error('Error fetching logs:', error)
  } else {
    console.log('Recent logs (all users):', JSON.stringify(logs, null, 2))
  }
}

getRecentLogs()
