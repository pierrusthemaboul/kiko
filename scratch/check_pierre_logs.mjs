import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Pierre/kiko/mobile_app/.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPierreLogs() {
  const ids = ['f88a2bf1-c405-488f-9751-69d91ea4ae76', '1d170ffe-82b8-4180-a537-f336da76afdd'];
  console.log(`Checking logs for Pierre IDs...`);

  const { data, error } = await supabase
    .from('remote_debug_logs')
    .select('*')
    .in('user_id', ids)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log(`Found ${data.length} logs.`);
    data.forEach(log => {
      console.log(`[${log.created_at}] User: ${log.user_id}, Msg: ${log.message}`);
      if (log.data) console.log('Data:', JSON.stringify(log.data, null, 2));
    });
  } else {
    console.log('No logs found for Pierre IDs.');
  }
}

checkPierreLogs();
