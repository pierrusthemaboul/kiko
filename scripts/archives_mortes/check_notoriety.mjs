import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkNotoriety() {
    const { data: newEvents } = await supabase
        .from('evenements')
        .select('titre, notoriete, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

    console.log("=== NOTORIÉTÉ DES NOUVEAUX ÉVÉNEMENTS ===");
    newEvents.forEach(e => {
        console.log(`[${e.notoriete || 'NULL'}] ${e.titre}`);
    });

    const { count: nullNot } = await supabase
        .from('evenements')
        .select('*', { count: 'exact', head: true })
        .is('notoriete', null);

    const { count: zeroNot } = await supabase
        .from('evenements')
        .select('*', { count: 'exact', head: true })
        .eq('notoriete', 0);

    const { count: highNot } = await supabase
        .from('evenements')
        .select('*', { count: 'exact', head: true })
        .gte('notoriete', 50);

    console.log(`\nÉvénements avec notoriété NULL : ${nullNot}`);
    console.log(`Événements avec notoriété = 0 : ${zeroNot}`);
    console.log(`Événements avec notoriété >= 50 : ${highNot}`);
}

checkNotoriety();
