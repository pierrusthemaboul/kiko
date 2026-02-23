import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function check() {
    const { data: logs } = await supabase
        .from('remote_debug_logs')
        .select('*')
        .gte('created_at', '2026-02-01T20:30:00Z')
        .lte('created_at', '2026-02-01T21:00:00Z')
        .order('created_at', { ascending: true });

    logs?.forEach(l => {
        console.log(`[${l.created_at}] [${l.category}] ${l.message} ${JSON.stringify(l.metadata || {})}`);
    });
}
check();
