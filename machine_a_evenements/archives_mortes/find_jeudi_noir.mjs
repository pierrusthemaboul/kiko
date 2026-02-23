import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkEvent() {
    const title = "Jeudi noir de 1929";
    console.log(`Searching for: ${title}`);

    const { data, error } = await supabase
        .from('evenements')
        .select('*')
        .ilike('titre', `%${title}%`);

    if (error) {
        console.error("Error:", error.message);
        return;
    }

    console.log(JSON.stringify(data, null, 2));
}

checkEvent();
