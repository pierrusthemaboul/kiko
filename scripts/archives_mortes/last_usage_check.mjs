import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function check() {
    const { data: usage } = await supabase
        .from('user_event_usage')
        .select('user_id, last_seen_at')
        .order('last_seen_at', { ascending: false })
        .limit(3);

    for (const u of usage) {
        const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', u.user_id).single();
        console.log(`DATE: ${u.last_seen_at} | NAME: ${profile?.display_name}`);
    }
}
check();
