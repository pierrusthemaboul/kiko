import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function run() {
    const recentDate = new Date('2026-01-30T00:00:00Z').toISOString();
    const { data: events } = await supabase
        .from('evenements')
        .select('niveau_difficulte')
        .not('source_goju2_id', 'is', null)
        .gt('created_at', recentDate);

    let dist = {};
    events.forEach(e => {
        const d = e.niveau_difficulte || 0;
        dist[d] = (dist[d] || 0) + 1;
    });
    console.log(JSON.stringify(dist));
}
run();
