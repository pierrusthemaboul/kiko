require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const supabaseServiceKey = 'process.env.SUPABASE_PROD_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAnyLogs() {
    console.log(`--- Lecture de TOUTES les Sentinelles (Dernières 50) ---`);

    const { data, error } = await supabase
        .from('remote_debug_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('Erreur lors de la lecture des logs:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('⚠️ Strictement aucun log en base.');
    } else {
        data.forEach(log => {
            console.log(`[${log.created_at}] [${log.user_id || 'ANONYMOUS'}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}`);
        });
    }
}

checkAnyLogs();
