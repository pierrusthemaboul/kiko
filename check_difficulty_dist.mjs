import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkDifficulty() {
    console.log("=== DISTRIBUTION DE LA DIFFICULTÉ DES MIGRATIONS RÉCENTES ===");

    const recentDate = new Date('2026-01-30T00:00:00Z').toISOString();
    const { data: events } = await supabase
        .from('evenements')
        .select('niveau_difficulte')
        .not('source_goju2_id', 'is', null)
        .gt('created_at', recentDate);

    let dist = {};
    events.forEach(e => {
        const d = e.niveau_difficulte || 0;
        dist[d] = (dist[d] || 0) + 1;
    });

    console.log("Difficulté | Nombre d'événements");
    Object.keys(dist).sort().forEach(d => {
        console.log(`   ${d}       | ${dist[d]}`);
    });

    console.log("\nRappel des configs de niveau :");
    console.log("- Niveau 1 : Difficulté 1 uniquement");
    console.log("- Niveau 2 : Difficulté 1-2");
    console.log("- Niveau 3 : Difficulté 1-3");
    console.log("- Niveau 6 : Difficulté 3-4");
}

checkDifficulty();
