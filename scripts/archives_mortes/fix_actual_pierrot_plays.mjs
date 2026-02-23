import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function fix() {
    const id = '9d97c5fe-9051-4da5-881a-f4f380cbb6b0';
    console.log(`Donnant des parties illimitées à Pierrot (${id})...`);
    const { data, error } = await supabase.from('profiles').update({ is_admin: true, parties_per_day: 999 }).eq('id', id).select();
    if (error) console.error(error);
    else console.log("SUCCÈS:", data);
}
fix();
