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

async function checkCounts() {
    const tables = ['evenements', 'goju2', 'queue_sevent'];
    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { head: true, count: 'exact' });
        if (error) {
            console.log(`❌ Table ${table}: ${error.message}`);
        } else {
            console.log(`✅ Table ${table}: ${count} lignes`);
        }
    }
}

checkCounts();
