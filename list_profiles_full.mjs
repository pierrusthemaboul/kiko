import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function list() {
    const { data } = await supabase.from('profiles').select('id, display_name, updated_at').order('updated_at', { ascending: false }).limit(10);
    console.log(data);
}
list();
