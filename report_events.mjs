import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseProdUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const supabaseProdKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseProdUrl, supabaseProdKey);

async function report() {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

    console.log("=== RÉCAPITULATIF DES JEUX (3 DERNIERS JOURS) ===");

    const { data, error } = await supabase
        .from('user_event_usage')
        .select('last_seen_at, evenements(titre, date), user_id')
        .gt('last_seen_at', threeDaysAgo)
        .order('last_seen_at', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    if (data.length === 0) {
        console.log("Aucun événement joué.");
    } else {
        data.forEach((u, i) => {
            const titre = u.evenements ? u.evenements.titre : 'Inconnu';
            const year = u.evenements ? u.evenements.date : '????';
            const time = new Date(u.last_seen_at).toLocaleString('fr-FR');
            console.log(`${i + 1}. [${time}] (${u.user_id.slice(0, 4)}) ${titre} (${year})`);
        });
    }

    console.log("\n=== ÉVÉNEMENTS RÉCENTS EN PRODUCTION (MIGRÉS) ===");
    const fridayNight = new Date('2026-01-30T18:00:00Z').toISOString();
    const { data: newEvents, error: newError } = await supabase
        .from('evenements')
        .select('titre, date, created_at')
        .gt('created_at', fridayNight)
        .order('created_at', { ascending: false });

    if (newError) console.error(newError);
    else if (newEvents.length === 0) console.log("Aucun nouvel événement en production depuies vendredi soir.");
    else {
        newEvents.forEach((e, i) => {
            console.log(`${i + 1}. [${e.created_at}] ${e.titre} (${e.date})`);
        });
    }

    console.log("\n=== ÉVÉNEMENTS RÉCENTS EN LOCAL (NON MIGRÉS) ===");
    const supabaseLocal = createClient('http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: localEvents, error: localError } = await supabaseLocal
        .from('goju2')
        .select('titre, date, created_at')
        .gt('created_at', fridayNight)
        .order('created_at', { ascending: false });

    if (localError) console.error("Erreur Locale (Supabase local est-il lancé ?) :", localError.message);
    else if (localEvents.length === 0) console.log("Aucun événement local récent.");
    else {
        console.log(`Il y a ${localEvents.length} événements qui attendent en local.`);
        localEvents.slice(0, 5).forEach((e, i) => {
            console.log(`${i + 1}. [${e.created_at}] ${e.titre} (${e.date})`);
        });
    }
}

report();
