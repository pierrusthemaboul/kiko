import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkRunsSchema() {
    const { data, error } = await supabase.from('runs').select('*').limit(1);
    console.log("Exemple de run:", data);
}
checkRunsSchema();
