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
    console.log('--- Search: Picasso ---');
    const { data: d1 } = await supabase.from('evenements').select('titre').ilike('titre', '%Picasso%');
    console.log('Picasso results:', d1);

    console.log('\n--- Search: Macron ---');
    const { data: d2 } = await supabase.from('evenements').select('titre').ilike('titre', '%Macron%');
    console.log('Macron results:', d2);

    console.log('\n--- Search: Pen ---');
    const { data: d3 } = await supabase.from('evenements').select('titre').ilike('titre', '%Pen%');
    console.log('Pen results:', d3);
}

search();
