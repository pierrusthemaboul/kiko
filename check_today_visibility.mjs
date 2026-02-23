import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function check() {
    const today = new Date('2026-02-01T00:00:00Z').toISOString();

    console.log("Audit du 01/02/2026 :");

    const { count: totalToday } = await supabase
        .from('evenements')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', today);

    const { count: visibleToday } = await supabase
        .from('evenements')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', today)
        .gte('notoriete', 50);

    console.log(`- Total créés aujourd'hui : ${totalToday}`);
    console.log(`- Dont notoriété >= 50 : ${visibleToday}`);

    // Peek at some titles created today with notoriety < 50
    const { data: ghosts } = await supabase
        .from('evenements')
        .select('titre, notoriete')
        .gt('created_at', today)
        .lt('notoriete', 50)
        .limit(5);

    console.log("\nExemple d'événements invisibles (notoriété < 50) :");
    ghosts.forEach(g => console.log(`[${g.notoriete}] ${g.titre}`));
}

check();
