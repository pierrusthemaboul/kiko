import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const targetNames = [
    "Zidane", "Mbappé", "Messi", "Deschamps", "Griezmann", "Pogba", "Antoine Dupont", "Tiger Woods",
    "Lance Armstrong", "Belmondo", "Aznavour", "Coluche", "Dewaere", "Terzieff", "Jane Birkin",
    "Strauss-Kahn", "Princesse Diana", "Claude Nougaro", "Michel Jazy", "Pablo Picasso",
    "Banksy", "Damien Hirst", "François Truffaut", "Greta Garbo", "Jacques Chancel",
    "Sepp Blatter", "Eusebio", "André Roussimoff", "George Weah", "Ken Kutaragi"
];

async function findTargets() {
    let allEvents = [];
    let from = 0;
    while (true) {
        const { data, error } = await supabase
            .from('evenements')
            .select('id, titre, description_detaillee')
            .gte('date', '1950-01-01')
            .range(from, from + 999);

        if (error) { console.error(error); return; }
        if (data && data.length > 0) {
            allEvents.push(...data);
            from += 1000;
        } else {
            break;
        }
    }

    let targetsToAnonymize = [];

    for (const ev of allEvents) {
        for (const name of targetNames) {
            if (ev.description_detaillee && ev.description_detaillee.includes(name) || ev.titre && ev.titre.includes(name)) {
                // Avoid duplicates
                if (!targetsToAnonymize.find(t => t.id === ev.id)) {
                    targetsToAnonymize.push({ ...ev, matched_name: name });
                }
            }
        }
    }

    console.log(`🎯 Trouvé ${targetsToAnonymize.length} événements avec ces noms précis :`);
    targetsToAnonymize.forEach(t => {
        console.log(` - [${t.matched_name}] ${t.titre}`);
    });
}

findTargets();
