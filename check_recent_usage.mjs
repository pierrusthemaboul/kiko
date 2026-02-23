import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// On utilise l'URL locale par défaut de Supabase
const supabase = createClient('http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkUsage() {
    console.log("🕵️ Vérification des événements récemment joués...");

    const { data, error } = await supabase
        .from('user_event_usage')
        .select(`
            last_seen_at,
            times_seen,
            user_id,
            evenements (
                titre,
                date
            )
        `)
        .order('last_seen_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error("❌ Erreur lors de la lecture de la table :", error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log("📭 Aucun événement trouvé dans user_event_usage. Le système n'enregistre peut-être rien.");
        return;
    }

    console.log(`\n📋 ${data.length} derniers événements enregistrés :\n`);
    data.forEach((usage, index) => {
        const event = usage.evenements;
        console.log(`${index + 1}. [${usage.last_seen_at}] ${event?.titre} (${event?.date}) - Vu ${usage.times_seen} fois (User: ${usage.user_id.slice(0, 8)}...)`);
    });
}

checkUsage();
