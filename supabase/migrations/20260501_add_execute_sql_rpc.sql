-- Create RPC function to execute arbitrary SQL queries
-- This function allows the MCP server to run SQL queries against the database
-- SECURITY WARNING: This function should only be used with service role key and proper access controls

CREATE OR REPLACE FUNCTION execute_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Execute the query and return results as JSON
    EXECUTE format('SELECT json_agg(t) FROM (%s) t', query) INTO result;
    
    RETURN COALESCE(result, '[]'::json);
EXCEPTION WHEN OTHERS THEN
    -- Return error information if query fails
    RETURN json_build_object(
        'error', SQLERRM,
        'sqlstate', SQLSTATE
    );
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION execute_sql TO service_role;
