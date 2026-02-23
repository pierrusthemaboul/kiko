
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function show() {
    const id = 'c00314d8-6382-41b1-b42e-7a8095b163ed';
    let { data: ev, error } = await supabase.from('evenements').select('*').eq('id', id).single();
    if (error) {
        console.error('Error:', error);
    } else {
        console.log(JSON.stringify(ev, null, 2));
    }
}

show();
