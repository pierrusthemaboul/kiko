import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkDebugLogs() {
    const { data: logs, error } = await supabase
        .from('remote_debug_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error(error);
        return;
    }

    logs.forEach(log => {
        console.log(`[${log.created_at}] ${log.category} | ${log.message}`);
    });
}
checkDebugLogs();
