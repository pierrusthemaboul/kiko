import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkEventLogs() {
    console.log("=== VÉRIFICATION DE event_logs ===");
    const { data, error } = await supabase
        .from('event_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error("Error:", error.message);
        return;
    }

    console.log(`Nombre d'entrées: ${data.length}`);
    data.forEach((l, i) => {
        console.log(`${i + 1}. [${l.created_at}] Event:${l.event_id} | User:${l.user_id}`);
    });
}
checkEventLogs();
