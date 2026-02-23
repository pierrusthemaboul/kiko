import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function list() {
    const { data } = await supabase
        .from('user_event_usage')
        .select('last_seen_at, evenements(titre), user_id')
        .order('last_seen_at', { ascending: false })
        .limit(30);

    data.forEach(u => {
        console.log(`${u.last_seen_at} | ${u.evenements?.titre || 'Inconnu'} (${u.user_id.slice(0, 4)})`);
    });
}
list();
