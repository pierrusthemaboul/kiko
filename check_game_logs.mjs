import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function checkDebugLogs() {
    console.log("=== VÉRIFICATION DES LOGS DE JEU (remote_debug_logs) ===");

    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: logs, error } = await supabase
        .from('remote_debug_logs')
        .select('*')
        .gt('created_at', threeDaysAgo)
        .order('created_at', { ascending: false })
        .limit(300);

    if (error) {
        console.error("Erreur logs:", error);
        return;
    }

    console.log(`Nombre total de logs trouvés (max 300) : ${logs.length}`);

    // On cherche les événements joués
    logs.forEach(log => {
        if (log.message.includes('Select') || log.message.includes('Event') || log.message.includes('Play')) {
            const time = new Date(log.created_at).toLocaleString();
            console.log(`[${time}] ${log.message}`);
            if (log.metadata) console.log(`   -> ${JSON.stringify(log.metadata)}`);
        }
    });
}
checkDebugLogs();
