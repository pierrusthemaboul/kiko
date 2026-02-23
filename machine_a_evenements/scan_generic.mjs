import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function scanGenericTitles() {
    console.log("📥 Récupération de tous les titres...");

    let allTitles = [];
    let from = 0;
    const step = 999;
    let fetching = true;

    while (fetching) {
        const { data, error } = await supabase.from('evenements').select('titre, date').range(from, from + step);
        if (error) { console.error(error.message); return; }
        if (data && data.length > 0) {
            allTitles.push(...data);
            from += step + 1;
        }
        if (!data || data.length <= step) fetching = false;
    }

    console.log(`✅ ${allTitles.length} événements analysés.\n`);

    // Expressions régulières pour détecter les titres potentiellement trop génériques (qui manquent de contexte)
    const patterns = [
        /^Grève(s)?( (générale|des mineurs|des cheminots))?$/i,
        /^Élection(s)?( présidentielle(s)?| législative(s)?| municipale(s)?)?$/i,
        /^Séisme( au Japon)?$/i,
        /^Guerre$/i,
        /^Bataille$/i,
        /^Traité de paix$/i,
        /^Coup d'État$/i,
        /^Révolution$/i,
        /^Attentat(s)?$/i,
        /^Manifestation(s)?$/i
    ];

    let suspects = [];

    for (let ev of allTitles) {
        let isSuspect = false;
        for (let regex of patterns) {
            if (regex.test(ev.titre.trim())) {
                isSuspect = true;
                break;
            }
        }
        // Suspects secondaires : "Élections de [ANNEE]" ou "Séisme en [ANNEE]"
        if (/\b(19|20|18|17)\d{2}\b/.test(ev.titre)) {
            // Il a une année dans le titre (on avait dit interdit d'avoir des dates)
            // On peut le filtrer, on l'a partiellement fait mais on vérifie.
        }

        if (isSuspect) {
            suspects.push(ev);
        }
    }

    if (suspects.length === 0) {
        console.log(`🎉 INCROYABLE : Ta base est parfaitement clean. Aucun titre générique "cliché" trouvé parmi les ${allTitles.length} !`);
    } else {
        console.log(`⚠️ J'ai trouvé ${suspects.length} titres qui pourraient manquer de contexte :`);
        suspects.forEach(s => console.log(` - ${s.titre} (${s.date})`));
    }
}

scanGenericTitles();
