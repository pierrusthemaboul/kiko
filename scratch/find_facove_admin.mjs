import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Pierre/kiko/mobile_app/.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Prod Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findFacoveInfo() {
  const facoveId = 'a6aaa763-48f0-4370-9f4c-9c7df6fa0016';
  console.log(`Searching info for Facove (ID: ${facoveId})...`);

  // 1. Get Profile
  const { data: profile, error: pError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', facoveId)
    .single();

  if (pError) {
    console.error('Profile error:', pError);
  } else {
    console.log('Profile found:', JSON.stringify(profile, null, 2));
  }

  // 2. Get Logs
  const { data: logs, error: lError } = await supabase
    .from('remote_debug_logs')
    .select('*')
    .eq('user_id', facoveId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (lError) {
    console.error('Logs error:', lError);
  } else if (logs && logs.length > 0) {
    console.log(`\nFound ${logs.length} logs. Extracting device info...`);
    logs.forEach((log, index) => {
      console.log(`\n--- Log ${index + 1} (${log.created_at}) ---`);
      console.log(`Message: ${log.message}`);
      console.log(`Platform: ${log.platform}`);
      console.log(`App Version: ${log.app_version}`);
      if (log.data) console.log('Data:', JSON.stringify(log.data, null, 2));
    });
  } else {
    console.log('\nNo logs found for this user ID.');
  }
}

findFacoveInfo();
