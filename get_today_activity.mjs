import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import fs from 'fs';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function getTodayActivity() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today in local time
    // Let's use 24h ago to be sure to catch the "tout à l'heure"
    const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

    console.log(`Recherche des activités depuis ${since}...`);

    const { data, error } = await supabase
        .from('user_event_usage')
        .select('last_seen_at, evenements(titre, date), user_id')
        .gt('last_seen_at', since)
        .order('last_seen_at', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    let report = `ACTIVITÉ RÉELLE DES 12 DERNIÈRES HEURES (${data.length} événements vus)\n\n`;
    data.forEach((u, i) => {
        const titre = u.evenements ? u.evenements.titre : 'ID: ' + u.event_id;
        report += `${i + 1}. [${u.last_seen_at}] User:${u.user_id.slice(0, 6)} | ${titre}\n`;
    });

    fs.writeFileSync('today_real_activity.txt', report);
    console.log("Rapport généré : today_real_activity.txt");

    // Also check profiles to see levels
    const userIds = [...new Set(data.map(u => u.user_id))];
    if (userIds.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, level, updated_at')
            .in('id', userIds);

        let profReport = "\nPROFILS ACTIFS RÉCEMMENT :\n";
        profiles?.forEach(p => {
            profReport += `User: ${p.id.slice(0, 6)} | Level: ${p.level} | Last Update: ${p.updated_at}\n`;
        });
        fs.appendFileSync('today_real_activity.txt', profReport);
    }
}

getTodayActivity();
