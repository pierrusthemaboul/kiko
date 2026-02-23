import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkRecent() {
    const { data: usage } = await supabase
        .from('user_event_usage')
        .select('*, evenements(titre)')
        .order('last_seen_at', { ascending: false })
        .limit(5);

    console.log("LAST 5 EVENTS SEEN:");
    usage?.forEach(u => {
        console.log(`- [${u.last_seen_at}] ${u.evenements?.titre} (User: ${u.user_id.slice(0, 8)})`);
    });
}
checkRecent();
