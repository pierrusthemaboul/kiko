import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { assertEnv } from './utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

export const localDb = getLocalDb();
export const prodDb = getProdDb();

export function assertSupabaseConfig() {
    assertEnv('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
    assertEnv('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL);
    assertEnv('SUPABASE_PROD_SERVICE_ROLE_KEY', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);
}

export function getLocalDb() {
    const url = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    return createClient(url, key);
}

export function getProdDb() {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
    return createClient(url, key);
}

