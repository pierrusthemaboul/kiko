import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function findPierre() {
    const { data } = await supabase.from('profiles').select('*').ilike('display_name', '%Pier%');
    console.log(data);
}
findPierre();
