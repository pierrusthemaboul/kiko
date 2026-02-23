import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';

const PROD_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const PROD_KEY = 'process.env.SUPABASE_PROD_SERVICE_ROLE_KEY'; // From .env

const supabase = createClient(PROD_URL, PROD_KEY);

const TO_DELETE = [
    "f29f11b4-4ae1-40ce-ab41-75f2a84c4575", // Succession Pologne 1733
    "d10e78fb-4350-44d8-88ff-22884f7ed7c3", // Photo 1827
    "ebe025e9-c27b-46d9-b559-2ece255b9516", // Expo Universelle 1855
    "e91309cd-455b-459b-a1ec-2cbea5006b23", // Succession Espagne 1701
    "ecd0383d-d247-4e28-91a8-4f059ed3c840", // Académie française 1634
    "47002aff-e66c-4512-927e-188ebda7d0cb", // Edit Compiègne
    "a0fbb24f-693a-4929-8ef3-3b5680259185", // Mariage Louis XIII 1601
    "a73997d7-a58a-46c9-aef9-a62b0533c462", // Constantinople 1454
    "595ca01c-34d1-4a17-b8e6-151d56193735", // Fontenoy 1744
    "89b3e66a-a4d2-4f41-a8fc-e080a1469f90", // St Martin 473
    "ed6a2835-e041-45ed-989a-a2a7b9cdf0a7", // Marignan 1514
    "941cc7fa-a9b0-4c9b-95cc-f78eba789e7b"  // Provence 1482
];

async function runCleanup() {
    console.log("--- Nettoyage PRODUCTION ---");

    // 1. Suppression
    console.log(`Suppression de ${TO_DELETE.length} entrées...`);
    const { error: delErr } = await supabase.from('evenements').delete().in('id', TO_DELETE);
    if (delErr) {
        console.error("Erreur suppression:", delErr);
    } else {
        console.log("✅ Suppressions terminées.");
    }

    // 2. Harmonisation Pays
    console.log("Harmonisation des pays...");
    let page = 0;
    let totalUpdated = 0;
    let hasMore = true;

    while (hasMore) {
        const { data: events, error: fetchErr } = await supabase
            .from('evenements')
            .select('id, pays')
            .range(page * 1000, (page + 1) * 1000 - 1);

        if (fetchErr) {
            console.error("Erreur fetch:", fetchErr);
            break;
        }

        if (!events || events.length === 0) {
            hasMore = false;
            break;
        }

        for (const event of events) {
            if (!event.pays || !Array.isArray(event.pays)) continue;

            let changed = false;
            const newPays = event.pays.map(p => {
                const norm = typeof p === 'string' ? p.trim() : p;
                if (norm === "France (préciser la ville)" || norm === "Paris" || norm === "Versailles" || norm === "Marseille" || norm === "Lyon") {
                    changed = true;
                    return "France";
                }
                if (norm === "Angleterre") {
                    changed = true;
                    return "Royaume-Uni";
                }
                return norm;
            });

            if (changed) {
                const uniquePays = [...new Set(newPays)];
                const { error: updErr } = await supabase.from('evenements').update({ pays: uniquePays }).eq('id', event.id);
                if (!updErr) totalUpdated++;
            }
        }
        page++;
    }

    console.log(`✅ Harmonisation terminée : ${totalUpdated} événements mis à jour en PRODUCTION.`);
}

runCleanup();
