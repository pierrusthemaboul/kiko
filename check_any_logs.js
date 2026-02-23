
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAnonymousLogs() {
    console.log('🔍 Checking for ANY logs today (including anonymous)...');

    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
        .from('remote_debug_logs')
        .select('*')
        .gte('created_at', today)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log(`✅ Total logs today: ${data.length}`);
    data.forEach(log => {
        console.log(`[${log.created_at}] ${log.message} (User: ${log.user_id || 'Anon'})`);
    });
}

checkAnonymousLogs();
