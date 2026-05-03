
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkGameScores() {
  const facoveId = 'a6aaa763-48f0-4370-9f4c-9c7df6fa0016'
  console.log(`Checking game_scores for ${facoveId}...`)
  const { data, error } = await supabase
    .from('game_scores')
    .select('*')
    .eq('user_id', facoveId)
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (error) {
    console.error('Error fetching scores:', error)
    return
  }
  
  console.log('Recent scores:', JSON.stringify(data, null, 2))
}

checkGameScores()
