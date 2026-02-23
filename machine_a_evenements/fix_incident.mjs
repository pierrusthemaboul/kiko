import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTitle() {
    const { error } = await supabase.from('evenements').update({ titre: "Tentative de coup d'État au Japon (Incident du 26 février)" }).eq('titre', 'Incident du 26 février');
    if (error) console.error(error);
    else console.log('Titre corrigé en base !');
}
fixTitle();
