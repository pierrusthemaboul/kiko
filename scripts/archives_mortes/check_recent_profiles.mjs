import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkRecentProfiles() {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(10);

    console.log("Dernières activités de profils :");
    data?.forEach(p => {
        console.log(`- ${p.display_name} | Updated: ${p.updated_at} | Level: ${p.level}`);
    });
}
checkRecentProfiles();
