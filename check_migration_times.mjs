import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkMigrationTimes() {
    const { data, error } = await supabase
        .from('evenements')
        .select('created_at, titre')
        .order('created_at', { ascending: false })
        .limit(10);

    console.log("Dernières insertions en PROD :");
    data?.forEach(e => {
        console.log(`[${e.created_at}] ${e.titre}`);
    });
}
checkMigrationTimes();
