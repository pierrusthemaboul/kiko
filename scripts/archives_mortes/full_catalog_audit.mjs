
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function fullCatalogAudit() {
    console.log("🚀 Audit COMPLET du catalogue (2654 événements attendus)...");

    let allEvents = [];
    let from = 0;
    while (true) {
        const { data, error } = await supabase
            .from('evenements')
            .select('id, niveau_difficulte')
            .range(from, from + 999);

        if (error) break;
        allEvents = allEvents.concat(data);
        if (data.length < 1000) break;
        from += 1000;
    }

    console.log(`✅ ${allEvents.length} événements récupérés.`);

    const diffDist = {};
    allEvents.forEach(e => {
        const d = e.niveau_difficulte || 'Non défini';
        diffDist[d] = (diffDist[d] || 0) + 1;
    });

    console.log("\n📊 Répartition RÉELLE par difficulté :");
    Object.keys(diffDist).sort().forEach(d => {
        console.log(`- Difficulté ${d.padEnd(10)} : ${diffDist[d]} événements`);
    });
}

fullCatalogAudit();
