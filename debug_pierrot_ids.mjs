import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function find() {
    const { data } = await supabase.from('profiles').select('id, display_name').ilike('display_name', '%Pier%');
    console.log(data);
}
find();
