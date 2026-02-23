import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function check() {
    const { data } = await supabase.from('profiles').select('id, display_name, parties_per_day, is_admin').or('display_name.ilike.%Pier%,display_name.ilike.%Pierrot%');
    console.log(data);
}
check();
