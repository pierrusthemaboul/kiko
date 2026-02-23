import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import fs from 'fs';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function list() {
    const { data } = await supabase
        .from('user_event_usage')
        .select('last_seen_at, evenements(titre), user_id')
        .order('last_seen_at', { ascending: false })
        .limit(50);

    let output = "Liste des événements joués (3 derniers jours) :\n\n";
    data.forEach(u => {
        output += `${u.last_seen_at} | ${u.evenements?.titre || 'Inconnu'} (${u.user_id.slice(0, 4)})\n`;
    });

    fs.writeFileSync('final_report.txt', output, 'utf8');
    console.log("Rapport généré dans final_report.txt");
}
list();
