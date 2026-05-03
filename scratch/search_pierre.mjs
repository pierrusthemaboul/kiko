import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Pierre/kiko/mobile_app/.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function searchPierre() {
  console.log(`Searching for Pierre's profile...`);

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('display_name', '%pierre%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data.length} matches:`, JSON.stringify(data, null, 2));
}

searchPierre();
