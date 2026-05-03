
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function searchUser() {
  console.log('Searching for facove...')
  
  // Try profiles table
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('*')
    .ilike('pseudo', 'facove')
  
  if (pError) console.error('Error profiles:', pError)
  else if (profiles && profiles.length > 0) console.log('Found in profiles:', profiles)

  // Try users table if exists (though profiles is more common in Supabase apps)
  const { data: users, error: uError } = await supabase
    .from('users')
    .select('*')
    .ilike('pseudo', 'facove')
    
  if (uError) console.error('Error users:', uError)
  else if (users && users.length > 0) console.log('Found in users:', users)

  // Try to search for metadata or logs
  const { data: logs, error: lError } = await supabase
    .from('app_logs')
    .select('*')
    .ilike('user_pseudo', 'facove')
    .limit(10)
    
  if (lError) {
      // app_logs might not exist, let's list tables first if we can
  } else if (logs && logs.length > 0) console.log('Found in logs:', logs)
}

searchUser()
