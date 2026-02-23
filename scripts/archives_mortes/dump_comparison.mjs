import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import fs from 'fs';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function dump() {
    const { data: oldEvents } = await supabase.from('evenements').select('*').limit(10); // get a few
    const { data: newEvents } = await supabase.from('evenements').select('*').not('source_goju2_id', 'is', null).order('created_at', { ascending: false }).limit(10);

    const output = {
        old: oldEvents[0],
        new: newEvents[0]
    };

    fs.writeFileSync('comparison_dump.json', JSON.stringify(output, null, 2));
}
dump();
