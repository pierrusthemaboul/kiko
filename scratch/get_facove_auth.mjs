import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Pierre/kiko/mobile_app/.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function getFacoveAuth() {
  console.log(`Searching auth.users for facove...`);

  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error('Error listing users:', error);
    return;
  }

  const facove = data.users.find(u => u.email === 'v.fagot@orange.fr' || (u.user_metadata && u.user_metadata.full_name && u.user_metadata.full_name.toLowerCase().includes('fagot')));

  if (facove) {
    console.log('User found in Auth:');
    console.log('ID:', facove.id);
    console.log('Email:', facove.email);
    console.log('User Metadata:', JSON.stringify(facove.user_metadata, null, 2));
    console.log('App Metadata:', JSON.stringify(facove.app_metadata, null, 2));
  } else {
    console.log('Facove not found in auth list.');
  }
}

getFacoveAuth();
