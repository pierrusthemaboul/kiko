import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkTiers() {
    let allEvents = [];
    let from = 0;
    const step = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('evenements')
            .select('notoriete')
            .range(from, from + step - 1);

        if (error) break;
        if (!data || data.length === 0) break;

        allEvents = allEvents.concat(data);
        from += step;
    }

    const t1 = allEvents.filter(e => (e.notoriete || 0) >= 75).length;
    const t2 = allEvents.filter(e => (e.notoriete || 0) >= 50 && (e.notoriete || 0) < 75).length;
    const t3 = allEvents.filter(e => (e.notoriete || 0) < 50).length;

    console.log(`TIER 1 (>=75): ${t1}`);
    console.log(`TIER 2 (50-74): ${t2}`);
    console.log(`TIER 3 (<50): ${t3}`);
    console.log(`TOTAL: ${allEvents.length}`);

    // Check some sample notoriety values
    console.log("Samples:", allEvents.slice(0, 10).map(e => e.notoriete));
}
checkTiers();
