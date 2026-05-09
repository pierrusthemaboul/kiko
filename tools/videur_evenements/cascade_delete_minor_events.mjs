import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function start() {
    console.log("🔍 Identification des 441 événements à supprimer...");
    
    const { data: events, error: fetchError } = await supabase
        .from('evenements')
        .select('id')
        .lt('notoriete_fr', 20);

    if (fetchError) {
        console.error("❌ Erreur lors de la récupération :", fetchError.message);
        return;
    }

    const ids = events.map(e => e.id);
    console.log(`🚀 Nettoyage en cascade pour ${ids.length} événements...`);

    const tables = [
        { name: 'evenements_embeddings', col: 'id' },
        { name: 'generation_logs_archive', col: 'evenement_id' },
        { name: 'evenements_audit', col: 'evenement_id' },
        { name: 'aregenerer', col: 'evenement_id' },
        { name: 'user_event_usage', col: 'event_id' }
    ];

    for (const table of tables) {
        console.log(`⏳ Suppression dans ${table.name}...`);
        const { error } = await supabase
            .from(table.name)
            .delete()
            .in(table.col, ids);
        
        if (error) {
            console.warn(`⚠️ Warning dans ${table.name}:`, error.message);
        }
    }

    console.log("⏳ Suppression finale dans evenements...");
    const { error: finalError } = await supabase
        .from('evenements')
        .delete()
        .in('id', ids);

    if (finalError) {
        console.error("❌ Erreur finale :", finalError.message);
    } else {
        console.log("✅ Nettoyage complet terminé avec succès.");
    }
}

start();
