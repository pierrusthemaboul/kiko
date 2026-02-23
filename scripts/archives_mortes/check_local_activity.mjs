import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Local Supabase
const supabase = createClient('http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkLocal() {
    const { data: usage, error: e1 } = await supabase.from('user_event_usage').select('*, evenements(titre)').order('last_seen_at', { ascending: false }).limit(20);
    const { data: runs, error: e2 } = await supabase.from('runs').select('*').order('created_at', { ascending: false }).limit(20);

    console.log("=== LOCAL USAGE ===");
    usage?.forEach(u => console.log(`[${u.last_seen_at}] ${u.evenements?.titre}`));

    console.log("=== LOCAL RUNS ===");
    runs?.forEach(r => console.log(`[${r.created_at}] Mode: ${r.mode}`));
}
checkLocal();
