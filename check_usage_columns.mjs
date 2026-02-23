import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkColumns() {
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'user_event_usage' });

    // If RPC doesn't exist, try a simple select and check keys
    const { data: oneRow } = await supabase.from('user_event_usage').select('*').limit(1);

    console.log("Exemple de ligne user_event_usage:", oneRow);
}

// Alternative check via information_schema if possible
async function checkSchema() {
    const { data, error } = await supabase
        .from('user_event_usage')
        .select('*')
        .limit(1);

    // Let's also try to insert a test row to see the error
    const { error: insertError } = await supabase
        .from('user_event_usage')
        .insert({
            user_id: '9d97c5fe-912f-4161-9c6f-3199c0993557', // Pierrot
            event_id: '0001083e-1010-48e0-8208-89c091910609', // Dummy event id
            app_version: 'test'
        });

    console.log("Test insertion avec app_version error:", insertError?.message);
}
checkSchema();
