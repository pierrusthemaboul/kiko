import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkProfiles() {
    const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(5);

    data.forEach(p => {
        console.log(`User: ${p.display_name} | ID: ${p.id} | Last Play: ${p.last_play_date} | Updated: ${p.updated_at}`);
    });
}
checkProfiles();
