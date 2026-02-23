import { getSupabase } from './AGENTS/shared_utils.mjs';

const supabase = getSupabase();

async function diagnosticDoublons() {
    console.log("=== DIAGNOSTIC DES DOUBLONS ===\n");

    // 1. Récupérer l'événement "Prise de la Bastille" existant
    console.log("1️⃣ Recherche de 'Prise de la Bastille' dans la base...");
    const { data: bastilleData, error: bastilleError } = await supabase
        .from('evenements')
        .select('*')
        .ilike('titre', '%bastille%');

    if (bastilleError) {
        console.error("Erreur:", bastilleError);
    } else {
        console.log("Résultat:", JSON.stringify(bastilleData, null, 2));
    }

    // 2. Vérifier tous les événements de 1789
    console.log("\n2️⃣ Tous les événements de 1789...");
    const { data: events1789, error: error1789 } = await supabase
        .from('evenements')
        .select('*')
        .gte('date', '1789-01-01')
        .lte('date', '1789-12-31');

    if (error1789) {
        console.error("Erreur:", error1789);
    } else {
        console.log("Résultat:", JSON.stringify(events1789, null, 2));
    }

    // 3. Vérifier la fenêtre ±4 ans autour de 1789 (ce que SENTINEL fait)
    console.log("\n3️⃣ Fenêtre ±4 ans autour de 1789 (1785-1793)...");
    const { data: eventsWindow, error: errorWindow } = await supabase
        .from('evenements')
        .select('titre, date')
        .gte('date', '1785-01-01')
        .lte('date', '1793-12-31');

    if (errorWindow) {
        console.error("Erreur:", errorWindow);
    } else {
        console.log(`Trouvé ${eventsWindow.length} événements dans cette fenêtre:`);
        eventsWindow.forEach(e => {
            const year = parseInt(e.date.split('-')[0]);
            console.log(`   - "${e.titre}" (${year})`);
        });
    }

    // 4. Comparer avec les événements validés par SENTINEL
    console.log("\n4️⃣ Événements validés par SENTINEL dans le dernier run:");
    const sentinelValidated = [
        { titre: "Bataille d'Alésia", year: 52 },
        { titre: "Bataille de Poitiers", year: 732 },
        { titre: "Couronnement de Charlemagne", year: 800 },
        { titre: "Début du règne d'Hugues Capet", year: 987 },
        { titre: "Grande Peste Noire", year: 1348 },
        { titre: "Siège d'Orléans par Jeanne d'Arc", year: 1429 },
        { titre: "Prise de la Bastille", year: 1789 },
        { titre: "Exécution de Louis XVI", year: 1793 },
        { titre: "Bataille d'Austerlitz", year: 1805 }
    ];

    console.log("\n5️⃣ Vérification des doublons pour chaque événement validé...");
    for (const event of sentinelValidated) {
        const yearMin = event.year - 4;
        const yearMax = event.year + 4;

        const { data: candidates, error } = await supabase
            .from('evenements')
            .select('titre, date')
            .gte('date', `${yearMin}-01-01`)
            .lte('date', `${yearMax}-12-31`);

        if (!error && candidates.length > 0) {
            console.log(`\n⚠️  "${event.titre}" (${event.year}) - ${candidates.length} candidat(s) trouvé(s):`);
            candidates.forEach(c => {
                const year = parseInt(c.date.split('-')[0]);
                console.log(`      - "${c.titre}" (${year})`);
            });
        } else {
            console.log(`✅ "${event.titre}" (${event.year}) - Aucun candidat (OK)`);
        }
    }

    // 6. Total des événements dans la base
    console.log("\n6️⃣ Statistiques générales...");
    const { count, error: countError } = await supabase
        .from('evenements')
        .select('*', { count: 'exact', head: true });

    if (!countError) {
        console.log(`Total événements dans la base: ${count}`);
    }
}

diagnosticDoublons().catch(console.error);
