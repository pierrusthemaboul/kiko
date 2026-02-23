import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkGoju2() {
    const { count, error } = await supabase.from('goju2').select('*', { count: 'exact', head: true });
    if (error) console.log("Goju2 in prod:", error.message);
    else console.log(`Goju2 in prod: ${count} rows`);
}
checkGoju2();
