
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserLogs() {
    const userId = 'dc7d91b8-b365-45ba-8652-07c83ade20f6';
    console.log(`🔍 Checking logs for specific user ${userId}...`);

    const { data, error } = await supabase
        .from('remote_debug_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log(`✅ Found ${data.length} logs for this user.`);
    data.forEach(log => {
        console.log(`[${log.created_at}] ${log.message}`);
    });
}

checkUserLogs();
