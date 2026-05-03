
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function getVeryRecentLogs() {
  console.log('Fetching last 100 logs...')
  
  const { data: logs, error } = await supabase
    .from('remote_debug_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  
  if (error) console.error(error)
  else {
    console.log('Last 100 logs:')
    logs.forEach(l => console.log(`[${l.created_at}] ${l.user_id} | ${l.category} | ${l.message} | ${l.platform} | ${l.app_version}`))
  }
}

getVeryRecentLogs()
