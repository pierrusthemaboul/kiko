import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function statsOnly() {
    const { count: migratedCount } = await supabase
        .from('evenements')
        .select('*', { count: 'exact', head: true })
        .not('source_goju2_id', 'is', null);

    const recentDate = new Date('2026-01-30T00:00:00Z').toISOString();
    const { count: recentMigrated } = await supabase
        .from('evenements')
        .select('*', { count: 'exact', head: true })
        .not('source_goju2_id', 'is', null)
        .gt('created_at', recentDate);

    console.log(`TOTAL_MIGRATED:${migratedCount}`);
    console.log(`RECENT_MIGRATED:${recentMigrated}`);

    const { data: recentEvents } = await supabase
        .from('evenements')
        .select('notoriete')
        .not('source_goju2_id', 'is', null)
        .gt('created_at', recentDate);

    let stats = { t1: 0, t2: 0, invisible: 0 };
    recentEvents.forEach(e => {
        const n = e.notoriete || 0;
        if (n >= 75) stats.t1++;
        else if (n >= 50) stats.t2++;
        else stats.invisible++;
    });
    console.log(`T1_75plus:${stats.t1}`);
    console.log(`T2_50to74:${stats.t2}`);
    console.log(`INVISIBLE_under50:${stats.invisible}`);
}

statsOnly();
