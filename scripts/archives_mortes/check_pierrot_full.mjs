import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkYourSpecificActivity() {
    const userId = '9d97c5fe-912f-4161-9c6f-3199c0993557'; // ID de Pierrot
    console.log(`=== ANALYSE RÉCENTE POUR : Pierrot (${userId}) ===`);

    const { data: usage, error } = await supabase
        .from('user_event_usage')
        .select('*, evenements(titre)')
        .eq('user_id', userId);

    console.log("Usage data length:", usage?.length);
    if (usage && usage.length > 0) {
        usage.sort((a, b) => new Date(b.last_seen_at) - new Date(a.last_seen_at));
        usage.slice(0, 50).forEach((u, i) => {
            console.log(`${i + 1}. [${u.last_seen_at}] ${u.evenements?.titre}`);
        });
    }
}
checkYourSpecificActivity();
