import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Pierre/kiko/mobile_app/.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGameRuns() {
  const facoveId = 'a6aaa763-48f0-4370-9f4c-9c7df6fa0016';
  console.log(`Checking game_runs for Facove...`);

  const { data, error } = await supabase
    .from('game_scores')
    .select('*')
    .eq('user_id', facoveId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log(`Found ${data.length} runs. Checking metadata...`);
    data.forEach((run, index) => {
      console.log(`\n--- Run ${index + 1} (${run.created_at}) ---`);
      if (run.metadata) console.log('Metadata:', JSON.stringify(run.metadata, null, 2));
    });
  } else {
    console.log('No game_runs found for Facove.');
  }
}

checkGameRuns();
