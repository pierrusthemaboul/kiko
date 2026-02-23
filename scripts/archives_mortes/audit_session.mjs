import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseProdUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const supabaseProdKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseProdUrl, supabaseProdKey);

async function audit() {
    console.log("--- AUDIT DES TROIS DERNIERS JOURS ---");
    const fridayNight = new Date('2026-01-30T18:00:00Z').toISOString();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    console.log(`\n1. Événements créés en PRODUCTION depuis Vendredi soir (${fridayNight}) :`);
    const { count: prodCount, error: prodError } = await supabase
        .from('evenements')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', fridayNight);

    if (prodError) console.error("Erreur evenements:", prodError);
    else console.log(`   Count: ${prodCount}`);

    console.log(`\n2. Événements en GOJU2 (attente migration) depuis Vendredi soir :`);
    const { count: gojuCount, error: gojuError } = await supabase
        .from('goju2')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', fridayNight);

    if (gojuError) console.error("Erreur goju2:", gojuError);
    else console.log(`   Count: ${gojuCount}`);

    console.log(`\n3. Liste des événements JOUÉS (user_event_usage) ces 3 derniers jours :`);
    const { data: usage, error: usageError } = await supabase
        .from('user_event_usage')
        .select('*, evenements(titre)')
        .gt('last_seen_at', threeDaysAgo)
        .order('last_seen_at', { ascending: false });

    if (usageError) {
        console.error("Erreur usage:", usageError);
    } else {
        console.log(`   Nombre total de vues : ${usage.length}`);
        usage.slice(0, 20).forEach((u, i) => {
            const titre = u.evenements ? u.evenements.titre : 'ID: ' + u.event_id;
            console.log(`   [${u.last_seen_at}] ${titre} (User: ${u.user_id.slice(0, 8)})`);
        });
    }

    // Check if there are any events in queue_sevent
    console.log(`\n4. État de la queue (queue_sevent) :`);
    const { count: queueCount, error: queueError } = await supabase
        .from('queue_sevent')
        .select('*', { count: 'exact', head: true });

    if (queueError) console.error("Erreur queue:", queueError);
    else console.log(`   Count: ${queueCount}`);
}

audit();
