import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function getFullHistory() {
    console.log("=== RÉCUPÉRATION COMPLÈTE DE L'HISTORIQUE (3 DERNIERS JOURS) ===");

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('user_event_usage')
        .select(`
            last_seen_at, 
            user_id,
            event_id,
            evenements (
                titre,
                date
            )
        `)
        .gt('last_seen_at', threeDaysAgo)
        .order('last_seen_at', { ascending: false });

    if (error) {
        console.error("Erreur lors de la récupération :", error);
        return;
    }

    if (!data || data.length === 0) {
        console.log("Aucun événement trouvé dans user_event_usage pour les 3 derniers jours.");
        return;
    }

    console.log(`Nombre total d'entrées trouvées : ${data.length}`);
    data.forEach((u, i) => {
        const titre = u.evenements ? u.evenements.titre : `ID inconnu: ${u.event_id}`;
        const dateStr = u.evenements ? u.evenements.date : '';
        console.log(`${i + 1}. [${u.last_seen_at}] User:${u.user_id.slice(0, 6)} | ${titre} (${dateStr})`);
    });
}

getFullHistory();
