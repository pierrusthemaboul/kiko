import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkProfiles() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error(error);
        return;
    }

    console.log("Profiles récents :");
    data.forEach(p => {
        console.log(`- ${p.display_name || p.id.slice(0, 8)} | Level: ${p.level} | Updated: ${p.updated_at}`);
    });
}
checkProfiles();
