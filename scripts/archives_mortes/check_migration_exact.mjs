import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function check() {
    const { data } = await supabase
        .from('evenements')
        .select('titre, migration_at, created_at')
        .not('migration_at', 'is', null)
        .order('migration_at', { ascending: false })
        .limit(10);

    console.log("Dernières migrations vers PROD :");
    data?.forEach(e => {
        console.log(`- ${e.titre} | Migré à : ${e.migration_at} (Created: ${e.created_at})`);
    });
}
check();
