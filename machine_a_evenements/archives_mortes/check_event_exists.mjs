
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEvent() {
    const { data, error } = await supabase
        .from('evenements')
        .select('id, titre, date_formatee')
        .or('titre.ilike.%Henri IV%,titre.ilike.%Assassinat%');

    if (error) {
        console.error("Erreur :", error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log("🔍 Événements trouvés :");
        data.forEach(e => console.log(`- [${e.id}] ${e.titre} (${e.date_formatee})`));
    } else {
        console.log("❌ Aucun événement trouvé avec 'Henri IV' ou 'Assassinat'.");
    }
}

checkEvent();
