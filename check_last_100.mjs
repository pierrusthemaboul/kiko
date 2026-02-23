import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase
        .from('user_event_usage')
        .select('last_seen_at, evenements(titre), user_id')
        .order('last_seen_at', { ascending: false })
        .limit(100);

    if (error) {
        console.error(error);
        return;
    }

    data.forEach((u, i) => {
        console.log(`${i + 1}. [${u.last_seen_at}] ${u.evenements?.titre} (${u.user_id.slice(0, 4)})`);
    });
}
check();
