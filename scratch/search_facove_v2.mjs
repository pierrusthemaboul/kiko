
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function searchFacove() {
  console.log('Searching for display_name: facove...')
  
  // 1. Search in profiles
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('*')
    .ilike('display_name', 'facove')
  
  if (pError) console.error('Error profiles:', pError)
  else if (profiles && profiles.length > 0) {
    console.log('Found in profiles:', JSON.stringify(profiles, null, 2))
    const userId = profiles[0].id
    
    // 2. Search for related records (e.g., game history, device info if exists)
    // Let's guess some table names based on typical patterns
    const tablesToTry = ['game_history', 'user_events', 'feedback', 'user_devices', 'analytics_events']
    for (const table of tablesToTry) {
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq('user_id', userId)
            .limit(5)
        if (!error && data && data.length > 0) {
            console.log(`Found records in ${table}:`, JSON.stringify(data, null, 2))
        }
    }
  } else {
    console.log('No user found with display_name facove.')
  }
}

searchFacove()
