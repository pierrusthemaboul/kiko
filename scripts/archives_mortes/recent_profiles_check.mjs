import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function recent() {
    const { data } = await supabase.from('profiles').select('*').order('updated_at', { ascending: false }).limit(20);
    data.forEach(p => console.log(`${p.id} | ${p.display_name} | ${p.last_play_date} | ${p.updated_at}`));
}
recent();
