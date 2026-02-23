
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function search() {
    const title = process.argv[2] || "Fondation de l'Université de Bordeaux";
    console.log(`Searching for title: ${title}`);

    let { data: ev, error: evError } = await supabase.from('evenements').select('*').ilike('titre', `%${title}%`);
    if (ev && ev.length > 0) {
        console.log(`Found ${ev.length} matching events in evenements:`);
        console.log(JSON.stringify(ev, null, 2));
    } else {
        console.log('Not found in evenements table.');
    }
}

search();
