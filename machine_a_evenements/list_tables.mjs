
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
    // Supabase doesn't have a direct "list tables" in its JS client easily, we can use RPC or query pg_catalog
    const { data, error } = await supabase.rpc('get_tables'); // Hope this exists or we can use another way

    if (error) {
        // Fallback: try to select from likely tables
        const tables = ['evenements', 'goju2', 'queue_sevent', 'historical_anchors'];
        for (const table of tables) {
            const { count, error: tableError } = await supabase.from(table).select('*', { head: true, count: 'exact' });
            if (!tableError) {
                console.log(`Table: ${table} - Count: ${count}`);
            } else {
                console.log(`Table: ${table} - Error/Missing: ${tableError.message}`);
            }
        }
    } else {
        console.log('Tables:', data);
    }
}

listTables();
