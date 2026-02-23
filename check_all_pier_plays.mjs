import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkAll() {
    const { data: profiles } = await supabase.from('profiles').select('*').ilike('display_name', '%Pier%');
    const today = new Date().toISOString().split('T')[0];

    for (const p of profiles) {
        const { count } = await supabase.from('runs').select('id', { count: 'exact', head: true }).eq('user_id', p.id).gte('created_at', today);
        console.log(`Profile: ${p.display_name} (${p.id}) | Plays: ${count}/${p.is_admin ? '999' : p.parties_per_day} | Updated: ${p.updated_at}`);
    }
}
checkAll();
