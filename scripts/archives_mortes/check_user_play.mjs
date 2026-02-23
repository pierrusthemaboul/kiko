import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkYourActivity() {
    console.log("=== VÉRIFICATION DE TA PARTIE (Score: 13581) ===");

    // 1. Chercher le run récent avec ce score (si enregistré)
    // On a vu que la colonne 'score' n'existait pas dans 'runs', on va chercher par created_at
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: runs, error: e1 } = await supabase
        .from('runs')
        .select('*')
        .gt('created_at', fiveMinsAgo)
        .order('created_at', { ascending: false });

    if (runs && runs.length > 0) {
        console.log(`✅ Run trouvé ! ID: ${runs[0].id}, User: ${runs[0].user_id}`);

        // 2. Chercher les événements pour cet utilisateur dans user_event_usage
        const { data: usage, error: e2 } = await supabase
            .from('user_event_usage')
            .select('last_seen_at, evenements(titre)')
            .eq('user_id', runs[0].user_id)
            .order('last_seen_at', { ascending: false });

        if (usage && usage.length > 0) {
            console.log(`✅ ${usage.length} événements enregistrés pour cet utilisateur :`);
            usage.forEach(u => console.log(`- [${u.last_seen_at}] ${u.evenements?.titre}`));
        } else {
            console.log("❌ Aucun événement trouvé dans user_event_usage pour cet ID.");
        }
    } else {
        console.log("❌ Aucun run enregistré dans les 5 dernières minutes.");
    }

    // 3. Backup : Check n'importe quel log de debug récent
    const { data: logs } = await supabase
        .from('remote_debug_logs')
        .select('*')
        .gt('created_at', fiveMinsAgo)
        .order('created_at', { ascending: false });

    if (logs && logs.length > 0) {
        console.log(`✅ ${logs.length} logs de debug trouvés :`);
        logs.forEach(l => console.log(`[${l.created_at}] ${l.category} | ${l.message}`));
    }
}

checkYourActivity();
