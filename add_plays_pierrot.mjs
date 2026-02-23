import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('https://ppxmtnuewcixbbmhnzzc.supabase.co', process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function addPlays() {
    const userId = '6d6fbf81-0727-401a-b81a-f4f380cbb6b0'; // Pierrot
    console.log(`Ajout de parties illimitées pour Pierrot (${userId})...`);

    const { data, error } = await supabase
        .from('profiles')
        .update({
            is_admin: true,
            parties_per_day: 999
        })
        .eq('id', userId)
        .select();

    if (error) {
        console.error("Erreur lors de la mise à jour:", error);
    } else {
        console.log("✅ Profil mis à jour ! Pierrot est maintenant admin avec 999 parties/jour.");
        console.log("Nouveau quota:", data[0].parties_per_day);
    }
}
addPlays();
