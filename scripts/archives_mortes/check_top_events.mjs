import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkTop() {
    const { data: usage } = await supabase.from('user_event_usage').select('*, evenements(titre)');
    const stats = {};
    usage.forEach(u => {
        const t = u.evenements?.titre || 'Unknown';
        stats[t] = (stats[t] || 0) + u.times_seen;
    });
    const top = Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 10);
    top.forEach(([t, c]) => console.log(`${c} - ${t}`));
}
checkTop();
