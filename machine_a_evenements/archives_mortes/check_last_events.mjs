import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkLastEvents() {
    const { data, error } = await supabase
        .from('goju2')
        .select('titre, year, illustration_url')
        .order('id', { ascending: false })
        .limit(12);

    if (error) {
        console.error(error);
        return;
    }

    console.log(JSON.stringify(data, null, 2));
}

checkLastEvents();
