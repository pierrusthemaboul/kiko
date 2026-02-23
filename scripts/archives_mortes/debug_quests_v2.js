
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQuests() {
    console.log('--- Daily Quests ---');
    const { data: quests, error: qErr } = await supabase.from('daily_quests').select('*');
    if (qErr) console.error('Error fetching daily_quests:', qErr);
    else {
        quests.forEach(q => {
            console.log(`Key: ${q.quest_key} | Title: ${q.title} | Target: ${q.target_value} | Active: ${q.is_active}`);
        });
    }

    console.log('\n--- Quest Progress ---');
    const { data: progress, error: pErr } = await supabase.from('quest_progress').select('*').limit(10);
    if (pErr) console.error('Error fetching quest_progress:', pErr);
    else {
        progress.forEach(p => {
            console.log(`ID: ${p.id} | User: ${p.user_id} | Key: ${p.quest_key} | Val: ${p.current_value} | Comp: ${p.completed} | Claimed: ${p.claimed}`);
        });
    }
}

checkQuests();
