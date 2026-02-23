import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function check() {
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    console.log(`Checking activity since ${fifteenMinAgo}...`);

    const { data: usage } = await supabase.from('user_event_usage').select('user_id, last_seen_at').gte('last_seen_at', fifteenMinAgo).order('last_seen_at', { ascending: false });

    if (usage && usage.length > 0) {
        console.log(`${usage.length} events seen:`);
        for (const u of usage) {
            const { data: p } = await supabase.from('profiles').select('display_name').eq('id', u.user_id).single();
            console.log(`- [${u.last_seen_at}] ${p?.display_name || 'Guest'} (${u.user_id})`);
        }
    } else {
        console.log("No usage found in the last 15 minutes.");
    }
}
check();
