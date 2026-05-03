
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function listTables() {
  const { data, error } = await supabase.rpc('execute_sql', { 
    sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'" 
  })
  
  if (error) {
    console.error('Error with RPC execute_sql:', error)
    // Fallback: try to list columns of 'profiles' to see available fields
    const { data: pData, error: pError } = await supabase.from('profiles').select('*').limit(1)
    if (pError) console.error('Error fetching profiles:', pError)
    else console.log('Sample profile record:', pData[0])
  } else {
    console.log('Tables:', data)
  }
}

listTables()
