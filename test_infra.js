
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    console.log('Testing Supabase connection...');
    const { data, error } = await supabase.from('goju2').select('id').limit(1);
    if (error) {
        console.error('Supabase Error:', error);
    } else {
        console.log('Supabase OK, data found:', data.length);
    }

    if (global.fetch) {
        console.log('Global fetch is available');
    } else {
        console.log('Global fetch is NOT available');
    }
}

test();
