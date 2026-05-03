
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkRecentActivity() {
  console.log('Checking recent activity for Facove...')
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('display_name', 'facove')
    .single()
  
  if (error) {
    console.error('Error fetching profile:', error)
    return
  }
  
  console.log('Profile data:', JSON.stringify(data, null, 2))
}

checkRecentActivity()
