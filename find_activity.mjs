import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function findActivity() {
    const tables = [
        'evenements', 'runs', 'profiles', 'user_event_usage',
        'quest_progress', 'notifications', 'user_achievements',
        'remote_debug_logs', 'feedback'
    ];

    for (const t of tables) {
        try {
            const { data } = await supabase.from(t).select('*').order('created_at', { ascending: false }).limit(1);
            if (data && data[0]) {
                console.log(`Table ${t}: Last created_at = ${data[0].created_at}`);
            }
        } catch (e) { }
        try {
            const { data } = await supabase.from(t).select('*').order('updated_at', { ascending: false }).limit(1);
            if (data && data[0]) {
                console.log(`Table ${t}: Last updated_at = ${data[0].updated_at}`);
            }
        } catch (e) { }
    }
}
findActivity();
