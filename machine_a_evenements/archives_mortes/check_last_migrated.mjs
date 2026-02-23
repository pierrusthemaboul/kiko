
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const PROD_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const PROD_KEY = 'process.env.SUPABASE_PROD_SERVICE_ROLE_KEY';
const prod = createClient(PROD_URL, PROD_KEY);

async function checkLastMigrated() {
    const { data, error } = await prod
        .from('evenements')
        .select('*')
        .order('migration_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Last migrated event in Prod:', JSON.stringify(data[0], null, 2));
    }
}

checkLastMigrated();
