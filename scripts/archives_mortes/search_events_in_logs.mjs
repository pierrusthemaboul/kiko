import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkLogs() {
    const { data: logs } = await supabase
        .from('remote_debug_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

    console.log(`Checking ${logs?.length} logs...`);

    const results = [];
    logs?.forEach(l => {
        // Look for any mention of event titles or IDs
        if (l.message.includes('Select') || l.message.includes('Selection') || l.message.includes('Show') || l.category === 'GameLogic') {
            results.push(`[${l.created_at}] ${l.message} | ${JSON.stringify(l.metadata || {})}`);
        }
    });

    console.log(results.join('\n'));
}
checkLogs();
