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

async function countPostWar() {
    // Les dates sont au format YYYY-MM-DD
    const { count, error } = await supabase
        .from('evenements')
        .select('*', { head: true, count: 'exact' })
        .gte('date', '1945-01-01');

    if (error) {
        console.error('Error counting:', error);
    } else {
        console.log(`Nombre d'événements après le 01/01/1945 : ${count}`);
    }
}

countPostWar();
