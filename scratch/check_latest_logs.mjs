import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Pierre/kiko/mobile_app/.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentLogs() {
  console.log(`Checking latest logs...`);

  const { data, error } = await supabase
    .from('remote_debug_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching logs:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No logs found.');
    return;
  }

  console.log(`Found ${data.length} logs. Searching for clues...`);
  data.forEach((log, index) => {
    console.log(`\n--- Log ${index + 1} (${log.created_at}) ---`);
    console.log(`UserID: ${log.user_id}, Message: ${log.message}`);
    console.log(`Platform: ${log.platform}`);
    if (log.data) console.log('Data:', JSON.stringify(log.data, null, 2));
  });
}

checkRecentLogs();
