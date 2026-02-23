import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkTable() {
    console.log("Checking 'evenements' table structure...");
    const { data, error } = await supabase
        .from('evenements')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error:", error.message);
    } else {
        console.log("Success! Found 1 record:");
        console.log(JSON.stringify(data[0], null, 2));
    }
}

checkTable();
