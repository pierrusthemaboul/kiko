import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient('http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAnyUsage() {
    console.log("🕵️ Vérification globale de la table user_event_usage...");

    // On essaie de recharger le schéma en faisant un appel bidon ou via une commande si possible
    // Mais ici le plus simple est de tenter une requête brute si possible, 
    // ou juste d'espérer que ça marche avec le service_role qui a pu être rafraîchi.

    const { data, error } = await supabase
        .from('user_event_usage')
        .select('*');

    if (error) {
        console.error("❌ Erreur table:", error.message);
        // Si erreur de cache, on essaie une autre approche
        return;
    }

    console.log(`📊 Nombre total de lignes : ${data.length}`);
    if (data.length > 0) {
        console.log("Dernières lignes :");
        console.log(data.slice(-5));
    } else {
        console.log("📭 La table est vide.");
    }
}

checkAnyUsage();
