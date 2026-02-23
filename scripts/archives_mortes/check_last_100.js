
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLatest100() {
    console.log('🔍 Fetching the absolute 100 latest logs...');

    const { data, error } = await supabase
        .from('remote_debug_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    const entries = data.reverse();
    entries.forEach(log => {
        const date = new Date(log.created_at);
        console.log(`[${date.toLocaleString()}] ${log.message}`);
    });
}

checkLatest100();
