import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkNow() {
    const now = new Date().toISOString();
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    console.log(`Checking activity since ${thirtyMinsAgo}...`);

    const { count: runCount } = await supabase.from('runs').select('*', { count: 'exact', head: true }).gt('created_at', thirtyMinsAgo);
    const { count: usageCount } = await supabase.from('user_event_usage').select('*', { count: 'exact', head: true }).gt('last_seen_at', thirtyMinsAgo);
    const { count: logCount } = await supabase.from('remote_debug_logs').select('*', { count: 'exact', head: true }).gt('created_at', thirtyMinsAgo);

    console.log(`Runs: ${runCount}`);
    console.log(`Usage: ${usageCount}`);
    console.log(`Logs: ${logCount}`);

    if (logCount > 0) {
        const { data } = await supabase.from('remote_debug_logs').select('*').gt('created_at', thirtyMinsAgo).order('created_at', { ascending: false });
        data.forEach(l => console.log(`[${l.created_at}] ${l.message}`));
    }
}
checkNow();
