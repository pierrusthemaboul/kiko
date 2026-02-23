import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function dumpLogs() {
    const { data: logs, error } = await supabase
        .from('remote_debug_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

    if (error) {
        console.error(error);
        return;
    }

    logs.forEach(l => {
        console.log(`[${l.created_at}] [${l.category}] [${l.user_id?.slice(0, 6)}] ${l.message}`);
        if (l.metadata) console.log(`   └ ${JSON.stringify(l.metadata)}`);
    });
}
dumpLogs();
