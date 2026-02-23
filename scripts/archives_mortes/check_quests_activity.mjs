import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function check() {
    const { data } = await supabase
        .from('quest_progress')
        .select('*, evenements(titre)')
        .order('updated_at', { ascending: false })
        .limit(20);

    console.log("Dernières progressions de quête :");
    data?.forEach(q => {
        console.log(`[${q.updated_at}] User:${q.user_id.slice(0, 6)} | Status:${q.status} | Event:${q.evenements?.titre || q.event_id}`);
    });
}
check();
