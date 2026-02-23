import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function check() {
    // Try to insert without app_version
    const { data: someEvents } = await supabase.from('evenements').select('id').limit(1);
    const eventId = someEvents[0].id;
    const userId = '9d97c5fe-912f-4161-9c6f-3199c0993557';

    console.log(`Testing with Event: ${eventId} and User: ${userId}`);

    const { error: err1 } = await supabase
        .from('user_event_usage')
        .upsert({
            user_id: userId,
            event_id: eventId,
            times_seen: 1,
            last_seen_at: new Date().toISOString()
        }, { onConflict: 'user_id,event_id' });

    console.log("Upsert without app_version:", err1?.message || "Success");

    const { error: err2 } = await supabase
        .from('user_event_usage')
        .upsert({
            user_id: userId,
            event_id: eventId,
            times_seen: 1,
            last_seen_at: new Date().toISOString(),
            app_version: '1.6.8'
        }, { onConflict: 'user_id,event_id' });

    console.log("Upsert WITH app_version:", err2?.message || "Success");
}
check();
