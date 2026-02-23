
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentLogs() {
    console.log('🔍 Fetching last 50 Sentinelles logs from Supabase...');

    const { data, error } = await supabase
        .from('remote_debug_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('❌ Error fetching logs:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('📭 No logs found in remote_debug_logs.');
        return;
    }

    console.log('✅ Found', data.length, 'recent logs:');

    data.reverse().forEach(log => {
        const date = new Date(log.created_at).toLocaleTimeString();
        const icon = log.level === 'error' ? '❌' : (log.level === 'warn' ? '⚠️' : 'ℹ️');
        console.log(`[${date}] ${icon} [${log.category}] ${log.message}`);
        if (log.metadata) {
            console.log(`   Metadata:`, JSON.stringify(log.metadata));
        }
    });
}

checkRecentLogs();
