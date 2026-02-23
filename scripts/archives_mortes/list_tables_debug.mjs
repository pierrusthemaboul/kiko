import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listTables() {
    const { data, error } = await supabase.rpc('get_tables'); // Check if RPC exists
    if (error) {
        // SQL fallback
        const { data: sqlData, error: sqlError } = await supabase.from('evenements').select('id').limit(1);
        console.log("Accès 'evenements' :", sqlError ? sqlError.message : "OK");

        // Let's try to query pg_tables via a function if possible, or just guess.
        // Usually, we don't have direct SQL access via Supabase Client unless configured.
    }

    // Test simple sans join
    const { data: usageData, error: usageError } = await supabase.from('user_event_usage').select('*').limit(5);
    console.log("Accès 'user_event_usage' :", usageError ? usageError.message : "OK");
    if (usageData) console.log("Données :", usageData);
}

listTables();
