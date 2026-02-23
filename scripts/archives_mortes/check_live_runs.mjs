import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function check() {
    console.log("Checking for runs started in the last 10 minutes...");
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: runs } = await supabase.from('runs').select('*').gte('created_at', tenMinAgo).order('created_at', { ascending: false });

    if (runs && runs.length > 0) {
        console.log(`${runs.length} runs found:`);
        for (const r of runs) {
            const { data: p } = await supabase.from('profiles').select('display_name').eq('id', r.user_id).single();
            console.log(`- [${r.created_at}] User: ${p?.display_name || 'Guest'} (${r.user_id}) | Mode: ${r.mode}`);
        }
    } else {
        console.log("No runs found in the last 10 minutes.");
    }
}
check();
