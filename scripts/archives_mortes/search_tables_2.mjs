import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function findTables() {
    // Try to query information_schema if allowed (standard Supabase doesn't allow this via API, but let's try)
    const { data, error } = await supabase.from('information_schema.tables').select('table_name').eq('table_schema', 'public');
    if (error) {
        console.log("Cannot access information_schema directly. Error:", error.message);
        // Guerilla searching
        const guesses = ['user_event_usage', 'event_usage', 'usage_events', 'plays', 'run_events', 'history_events', 'seen_events'];
        for (const g of guesses) {
            const { count, error } = await supabase.from(g).select('*', { count: 'exact', head: true });
            if (!error) console.log(`Found: ${g} (${count} rows)`);
        }
    } else {
        console.log("Tables found:", data.map(t => t.table_name));
    }
}
findTables();
