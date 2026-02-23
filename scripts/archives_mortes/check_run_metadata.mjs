import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function check() {
    const { data } = await supabase
        .from('runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    data.forEach(r => {
        console.log(`[${r.created_at}] Mode: ${r.mode} | Metadata: ${JSON.stringify(r.metadata)}`);
    });
}
check();
