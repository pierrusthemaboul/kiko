import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function listAll() {
    console.log(`Listing first 100 files in storage...`);

    const { data, error } = await supabase
        .storage
        .from('evenements-image')
        .list('', {
            limit: 100,
            sortBy: { column: 'created_at', order: 'desc' }
        });

    if (error) {
        console.error("Error:", error.message);
        return;
    }

    console.log("Latest files:");
    data.forEach(f => console.log(`- ${f.name} (${f.created_at})`));
}

listAll();
