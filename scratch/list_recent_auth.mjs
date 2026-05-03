import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Pierre/kiko/mobile_app/.env' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listRecentAuth() {
  console.log(`Listing 20 most recent auth users...`);

  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error('Error listing users:', error);
    return;
  }

  const sorted = data.users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  sorted.slice(0, 20).forEach(u => {
    console.log(`[${u.created_at}] ID: ${u.id}, Email: ${u.email}, Meta: ${JSON.stringify(u.user_metadata)}`);
  });
}

listRecentAuth();
