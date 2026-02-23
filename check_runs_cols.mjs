import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkRunsColumns() {
    const { data, error } = await supabase.from('runs').select('*').limit(1);
    if (data && data[0]) {
        console.log("Runs columns:", Object.keys(data[0]));
        console.log("Sample run:", data[0]);
    }
}
checkRunsColumns();
