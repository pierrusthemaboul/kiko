import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function listUniqueThemes() {
    console.log("Fetching unique themes from 'types_evenement'...");

    // Pour les colonnes de type array, on récupère tout et on traite en JS
    // (ou on appellerait une fonction RPC si elle existait)
    const { data, error } = await supabase
        .from('evenements')
        .select('types_evenement');

    if (error) {
        console.error("Error:", error.message);
        return;
    }

    const themes = new Set();
    data.forEach(row => {
        if (row.types_evenement && Array.isArray(row.types_evenement)) {
            row.types_evenement.forEach(theme => themes.add(theme));
        }
    });

    const sortedThemes = Array.from(themes).sort();
    console.log("\n--- Liste des thèmes trouvés ---");
    sortedThemes.forEach(t => console.log(`- ${t}`));
    console.log(`\nTotal: ${sortedThemes.length} thèmes.`);
}

listUniqueThemes();
