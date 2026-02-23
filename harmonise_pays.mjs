import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_KEY = 'process.env.SUPABASE_SERVICE_ROLE_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function harmonise() {
    const { data: events1 } = await supabase.from('evenements').select('id, pays').range(0, 999);
    const { data: events2 } = await supabase.from('evenements').select('id, pays').range(1000, 1999);
    const { data: events3 } = await supabase.from('evenements').select('id, pays').range(2000, 2999);

    const events = [...(events1 || []), ...(events2 || []), ...(events3 || [])];
    let updated = 0;

    for (const event of events) {
        if (!event.pays || !Array.isArray(event.pays)) continue;

        let changed = false;
        const newPays = event.pays.map(p => {
            if (p === "France (préciser la ville)" || p === "Paris" || p === "Versailles" || p === "Marseille" || p === "Lyon") {
                changed = true;
                return "France";
            }
            if (p === "Angleterre") {
                changed = true;
                return "Royaume-Uni";
            }
            return p;
        });

        if (changed) {
            // Supprimer les doublons dans le tableau (ex: "France", "France")
            const uniquePays = [...new Set(newPays)];
            const { error } = await supabase.from('evenements').update({ pays: uniquePays }).eq('id', event.id);
            if (!error) updated++;
            else console.error(`Erreur ID ${event.id}:`, error);
        }
    }

    console.log(`Harmonisation terminée : ${updated} événements mis à jour.`);
}

harmonise();
