
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLatestLogs() {
    console.log('🔍 Fetching the absolute 10 latest logs...');

    const { data, error } = await supabase
        .from('remote_debug_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    data.forEach(log => {
        console.log(`[${log.created_at}] ${log.message}`);
    });
}

checkLatestLogs();
