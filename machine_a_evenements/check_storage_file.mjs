import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkStorage() {
    const fileName = "krach wall street 1929.webp";
    console.log(`Checking storage for: ${fileName}`);

    const { data, error } = await supabase
        .storage
        .from('evenements-image')
        .list('', {
            search: fileName
        });

    if (error) {
        console.error("Error:", error.message);
        return;
    }

    console.log("Found:", JSON.stringify(data, null, 2));
}

checkStorage();
