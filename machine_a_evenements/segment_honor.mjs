import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function selectiveRollback() {
    const { data: currentEvents, error } = await supabase
        .from('evenements')
        .select('id, titre, date_formatee, illustration_url')
        .ilike('illustration_url', '%honor_%');

    if (error) {
        console.error(error.message);
        return;
    }

    const deathKeywords = ["mort", "décès", "assassinat", "suicide", "exécution", "disparition"];

    const results = {
        modern_risk: [],       // Décès post-1950 (Besoin de vérification cadavre)
        historical_safe: [],   // Décès pré-1950 (On accepte le thème Honor)
        false_positives: []    // Pas des décès (A restaurer d'urgence)
    };

    currentEvents.forEach(e => {
        const titleLower = e.titre.toLowerCase();
        const isDeath = deathKeywords.some(kw => titleLower.includes(kw));
        const year = e.date_formatee ? parseInt(e.date_formatee.split('-')[0]) : 0;

        if (isDeath) {
            if (year >= 1950) {
                results.modern_risk.push(e);
            } else {
                results.historical_safe.push(e);
            }
        } else {
            results.false_positives.push(e);
        }
    });

    fs.writeFileSync('honor_segmentation.json', JSON.stringify(results, null, 2));

    console.log(`\n--- Résumé de l'audit ---`);
    console.log(`🚨 Risques Modernes (Post-1950) : ${results.modern_risk.length}`);
    console.log(`📜 Décès Historiques (Pré-1950)  : ${results.historical_safe.length}`);
    console.log(`✅ Faux Positifs (Non-décès)      : ${results.false_positives.length}`);
}

selectiveRollback();
