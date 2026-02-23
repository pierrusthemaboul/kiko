import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function check() {
    const { data } = await supabase
        .from('evenements')
        .select('titre, date, created_at, notoriete')
        .order('created_at', { ascending: false })
        .limit(100);

    console.log("Liste des 100 plus récents en PROD :");
    data?.forEach((e, i) => {
        console.log(`${i + 1}. [${e.created_at}] ${e.titre} (${e.date}) | Not: ${e.notoriete}`);
    });
}
check();
