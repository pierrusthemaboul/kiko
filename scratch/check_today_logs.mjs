
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTodayLogs() {
  const today = '2026-05-03T00:00:00Z'
  console.log(`Checking logs for today (${today})...`)
  const { data, error } = await supabase
    .from('remote_debug_logs')
    .select('*')
    .gte('created_at', today)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching logs:', error)
    return
  }
  
  console.log(`Found ${data.length} logs for today.`)
  if (data.length > 0) {
    console.log('Sample:', JSON.stringify(data[0], null, 2))
  }
}

checkTodayLogs()
