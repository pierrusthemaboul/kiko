
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkExactCount() {
    console.log("🔍 Audit de la table 'evenements'...");

    // 1. Compte total brut
    const { count: totalCount, error: err1 } = await supabase
        .from('evenements')
        .select('*', { count: 'exact', head: true });

    // 2. Compte avec date valide
    const { count: validDateCount, error: err2 } = await supabase
        .from('evenements')
        .select('*', { count: 'exact', head: true })
        .not('date', 'is', null);

    // 3. Compte par époques
    const { data: epoques, error: err3 } = await supabase
        .from('evenements')
        .select('epoque');

    if (err1 || err2) {
        console.error("❌ Erreur:", err1 || err2);
        return;
    }

    const counts = {};
    epoques.forEach(e => {
        counts[e.epoque] = (counts[e.epoque] || 0) + 1;
    });

    console.log(`\n📊 Résultats :`);
    console.log(`- Total en base           : ${totalCount}`);
    console.log(`- Avec date renseignée    : ${validDateCount}`);
    console.log(`- Sans date (inutilisables) : ${totalCount - validDateCount}`);

    console.log("\n🌍 Répartition par époque :");
    Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([ep, count]) => {
        console.log(`- ${ep.padEnd(25)} : ${count}`);
    });

    // 4. Vérification de l'usage RÉEL (Production)
    const { count: distinctSeen, error: err4 } = await supabase
        .from('user_event_usage')
        .select('event_id', { count: 'exact', head: true });

    console.log(`\n📈 État réel de la PRODUCTION :`);
    console.log(`- Événements déjà vus par au moins un joueur : ${distinctSeen}`);
    console.log(`- Taux de couverture actuel (réel)           : ${((distinctSeen / totalCount) * 100).toFixed(1)}%`);
}

checkExactCount();
