import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkDetailedActivity() {
    const today = new Date().toISOString().split('T')[0];
    console.log(`=== ACTIVITÉ DU ${today} ===`);

    const { data: usage } = await supabase
        .from('user_event_usage')
        .select('user_id, event_id, last_seen_at')
        .gte('last_seen_at', today)
        .order('last_seen_at', { ascending: false });

    console.log(`Usage today: ${usage?.length || 0} events.`);
    if (usage && usage.length > 0) {
        usage.slice(0, 10).forEach(u => console.log(`- [${u.last_seen_at}] User: ${u.user_id} | Event: ${u.event_id}`));
    }

    const { data: runs } = await supabase
        .from('runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    console.log(`\nDernières parties (toutes):`);
    runs?.forEach(r => console.log(`- [${r.created_at}] User: ${r.user_id} | Mode: ${r.mode} | Points: ${r.points} | economy_applied_at: ${r.economy_applied_at}`));
}
checkDetailedActivity();
