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

async function inspectSchema() {
    const { data, error } = await supabase.from('evenements').select('*').limit(1);
    if (data && data.length > 0) {
        console.log('Columns in "evenements":', Object.keys(data[0]));
        console.log('Sample row:', data[0]);
    } else {
        console.log('No data found or error:', error);
    }
}

inspectSchema();
