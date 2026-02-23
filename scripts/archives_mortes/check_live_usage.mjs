import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkRecentUsage() {
    console.log("Recherche d'événements enregistrés dans les 5 dernières minutes...");
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: usage, error } = await supabase
        .from('user_event_usage')
        .select('*, evenements(titre), profiles(display_name)')
        .gte('last_seen_at', fiveMinAgo)
        .order('last_seen_at', { ascending: false });

    if (error) {
        console.error("Erreur:", error);
        return;
    }

    if (usage.length === 0) {
        console.log("❌ Aucun événement trouvé dans les 5 dernières minutes.");
    } else {
        console.log(`✅ ${usage.length} événement(s) trouvé(s) !`);
        usage.forEach(u => {
            console.log(`- [${u.last_seen_at}] Utilisateur: ${u.profiles?.display_name || u.user_id} | Événement: ${u.evenements?.titre}`);
        });
    }
}
checkRecentUsage();
