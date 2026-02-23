import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function auditFinal() {
    console.log("🕵️ [AUDIT FINAL] Vérification de l'intégrité des titres en production...");

    const { data: allEvents, error } = await supabase
        .from('evenements')
        .select('titre, date_formatee, id');

    if (error) {
        console.error(error.message);
        return;
    }

    const suspects = [
        "L'héritage", "L'Héritage", "L'ère", "L'Ère", "Un talent",
        "Un règne", "Un Règne", "Une vie", "matching", "pattern",
        "Aucun", "convient", "correspond", "pertinent", "Description",
        "Epopée", "Légende", "Vision"
    ];

    const results = allEvents.filter(e => {
        return suspects.some(s => e.titre.includes(s)) || e.titre.length > 80;
    });

    if (results.length === 0) {
        console.log("✅ Félicitations ! Aucun titre suspect n'a été détecté.");
    } else {
        console.log(`⚠️ ${results.length} titres suspect restent encore en production :`);
        results.forEach(r => {
            console.log(`• [${r.date_formatee}] ${r.titre}`);
        });
    }
}

auditFinal();
