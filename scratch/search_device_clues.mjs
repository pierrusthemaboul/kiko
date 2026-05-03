import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Pierre/kiko/mobile_app/.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function searchDeviceClues() {
  console.log(`Searching for device clues in logs...`);

  const { data, error } = await supabase
    .from('remote_debug_logs')
    .select('*')
    .or('message.ilike.%samsung%,message.ilike.%pixel%,message.ilike.%galaxy%,message.ilike.%redmi%,message.ilike.%huawei%,message.ilike.%oppo%,message.ilike.%sony%')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log(`Found ${data.length} potential device clues.`);
    data.forEach(log => {
      console.log(`[${log.created_at}] User: ${log.user_id}, Msg: ${log.message}`);
    });
  } else {
    console.log('No specific device names found in message field.');
  }
}

searchDeviceClues();
