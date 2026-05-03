import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Pierre/kiko/mobile_app/.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function searchInitLogs() {
  console.log(`Searching for initialization logs...`);

  const { data, error } = await supabase
    .from('remote_debug_logs')
    .select('*')
    .ilike('message', '%initialized%')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log(`Found ${data.length} init logs.`);
    data.forEach(log => {
      console.log(`[${log.created_at}] User: ${log.user_id}, Msg: ${log.message}`);
      if (log.data) console.log('Data:', JSON.stringify(log.data, null, 2));
    });
  } else {
    console.log('No initialization logs found.');
  }
}

searchInitLogs();
