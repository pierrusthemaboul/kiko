import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function scanStorage() {
    console.log(`Scanning storage...`);

    const { data, error } = await supabase
        .storage
        .from('evenements-image')
        .list('', {
            limit: 5000
        });

    if (error) {
        console.error("Error:", error.message);
        return;
    }

    const matches = data.filter(f =>
        f.name.toLowerCase().includes('1929') ||
        f.name.toLowerCase().includes('krach') ||
        f.name.toLowerCase().includes('jeudi') ||
        f.name.toLowerCase().includes('wall')
    );

    console.log("Matches found:", matches.length);
    matches.forEach(m => console.log(`- ${m.name}`));
}

scanStorage();
