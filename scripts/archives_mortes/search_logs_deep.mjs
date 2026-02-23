import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function check() {
    const tables = ['run_events', 'run_items', 'game_events', 'event_usage'];
    for (const t of tables) {
        const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
        if (!error) {
            console.log(`Table ${t}: ${count} rows`);
            const { data } = await supabase.from(t).select('*').limit(5);
            console.log("Sample:", data);
        }
    }
}
check();
