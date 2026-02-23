import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Script pour extraire les événements joués sans passer par le cache de schéma si possible
const supabase = createClient('http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkActualUsage() {
    console.log("🔍 Analyse des données d'usage...");

    // Tentative de récupération des IDs
    const { data: usage, error } = await supabase
        .from('user_event_usage')
        .select('event_id, times_seen, last_seen_at, user_id')
        .order('last_seen_at', { ascending: false });

    if (error) {
        console.error("❌ Erreur usage:", error.message);
        return;
    }

    if (!usage || usage.length === 0) {
        console.log("📭 Aucun log d'usage trouvé dans la table.");
        return;
    }

    // Récupérer les titres pour ces IDs
    const eventIds = usage.map(u => u.event_id);
    const { data: events, error: evError } = await supabase
        .from('evenements')
        .select('id, titre')
        .in('id', eventIds);

    if (evError) {
        console.error("❌ Erreur titres:", evError.message);
        return;
    }

    const titleMap = {};
    events.forEach(e => titleMap[e.id] = e.titre);

    console.log(`\n✅ ${usage.length} enregistrements trouvés :\n`);
    usage.forEach((u, i) => {
        console.log(`${i + 1}. [${u.last_seen_at}] ${titleMap[u.event_id] || u.event_id} - Vu ${u.times_seen} fois (Joueur: ${u.user_id.slice(0, 8)})`);
    });
}

checkActualUsage();
