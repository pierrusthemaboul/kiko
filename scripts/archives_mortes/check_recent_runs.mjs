import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkRuns() {
    console.log("=== VÉRIFICATION DES RUNS (3 DERNIERS JOURS) ===");

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: runs, error } = await supabase
        .from('runs')
        .select('id, created_at, mode, user_id')
        .gt('created_at', threeDaysAgo)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Erreur runs:", error);
        return;
    }

    console.log(`Nombre total de runs : ${runs.length}`);
    runs.forEach((r, i) => {
        console.log(`${i + 1}. [${r.created_at}] User:${r.user_id.slice(0, 6)} | Mode:${r.mode}`);
    });
}
checkRuns();
