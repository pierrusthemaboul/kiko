import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkAll() {
    const { data, error } = await supabase
        .from('user_event_usage')
        .select('*, evenements(titre)')
        .order('last_seen_at', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    console.log(`TOTAL RECORDS IN user_event_usage: ${data.length}`);
    data.forEach(u => {
        console.log(`[${u.last_seen_at}] ${u.evenements?.titre} (User: ${u.user_id.slice(0, 6)})`);
    });
}
checkAll();
