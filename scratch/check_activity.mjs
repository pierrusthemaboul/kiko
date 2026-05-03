
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkRecentActivity() {
  console.log('Checking for profiles updated today...')
  
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('last_play_date', '2026-05-03')
  
  if (error) console.error('Error profiles:', error)
  else console.log('Profiles active today:', profiles)

  // Also check for any new profiles created today
  const { data: newProfiles, error: nError } = await supabase
    .from('profiles')
    .select('*')
    .gte('created_at', '2026-05-03T00:00:00Z')
    
  if (nError) console.error('Error new profiles:', nError)
  else console.log('New profiles today:', newProfiles)
}

checkRecentActivity()
