import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkYourSpecificActivity() {
    const userId = '9d97c5fe-912f-4161-9c6f-3199c0993557'; // ID de Pierrot
    console.log(`=== ANALYSE RÉCENTE POUR : Pierrot (${userId}) ===`);

    const { data: usage } = await supabase
        .from('user_event_usage')
        .select('*, evenements(titre)')
        .eq('user_id', userId)
        .order('last_seen_at', { ascending: false })
        .limit(20);

    if (usage && usage.length > 0) {
        console.log(`\n✅ ${usage.length} nouveaux événements enregistrés :\n`);
        usage.forEach((u, i) => {
            console.log(`${i + 1}. [${u.last_seen_at}] ${u.evenements?.titre} (Vu ${u.times_seen} fois)`);
        });
    } else {
        console.log("\n❌ Aucun événement n'est remonté dans user_event_usage pour ton compte.");
    }

    const { data: runs } = await supabase
        .from('runs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

    console.log("\n--- Derniers Runs ---");
    runs?.forEach(r => console.log(`[${r.created_at}] Mode: ${r.mode}`));
}
checkYourSpecificActivity();
