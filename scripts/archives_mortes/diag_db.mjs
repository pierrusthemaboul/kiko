import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: gojuData } = await supabase.from('goju2')
        .select('titre, date, score_validation, illustration_url')
        .order('created_at', { ascending: false })
        .limit(5);

    console.log('--- DERNIERS SUCCÈS DANS GOJU2 ---');
    console.table(gojuData);

    const { data: queueData } = await supabase.from('queue_sevent')
        .select('titre, status, error_log')
        .neq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

    console.log('--- DERNIERS ÉTATS DE LA QUEUE ---');
    console.table(queueData);
}

check();
