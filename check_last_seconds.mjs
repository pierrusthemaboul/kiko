import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkAnyRecordSinceJustNow() {
    const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    console.log(`Checking all tables for activity since ${twoMinsAgo}...`);

    const tables = ['runs', 'user_event_usage', 'remote_debug_logs', 'profiles'];
    for (const t of tables) {
        const { data, error } = await supabase.from(t).select('*').gt(t === 'user_event_usage' ? 'last_seen_at' : 'updated_at' && t === 'profiles' ? 'updated_at' : 'created_at', twoMinsAgo);
        if (data && data.length > 0) {
            console.log(`Table ${t}: ${data.length} records found!`);
            console.log(data[0]);
        } else {
            console.log(`Table ${t}: Empty`);
        }
    }
}
checkAnyRecordSinceJustNow();
