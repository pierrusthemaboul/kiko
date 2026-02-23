import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function check() {
    const { data } = await supabase
        .from('evenements')
        .select('titre, migration_at')
        .not('migration_at', 'is', null)
        .gte('migration_at', '2026-02-01T00:00:00Z')
        .order('migration_at', { ascending: true });

    console.log(`Nombre de migrations aujourd'hui : ${data.length}`);
    if (data.length > 0) {
        console.log(`Première migration today : ${data[0].migration_at}`);
        console.log(`Dernière migration today : ${data[data.length - 1].migration_at}`);
    }
}
check();
