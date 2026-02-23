
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Production credentials from .env
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing production credentials in .env (EXPO_PUBLIC_SUPABASE_URL or SUPABASE_PROD_SERVICE_ROLE_KEY)");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const id = '01bde4a3-d93b-4964-9941-4781afc96d56'; // First ID in the user's list

    console.log(`Checking ID in PRODUCTION (${supabaseUrl}): ${id}`);

    let { data: ev, error } = await supabase.from('evenements').select('*').eq('id', id).single();
    if (error) {
        console.error('Error fetching from production:', error.message);
    } else if (ev) {
        console.log('Found in production evenements table:');
        console.log(JSON.stringify(ev, null, 2));
    } else {
        console.log('Not found in production evenements table.');
    }
}

check();
