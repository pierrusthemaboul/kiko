import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function listAll() {
    // Try to use a query that reveals table names if possible
    // Supabase allows some postgres queries via the /rest/v1/rpc endpoint if defined, 
    // or by querying some schemas if permissions allow.
    // Let's try to query a table that definitely doesn't exist to see the error, 
    // maybe it lists alternatives. No, that's not reliable.

    // Let's look at the "evenements" table and its relationships.
    const { data, error } = await supabase.from('evenements').select('*, user_event_usage(id)').limit(1);
    console.log("Relationship check:", error ? error.message : "OK");
}
listAll();
