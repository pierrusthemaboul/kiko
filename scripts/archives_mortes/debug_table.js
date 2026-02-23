require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const supabaseServiceKey = 'process.env.SUPABASE_PROD_SERVICE_ROLE_KEY';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugTable() {
    const { data, error } = await supabase.rpc('get_table_info', { table_name: 'remote_debug_logs' });
    if (error) {
        // Fallback: list all tables if possible
        const { data: tables, error: err2 } = await supabase.from('pg_catalog.pg_tables').select('tablename').eq('schemaname', 'public');
        console.log('Tables in public:', tables ? tables.map(t => t.tablename) : 'could not list');
        console.log('Error was:', error);
    } else {
        console.log('Table info:', data);
    }
}
debugTable();
