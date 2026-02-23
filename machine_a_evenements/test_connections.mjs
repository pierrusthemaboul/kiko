
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Prod credentials found in scripts/simulate_selection.js
const PROD_URL = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const PROD_KEY = 'process.env.SUPABASE_PROD_SERVICE_ROLE_KEY';
const prod = createClient(PROD_URL, PROD_KEY);

// Local credentials found in sync_prod_to_local.mjs
const LOCAL_URL = 'http://127.0.0.1:54321';
const LOCAL_KEY = 'process.env.SUPABASE_SERVICE_ROLE_KEY';
const local = createClient(LOCAL_URL, LOCAL_KEY);

async function testConnections() {
    console.log('Testing Production connection...');
    const { data: prodData, error: prodError } = await prod.from('evenements').select('id, titre').limit(1);
    if (prodError) {
        console.error('❌ Production Error:', prodError.message);
    } else {
        console.log('✅ Production Success:', prodData[0]?.titre);
    }

    console.log('\nTesting Local connection...');
    const { data: localData, error: localError } = await local.from('goju2').select('id, titre').eq('transferred', false).limit(1);
    if (localError) {
        console.error('❌ Local Error:', localError.message);
    } else {
        console.log('✅ Local Success:', localData[0]?.titre);
    }
}

testConnections();
