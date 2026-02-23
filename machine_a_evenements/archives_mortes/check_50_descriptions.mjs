import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

function getSupabase(env = 'prod') {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error("Missing Supabase URL or Key in .env");
    }
    return createClient(url, key);
}

async function checkRandomDescriptions() {
    console.log("🎲 Tirage au sort de 50 événements...");
    const supabase = getSupabase();

    const { data: events, error } = await supabase
        .from('evenements')
        .select('titre, date, description_detaillee, notoriete_fr');

    if (error) {
        console.error("❌ Erreur Supabase:", error.message);
        return;
    }

    if (!events || events.length === 0) {
        console.log("⚠️ Aucun événement trouvé.");
        return;
    }

    const selected = events.sort(() => 0.5 - Math.random()).slice(0, 50);

    selected.forEach((e, i) => {
        console.log(`\n[${i + 1}/50] 📌 ${e.titre} (${new Date(e.date).getFullYear()}) [Score: ${e.notoriete_fr}]`);
        console.log(`📄 DESC: ${e.description_detaillee || "❌ VIDE"}`);
    });
}

checkRandomDescriptions();
