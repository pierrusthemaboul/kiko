import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjg5OTEyNywiZXhwIjoyMDQyNDc1MTI3fQ.Awhy_C5Qxb1lYn4CbJrvh6yWI5O6HBHD_W2Et85W0vQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Try to create the execute_sql RPC function
const createFunctionSQL = `
CREATE OR REPLACE FUNCTION execute_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    EXECUTE format('SELECT json_agg(t) FROM (%s) t', query) INTO result;
    RETURN COALESCE(result, '[]'::json);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'error', SQLERRM,
        'sqlstate', SQLSTATE
    );
END;
$$;
`;

console.log('Attempting to create execute_sql RPC function...');

// Since we can't execute arbitrary SQL via REST API, we need to use a different approach
// Let's try to use the Supabase Management API or suggest manual creation

console.log('Cannot create RPC function via REST API.');
console.log('Please create the function manually in the Supabase Dashboard:');
console.log('1. Go to https://app.supabase.com/project/ppxmtnuewcixbbmhnzzc/sql');
console.log('2. Paste and execute this SQL:');
console.log(createFunctionSQL);
