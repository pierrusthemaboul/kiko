import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function check() {
    // Try to insert without app_version
    const { error: err1 } = await supabase
        .from('user_event_usage')
        .insert({
            user_id: '9d97c5fe-912f-4161-9c6f-3199c0993557',
            event_id: '01918361-9f20-7201-9034-03487f54924c', // Real event ID from check_newest
            times_seen: 1
        });
    console.log("Insert without app_version:", err1?.message || "Success");

    // Try to insert WITH app_version
    const { error: err2 } = await supabase
        .from('user_event_usage')
        .insert({
            user_id: '9d97c5fe-912f-4161-9c6f-3199c0993557',
            event_id: '01918361-9f20-7201-9034-03487f54924c',
            times_seen: 2,
            app_version: '1.6.8'
        });
    console.log("Insert WITH app_version:", err2?.message || "Success");
}
check();
