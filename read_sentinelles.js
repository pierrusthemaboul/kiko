
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const supabaseServiceKey = 'sb_secret_FVCBjr7eTZDVhRM1HALgKQ_q1p1T6QK';
const userId = '9d97c5fe-9051-4da5-881a-f4f380cbb6b0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSentinelles() {
    console.log(`--- Lecture des Sentinelles (Remote Logs) pour ${userId} ---`);

    const { data, error } = await supabase
        .from('remote_debug_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Erreur lors de la lecture des logs:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('⚠️ Aucun log trouvé. Il est possible que :');
        console.log('1. La mise à jour EAS ne soit pas encore active sur ton téléphone.');
        console.log('2. Le téléphone n\'arrive pas à envoyer les logs à Supabase.');
        console.log('3. L\'événement de récompense n\'ait même pas été déclenché par le SDK AdMob.');
    } else {
        data.forEach(log => {
            console.log(`[${log.created_at}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}`);
            if (log.data) console.log('   Data:', JSON.stringify(log.data));
        });
    }
}

checkSentinelles();
