import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkColumns() {
    const { data, error } = await supabase
        .from('goju2')
        .select('*')
        .limit(1);

    if (error) {
        console.error(error);
        return;
    }

    console.log(Object.keys(data[0]));
}

checkColumns();
