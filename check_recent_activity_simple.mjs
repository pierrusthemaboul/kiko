import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkRecentActivity() {
    console.log("=== VÉRIFICATION DE L'ACTIVITÉ RÉCENTE (Moins de 12 heures) ===");
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

    // Check user_event_usage
    const { data: usage, error: usageError } = await supabase
        .from('user_event_usage')
        .select('user_id, event_id, last_seen_at')
        .gte('last_seen_at', twelveHoursAgo)
        .order('last_seen_at', { ascending: false });

    if (usageError) {
        console.error("Erreur usage:", usageError.message);
    } else {
        console.log(`Usage: ${usage.length} événements trouvés.`);
        usage.slice(0, 5).forEach(u => console.log(`- [${u.last_seen_at}] User: ${u.user_id} | Event: ${u.event_id}`));
    }

    // Check runs
    const { data: runs, error: runsError } = await supabase
        .from('runs')
        .select('id, user_id, created_at, points, mode')
        .gte('created_at', twelveHoursAgo)
        .order('created_at', { ascending: false });

    if (runsError) {
        console.error("Erreur runs:", runsError.message);
    } else {
        console.log(`Runs: ${runs.length} parties trouvées.`);
        runs.slice(0, 5).forEach(r => console.log(`- [${r.created_at}] User: ${r.user_id} | Mode: ${r.mode} | Points: ${r.points}`));
    }
}
checkRecentActivity();
