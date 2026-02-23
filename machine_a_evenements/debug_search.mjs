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

async function search() {
    const { data, error } = await supabase.from('evenements').select('titre').ilike('titre', '%Picasso%');
    if (error) {
        console.error('ERROR during Picasso search:', error);
    } else {
        console.log('Picasso count:', data?.length);
        console.log('Results:', data);
    }
}

search();
