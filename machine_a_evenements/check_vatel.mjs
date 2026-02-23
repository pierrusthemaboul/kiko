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

async function checkVatel() {
    const { data, error } = await supabase
        .from('evenements')
        .select('id, titre, illustration_url, description_detaillee')
        .ilike('titre', '%Vatel%')
        .single();

    if (error) {
        console.error('Erreur:', error.message);
    } else if (data) {
        console.log(`Événement trouvé : ${data.titre}`);
        console.log(`ID : ${data.id}`);
        console.log(`Image URL : ${data.illustration_url}`);
        console.log(`Description : ${data.description_detaillee}`);
    } else {
        console.log('Aucun événement trouvé pour Vatel.');
    }
}

checkVatel();
