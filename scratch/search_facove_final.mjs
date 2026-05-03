import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Pierre/kiko/mobile_app/.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function searchFacove() {
  console.log(`Searching for profiles with display_name like 'facove'...`);

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('display_name', '%facove%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data.length} matches:`, JSON.stringify(data, null, 2));
}

searchFacove();
