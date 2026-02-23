import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkCatalog() {
    const { count: totalEvents } = await supabase
        .from('evenements')
        .select('*', { count: 'exact', head: true });

    const { data: usage } = await supabase.from('user_event_usage').select('event_id');
    const uniqueSeen = new Set(usage.map(u => u.event_id)).size;

    console.log(`CATALOG STATS:`);
    console.log(`Total events in catalog: ${totalEvents}`);
    console.log(`Unique events seen by users: ${uniqueSeen}`);
    console.log(`Coverage: ${((uniqueSeen / totalEvents) * 100).toFixed(2)}%`);
}
checkCatalog();
