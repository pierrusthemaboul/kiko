import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deepAudit() {
    const terms = [
        'décès', 'suicide', 'massacre', 'génocide', 'victime',
        'corps', 'cimetière', 'tombe', 'sépulture', 'pendaison',
        'guillotine', 'fusillade', 'carnage', 'holocauste',
        'cadavérique', 'charnier', 'pendu', 'exécuté', 'assassiné'
    ];

    console.log('🔍 Analyse approfondie de la base (Titres & Descriptions)...');

    let allResults = [];

    for (const term of terms) {
        const { data, error } = await supabase
            .from('evenements')
            .select('id, titre, description_detaillee, date, illustration_url')
            .or(`titre.ilike.%${term}%,description_detaillee.ilike.%${term}%`);

        if (data) {
            data.forEach(item => {
                allResults.push({ ...item, matched_term: term });
            });
        }
    }

    // Déduplication par ID
    const uniqueResults = Array.from(new Map(allResults.map(item => [item.id, item])).values());

    // Classification
    const categorized = {
        moderne: [], // Post-1900
        ancien: []   // Pré-1900
    };

    uniqueResults.forEach(item => {
        const year = parseInt(item.date.split('-')[0]);
        if (year >= 1900) categorized.moderne.push(item);
        else categorized.ancien.push(item);
    });

    console.log(`\n📊 Résultats de l'audit :`);
    console.log(`- Époque moderne (Post-1900) : ${categorized.moderne.length} événements`);
    console.log(`- Époque ancienne (Pré-1900) : ${categorized.ancien.length} événements`);

    console.log('\n--- 🔴 FOCUS MODERNES (TOP 15) ---');
    categorized.moderne.slice(0, 15).forEach(item => {
        console.log(`[${item.date}] ${item.titre} (Terme: ${item.matched_term})`);
    });

    console.log('\n--- 🟠 FOCUS ANCIENS (TOP 15) ---');
    categorized.ancien.slice(0, 15).forEach(item => {
        console.log(`[${item.date}] ${item.titre} (Terme: ${item.matched_term})`);
    });
}

deepAudit();
