import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function inspectThemes() {
    console.log("Inspecting 'types_evenement' and 'mots_cles'...");
    const { data: events, error } = await supabase
        .from('evenements')
        .select('types_evenement, mots_cles')
        .limit(20);

    if (error) {
        console.error("Error:", error.message);
    } else {
        console.log("Sample values:");
        events.forEach((e, i) => {
            console.log(`${i + 1}. types_evenement: ${JSON.stringify(e.types_evenement)}, mots_cles: ${JSON.stringify(e.mots_cles)}`);
        });
    }
}

inspectThemes();
