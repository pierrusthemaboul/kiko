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
    console.log('--- Search title OR description: Picasso ---');
    const { data: d1 } = await supabase.from('evenements').select('titre, description').or('titre.ilike.%Picasso%,description.ilike.%Picasso%');
    console.log('Picasso results:', d1);

    console.log('\n--- Search title OR description: Macron ---');
    const { data: d2 } = await supabase.from('evenements').select('titre, description').or('titre.ilike.%Macron%,description.ilike.%Macron%');
    console.log('Macron results:', d2);

    console.log('\n--- Search title OR description: Le Pen ---');
    const { data: d3 } = await supabase.from('evenements').select('titre, description').or('titre.ilike.%Le Pen%,description.ilike.%Le Pen%');
    console.log('Le Pen results:', d3);

    console.log('\n--- Search title OR description: Melenchon ---');
    const { data: d4 } = await supabase.from('evenements').select('titre, description').or('titre.ilike.%Melenchon%,description.ilike.%Melenchon%');
    console.log('Melenchon results:', d4);
}

search();
