import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function inspectSchema() {
    const { data, error } = await supabase.rpc('get_tables_info'); // If it exists
    if (error) {
        // Fallback to a query that might reveal tables
        const { data: tables, error: e2 } = await supabase.from('pg_catalog.pg_tables').select('tablename').eq('schemaname', 'public');
        // Wait, Supabase client might not allow selecting from pg_catalog directly depending on RLS/schema
        // Let's try to query a known non-existent table and see the error message if it lists others, or better:
        console.log("Searching for tables...");
    }
}

// Better way to find all tables
async function listTables() {
    const { data, error } = await supabase
        .from('evenements')
        .select('id')
        .limit(1);

    // We know evenements exists.
    // Let's try to find if there's a table for logs.
    const commonNames = ['logs', 'activity', 'history', 'views', 'usage', 'run_events', 'event_logs'];
    for (const name of commonNames) {
        const { count, error } = await supabase.from(name).select('*', { count: 'exact', head: true });
        if (!error) console.log(`Found table: ${name} (${count} rows)`);
    }
}
listTables();
