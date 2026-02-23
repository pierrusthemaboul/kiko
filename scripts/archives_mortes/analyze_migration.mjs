import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function countMigrated() {
    console.log("=== STATISTIQUES DE MIGRATION ===");

    // Count events with source_goju2_id
    const { count: migratedCount } = await supabase
        .from('evenements')
        .select('*', { count: 'exact', head: true })
        .not('source_goju2_id', 'is', null);

    console.log(`Nombre total d'événements migrés (avec source_goju2_id) : ${migratedCount}`);

    // Count migrated events created recently
    const recentDate = new Date('2026-01-30T00:00:00Z').toISOString();
    const { count: recentMigrated } = await supabase
        .from('evenements')
        .select('*', { count: 'exact', head: true })
        .not('source_goju2_id', 'is', null)
        .gt('created_at', recentDate);

    console.log(`Nombre d'événements migrés depuis le 30/01 : ${recentMigrated}`);

    // Check notoriety distribution of these recent migrations
    const { data: recentEvents } = await supabase
        .from('evenements')
        .select('titre, notoriete, created_at')
        .not('source_goju2_id', 'is', null)
        .gt('created_at', recentDate)
        .order('created_at', { ascending: false })
        .limit(50);

    console.log("\nNotoriété des 50 dernières migrations :");
    let lowNot = 0;
    recentEvents.forEach(e => {
        if ((e.notoriete || 0) < 50) lowNot++;
        console.log(`[${e.notoriete || 0}] ${e.titre}`);
    });

    console.log(`\nSur les 50 derniers migrés, ${lowNot} ont une notoriété < 50 (Invisibles dans le pool Classic/Star).`);
}

countMigrated();
