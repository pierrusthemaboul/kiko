import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function start() {
    console.log("🗑️ Suppression des événements avec notoriété < 20...");
    
    const { data, count, error } = await supabase
        .from('evenements')
        .delete({ count: 'exact' })
        .lt('notoriete_fr', 20);

    if (error) {
        console.error("❌ Erreur lors de la suppression :", error.message);
    } else {
        console.log(`✅ Suppression terminée. ${count} événements supprimés.`);
    }
}

start();
