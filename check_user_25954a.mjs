import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function check() {
    const { data } = await supabase
        .from('user_event_usage')
        .select('*, evenements(titre)')
        .eq('user_id', '25954a20-333e-4682-ab06-e792e3fc7928'); // I'll search by prefix if needed, but let's try full if I have it

    // Search by prefix for 25954a
    const { data: data2 } = await supabase
        .from('user_event_usage')
        .select('*, evenements(titre)')
        .ilike('user_id', '25954a%');

    console.log("Usage for User 25954a:", data2);
}
check();
