
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentProfileUpdates() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    console.log(`🔍 Checking profile updates since ${since}...`);

    const { data, error } = await supabase
        .from('profiles')
        .select('id, parties_per_day, updated_at')
        .gt('updated_at', since)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log(`✅ Found ${data.length} profiles updated recently.`);
    data.forEach(p => {
        console.log(`[${p.updated_at}] ID: ${p.id} | Plays: ${p.parties_per_day}`);
    });
}

checkRecentProfileUpdates();
