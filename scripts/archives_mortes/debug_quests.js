
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQuests() {
    console.log('--- Daily Quests ---');
    const { data: quests, error: qErr } = await supabase.from('daily_quests').select('*').eq('is_active', true);
    if (qErr) console.error(qErr);
    else console.table(quests.map(q => ({ key: q.quest_key, title: q.title, target: q.target_value })));

    console.log('\n--- Recent Quest Progress (last 5) ---');
    const { data: progress, error: pErr } = await supabase.from('quest_progress').select('*, daily_quests(title)').order('updated_at', { ascending: false }).limit(5);
    if (pErr) console.error(pErr);
    else console.table(progress.map(p => ({
        id: p.id,
        user: p.user_id,
        key: p.quest_key,
        title: p.daily_quests?.title,
        val: p.current_value,
        comp: p.completed,
        claimed: p.claimed
    })));
}

checkQuests();
