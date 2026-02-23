
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTodayLogs() {
    const today = new Date().toISOString().split('T')[0];
    console.log(`🔍 Checking logs for ${today}...`);

    const { data, error } = await supabase
        .from('remote_debug_logs')
        .select('*')
        .gte('created_at', today)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log(`✅ Found ${data.length} logs for today.`);

    data.reverse().forEach(log => {
        const time = new Date(log.created_at).toLocaleTimeString();
        console.log(`[${time}] ${log.category} | ${log.message}`);
        if (log.metadata) console.log(`   └─ ${JSON.stringify(log.metadata)}`);
    });
}

checkTodayLogs();
