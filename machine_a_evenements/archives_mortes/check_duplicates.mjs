import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkDuplicates() {
    const titles = ["Mort de Louis XIV", "Décès d'Auguste", "Fondation de Jamestown"];

    for (const title of titles) {
        console.log(`\n--- Title: ${title} ---`);
        const { data, error } = await supabase
            .from('evenements')
            .select('*')
            .ilike('titre', title);

        if (data && data.length > 0) {
            data.forEach((ev, i) => {
                console.log(`  [${i + 1}] ID: ${ev.id}, Illustration: ${ev.illustration_url}, Updated: ${ev.updated_at}`);
            });
        }
    }
}

checkDuplicates();
