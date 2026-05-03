import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Pierre/kiko/mobile_app/.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTodayLogs() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`Checking logs for today (${today})...`);

  const { data, error } = await supabase
    .from('remote_debug_logs')
    .select('*')
    .gte('created_at', today)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log(`Found ${data.length} logs today.`);
    data.forEach((log, index) => {
      console.log(`\n--- Log ${index + 1} (${log.created_at}) ---`);
      console.log(`UserID: ${log.user_id}, Msg: ${log.message}`);
      console.log(`Platform: ${log.platform}, Version: ${log.app_version}`);
      if (log.data) console.log('Data:', JSON.stringify(log.data, null, 2));
    });
  } else {
    console.log('No logs found for today.');
  }
}

checkTodayLogs();
