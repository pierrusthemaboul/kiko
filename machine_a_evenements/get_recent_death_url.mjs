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

async function checkRecentDeath() {
    const { data } = await supabase
        .from('evenements')
        .select('titre, illustration_url')
        .ilike('titre', '%Jane Birkin%')
        .single();

    if (data) {
        console.log(`Titre : ${data.titre}`);
        console.log(`URL : ${data.illustration_url}`);
    } else {
        // Fallback sur Belmondo si Birkin n'a pas d'image
        const { data: b } = await supabase
            .from('evenements')
            .select('titre, illustration_url')
            .ilike('titre', '%Belmondo%')
            .single();
        if (b) {
            console.log(`Titre : ${b.titre}`);
            console.log(`URL : ${b.illustration_url}`);
        }
    }
}

checkRecentDeath();
