
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    let { data: evs, error } = await supabase.from('evenements').select('*').not('description_detaillee', 'is', null).limit(1);
    if (evs && evs.length > 0) {
        console.log('Sample event WITH description:');
        console.log(JSON.stringify(evs[0], null, 2));
    } else {
        console.log('No events with description found.');
    }
}

check();
