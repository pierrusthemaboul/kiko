import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteEvent() {
    console.log("💥 Recherche de l'événement générique nommé 'Élection' (751)...");

    // On efface par sécurité le titre exact
    const { data: events, error: fetchError } = await supabase
        .from('evenements')
        .select('id, titre, date')
        .eq('titre', 'Élection')
        .eq('date', '0751-01-01');

    if (fetchError) {
        console.error("❌ Erreur de recherche:", fetchError.message);
        return;
    }

    if (events && events.length > 0) {
        console.log(`Trouvé ${events.length} événement(s) à supprimer :`);
        for (let ev of events) {
            console.log(` - Suppression de l'ID : ${ev.id} (${ev.titre} | ${ev.date})`);
            const { error: delError } = await supabase.from('evenements').delete().eq('id', ev.id);
            if (delError) {
                console.error(`❌ Échec de la suppression:`, delError.message);
            } else {
                console.log(`✅ Événement supprimé avec succès.`);
            }
        }
    } else {
        console.log("⚠️ Aucun événement 'Élection' trouvé pour l'an 751. Il a peut-être déjà été effacé.");
    }
}

deleteEvent();
