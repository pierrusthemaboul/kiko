
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const PROD_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const PROD_KEY = 'process.env.SUPABASE_PROD_SERVICE_ROLE_KEY';
const prod = createClient(PROD_URL, PROD_KEY);

async function checkStorage() {
    const { data: buckets, error } = await prod.storage.listBuckets();
    if (error) {
        console.error('❌ Error listing buckets:', error.message);
    } else {
        console.log('✅ Buckets:', buckets.map(b => b.name));
    }
}

checkStorage();
