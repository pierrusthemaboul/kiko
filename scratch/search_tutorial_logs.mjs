
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function searchTutorialLogs() {
  console.log('Searching for "tutorial" in log messages...')
  
  const { data: logs, error } = await supabase
    .from('remote_debug_logs')
    .select('*')
    .ilike('message', '%tutorial%')
    .order('created_at', { ascending: false })
  
  if (error) console.error(error)
  else console.log('Tutorial logs:', JSON.stringify(logs, null, 2))
}

searchTutorialLogs()
