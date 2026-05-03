import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Pierre/kiko/mobile_app/.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function getFacoveProfile() {
  const facoveId = 'a6aaa763-48f0-4370-9f4c-9c7df6fa0016';
  console.log(`Fetching profile for Facove (ID: ${facoveId})...`);

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', facoveId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return;
  }

  console.log('Profile found:', JSON.stringify(data, null, 2));
}

getFacoveProfile();
