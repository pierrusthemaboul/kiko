import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function fix() {
    const id = '9d97c5fe-912f-4161-9c6f-3199c0993557';
    const { data, error } = await supabase.from('profiles').update({ is_admin: true, parties_per_day: 999 }).eq('id', id).select();
    console.log("Update Pierrot 912f:", data, error?.message);
}
fix();
