import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Pierre/kiko/mobile_app/.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFacoveDevice() {
  const facoveId = 'a6aaa763-48f0-4370-9f4c-9c7df6fa0016';
  console.log(`Checking logs for Facove (ID: ${facoveId})...`);

  const { data, error } = await supabase
    .from('remote_debug_logs')
    .select('*')
    .eq('user_id', facoveId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching logs:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No logs found for Facove.');
    return;
  }

  console.log('Found logs. Analyzing metadata...');
  data.forEach((log, index) => {
    console.log(`\n--- Log ${index + 1} (${log.created_at}) ---`);
    console.log(`Level: ${log.level}, Category: ${log.category}`);
    console.log(`Message: ${log.message}`);
    console.log(`Platform: ${log.platform}`);
    console.log('Data:', JSON.stringify(log.data, null, 2));
  });
}

checkFacoveDevice();
