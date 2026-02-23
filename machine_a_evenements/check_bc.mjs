import { getSupabase } from './machine_a_evenements/AGENTS/shared_utils.mjs';

const supabase = getSupabase('prod');

async function checkBC() {
    console.log("🔍 Recherche d'événements AVANT J.C...");

    // On récupère tout ce qui est avant l'année 0001
    const { data, error } = await supabase
        .from('evenements')
        .select('id, titre, date')
        .lt('date', '0001-01-01');

    if (error) {
        console.error("❌ Erreur:", error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log("✅ Aucun événement trouvé avant J.C.");
    } else {
        console.log(`⚠️ ${data.length} événements trouvés avant J.C. :`);
        data.forEach(e => {
            console.log(`- [${e.date}] ${e.titre} (ID: ${e.id})`);
        });
    }
}

checkBC();
