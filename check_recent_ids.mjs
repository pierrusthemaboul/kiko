import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkIds() {
    const { data: latestUsage } = await supabase.from('user_event_usage').select('user_id, last_seen_at').order('last_seen_at', { ascending: false }).limit(10);
    console.log("Derniers utilisateurs actifs (usage):");
    latestUsage.forEach(u => console.log(`${u.user_id} le ${u.last_seen_at}`));

    const { data: latestRuns } = await supabase.from('runs').select('user_id, created_at').order('created_at', { ascending: false }).limit(10);
    console.log("\nDerniers utilisateurs actifs (runs):");
    latestRuns.forEach(r => console.log(`${r.user_id} le ${r.created_at}`));
}
checkIds();
