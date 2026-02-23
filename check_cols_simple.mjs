import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';
const supabase = createClient('http://127.0.0.1:54321', 'process.env.SUPABASE_SERVICE_ROLE_KEY');

async function check() {
    const { data } = await supabase.from('evenements').select('*').limit(1);
    const keys = Object.keys(data[0]);
    for (let i = 0; i < keys.length; i += 5) {
        console.log(keys.slice(i, i + 5).join(' | '));
    }
}
check();
