import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function listNoImage() {
    const { data, error } = await supabase
        .from('evenements')
        .select('titre, date_formatee, id')
        .is('illustration_url', null)
        .order('date', { ascending: false });

    if (error) {
        console.error("❌ Erreur:", error.message);
        return;
    }

    console.log("--- ÉVÉNEMENTS SANS IMAGE EN PRODUCTION ---");
    data.forEach(e => {
        console.log(`• [${e.date_formatee}] ${e.titre}`);
    });
    console.log(`\nTOTAL : ${data.length} événements.`);
}

listNoImage();
