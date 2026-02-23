import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function check() {
    console.log("Recherche de l'activité de Pierrot (9d97c5fe-9051-4da5-881a-f4f380cbb6b0)...");
    const pierrotId = '9d97c5fe-9051-4da5-881a-f4f380cbb6b0';

    const { data: usage } = await supabase
        .from('user_event_usage')
        .select('*')
        .eq('user_id', pierrotId)
        .order('last_seen_at', { ascending: false })
        .limit(5);

    console.log("USAGE PIERROT:", usage);

    const { data: runs } = await supabase
        .from('runs')
        .select('*')
        .eq('user_id', pierrotId)
        .order('created_at', { ascending: false })
        .limit(5);

    console.log("RUNS PIERROT:", runs);
}
check();
