import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkActiveProfiles() {
    const { data: usage } = await supabase.from('user_event_usage').select('user_id');
    const userIds = [...new Set(usage.map(u => u.user_id))];

    if (userIds.length === 0) {
        console.log("No usage found.");
        return;
    }

    const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

    console.log("ACTIVE USER PROFILES:");
    profiles?.forEach(p => {
        console.log(`- ${p.id}: ${p.username || 'N/A'}`);
    });
}
checkActiveProfiles();
