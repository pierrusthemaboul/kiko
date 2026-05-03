import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// .env is in the root, script is in scratch/
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    console.log("Current ENV keys:", Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    process.exit(1);
}

const supabase = createClient(url, key);

const sql = `
CREATE TABLE IF NOT EXISTS public.support_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sender TEXT NOT NULL,
    subject TEXT,
    body TEXT,
    source TEXT DEFAULT 'unknown',
    status TEXT DEFAULT 'unread',
    raw_data JSONB
);

-- Basic RLS
ALTER TABLE public.support_emails ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'support_emails' AND policyname = 'Allow authenticated users to read support emails'
    ) THEN
        CREATE POLICY "Allow authenticated users to read support emails"
        ON public.support_emails FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END
$$;
`;

async function run() {
    console.log(`Using Supabase URL: ${url}`);
    const { data, error } = await supabase.rpc('execute_sql', { query: sql });
    
    if (error) {
        console.error("Error creating table:", error);
    } else {
        console.log("Table created successfully.", data);
    }
}

run();
