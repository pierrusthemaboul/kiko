import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

function getSupabase() {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    return createClient(url, key);
}

async function checkFinalQuality() {
    console.log("💎 Audit final de qualité sur 100 événements aléatoires...\n");
    const supabase = getSupabase();

    const { data: events, error } = await supabase
        .from('evenements')
        .select('titre, date, description_detaillee, notoriete_fr');

    if (error) {
        console.error("❌ Erreur Supabase:", error.message);
        return;
    }

    const selected = events.sort(() => 0.5 - Math.random()).slice(0, 100);

    selected.forEach((e, i) => {
        const year = new Date(e.date).getFullYear();
        process.stdout.write(`[${(i + 1).toString().padStart(3, ' ')}] ${year.toString().padStart(5, ' ')} | ${e.titre.padEnd(50, ' ')} | Notoriete: ${e.notoriete_fr.toString().padStart(2, ' ')}\n`);
        process.stdout.write(`      📄 DESC: ${e.description_detaillee}\n`);
        process.stdout.write(`      ${'-'.repeat(80)}\n`);
    });

    console.log(`\n✅ Audit de 100 événements terminé.`);
}

checkFinalQuality();
