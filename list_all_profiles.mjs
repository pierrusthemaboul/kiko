import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function list() {
    const { data } = await supabase.from('profiles').select('*');
    data.forEach(p => console.log(`${p.id} | ${p.display_name} | ${p.updated_at}`));
}
list();
