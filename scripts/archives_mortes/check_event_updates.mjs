import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function check() {
    const { data } = await supabase
        .from('evenements')
        .select('titre, updated_at')
        .order('updated_at', { ascending: false })
        .limit(20);

    console.log("Dernières mises à jour d'événements :");
    data?.forEach(e => {
        console.log(`[${e.updated_at}] ${e.titre}`);
    });
}
check();
