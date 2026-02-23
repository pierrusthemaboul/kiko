import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const s = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data } = await s.from('evenements').select('titre, date').ilike('titre', '%exposition universelle%Paris%').order('date');
    data.forEach(e => console.log(`${e.date}: ${e.titre}`));
}
check();
