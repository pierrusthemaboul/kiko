import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function check() {
    const userId = '9d97c5fe-912f-4161-9c6f-3199c0993557';
    const { data: runs } = await supabase
        .from('runs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

    console.log("Derniers runs de Pierrot:");
    runs?.forEach(r => console.log(`[${r.created_at}] Mode: ${r.mode} | Points: ${r.points}`));
}
check();
