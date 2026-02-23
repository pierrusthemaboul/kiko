
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const id = '01bde4a3-d93b-4964-9941-4781afc96d56';

    console.log(`Checking ID: ${id}`);

    let { data: ev, error: evError } = await supabase.from('evenements').select('*').eq('id', id).single();
    if (ev) {
        console.log('Found in evenements table:');
        console.log(JSON.stringify(ev, null, 2));
    } else {
        console.log('Not found in evenements table.');
    }

    let { data: goju, error: gojuError } = await supabase.from('goju2').select('*').eq('id', id).single();
    if (goju) {
        console.log('Found in goju2 table:');
        console.log(JSON.stringify(goju, null, 2));
    } else {
        console.log('Not found in goju2 table.');
    }
}

check();
