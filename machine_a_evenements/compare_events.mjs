import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkEvents() {
    const titles = ["Jeudi noir de 1929", "Inauguration de la Pyramide du Louvre"];

    for (const title of titles) {
        console.log(`\n--- Searching for: ${title} ---`);
        const { data, error } = await supabase
            .from('evenements')
            .select('*')
            .ilike('titre', `%${title}%`);

        if (error) {
            console.error("Error:", error.message);
            continue;
        }

        console.log(JSON.stringify(data, null, 2));
    }
}

checkEvents();
