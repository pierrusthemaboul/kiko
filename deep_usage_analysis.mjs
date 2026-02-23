import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function deepAnalyze() {
    const { data: usage } = await supabase.from('user_event_usage').select('*, evenements(titre)');

    let totalTimesSeen = 0;
    usage.forEach(u => totalTimesSeen += u.times_seen);

    console.log(`Total cumulative views (sum of times_seen): ${totalTimesSeen}`);

    const reseen = usage.filter(u => u.times_seen > 1);
    console.log(`Number of (user, event) pairs seen more than once: ${reseen.length}`);

    if (reseen.length > 0) {
        console.log("Top re-seen events:");
        reseen.sort((a, b) => b.times_seen - a.times_seen).slice(0, 5).forEach(u => {
            console.log(`- ${u.evenements?.titre}: ${u.times_seen} times (User: ${u.user_id.slice(0, 8)})`);
        });
    }
}
deepAnalyze();
