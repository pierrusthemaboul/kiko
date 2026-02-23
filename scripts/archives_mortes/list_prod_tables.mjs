import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function listAllTables() {
    // This is a trick to list tables via RPC if available, or just check common ones
    const tables = [
        'evenements', 'runs', 'profiles', 'user_event_usage',
        'run_events', 'event_usage', 'game_sessions', 'quest_progress'
    ];

    for (const t of tables) {
        const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
        if (error) {
            console.log(`Table ${t}: Error (${error.message})`);
        } else {
            console.log(`Table ${t}: ${count} rows`);
        }
    }
}
listAllTables();
