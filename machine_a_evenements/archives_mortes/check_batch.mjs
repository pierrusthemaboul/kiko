
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data } = await supabase
        .from('evenements')
        .select('titre')
        .or('titre.ilike.%Molière%,titre.ilike.%Antoinette%,titre.ilike.%Hernani%,titre.ilike.%Midi%');
    console.log(JSON.stringify(data, null, 2));
}
check();
