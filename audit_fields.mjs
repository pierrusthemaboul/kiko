import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function auditFields() {
    console.log("=== COMPARAISON DES CHAMPS ===");

    // Un ancien événement qui marche
    const { data: oldEvent } = await supabase
        .from('evenements')
        .select('*')
        .eq('titre', 'La chute du mur de Berlin')
        .single();

    // Un nouvel événement
    const { data: newEvents } = await supabase
        .from('evenements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    const newEvent = newEvents[0];

    console.log("\n--- ANCIEN (Mur de Berlin) ---");
    console.log(JSON.stringify(oldEvent, null, 2));

    console.log("\n--- NOUVEAU ---");
    console.log(JSON.stringify(newEvent, null, 2));
}

auditFields();
