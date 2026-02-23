import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY);

async function dumpUsage() {
    const { data, error } = await supabase
        .from('user_event_usage')
        .select(`
            *,
            evenements (titre)
        `)
        .order('last_seen_at', { ascending: false });

    if (error) {
        console.error("Erreur:", error.message);
        return;
    }

    console.log("DUMP DES ÉVÉNEMENTS JOUÉS :");
    console.log(JSON.stringify(data, null, 2));
}

dumpUsage();
