import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkRecentRuns() {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data } = await supabase.from('runs').select('user_id, created_at, points').gte('created_at', tenMinAgo);
    console.log(data);
}
checkRecentRuns();
