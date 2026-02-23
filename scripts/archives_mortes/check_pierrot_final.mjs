import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function check() {
    const userId = '6d6fbf81-0727-401a-b81a-f4f380cbb6b0';
    console.log(`=== ANALYSE POUR Pierrot (${userId}) ===`);

    const { data: usage } = await supabase
        .from('user_event_usage')
        .select('*, evenements(titre)')
        .eq('user_id', userId)
        .order('last_seen_at', { ascending: false });

    console.log(`Usage: ${usage?.length} events`);
    usage?.slice(0, 10).forEach(u => console.log(`- [${u.last_seen_at}] ${u.evenements?.titre}`));

    const { data: runs } = await supabase
        .from('runs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    console.log(`Runs: ${runs?.length}`);
    runs?.slice(0, 5).forEach(r => console.log(`- [${r.created_at}] Mode: ${r.mode} | Points: ${r.points}`));
}
check();
