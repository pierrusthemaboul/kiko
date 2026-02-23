import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function findByID() {
    const id = "f6da1413-2511-4226-b20f-2e0edeb5dc34";
    console.log(`Searching for files related to ID: ${id}`);

    const { data, error } = await supabase
        .storage
        .from('evenements-image')
        .list('', {
            limit: 1000
        });

    if (error) {
        console.error("Error:", error.message);
        return;
    }

    const matches = data.filter(f => f.name.includes(id));
    console.log("Matches:", JSON.stringify(matches, null, 2));
}

findByID();
