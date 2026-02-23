import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkTiers() {
    const { data: events, error } = await supabase
        .from('evenements')
        .select('notoriete');

    if (error) {
        console.error(error);
        return;
    }

    const t1 = events.filter(e => (e.notoriete || 0) >= 75).length;
    const t2 = events.filter(e => (e.notoriete || 0) >= 50 && (e.notoriete || 0) < 75).length;
    const t3 = events.filter(e => (e.notoriete || 0) < 50).length;

    console.log(`TIER 1 (>=75): ${t1}`);
    console.log(`TIER 2 (50-74): ${t2}`);
    console.log(`TIER 3 (<50): ${t3}`);
    console.log(`TOTAL: ${events.length}`);
}
checkTiers();
