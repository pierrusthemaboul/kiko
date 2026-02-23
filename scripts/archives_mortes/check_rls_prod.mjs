import fetch from 'node-fetch';
import 'dotenv/config';

async function checkRLSProd() {
    console.log("🛡️ Vérification des politiques RLS en PRODUCTION...");

    // On requête pg_policies via la vue rpc si elle existe, ou via une astuce
    // Mais on peut simplement essayer d'insérer un record avec l'ID d'un utilisateur réel (Pierre)
    // Sauf que je n'ai pas son ID.

    // Test : Est-ce qu'on peut lire la table avec la clé Anon ?
    const headersAnon = {
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
    };

    const res = await fetch('https://ppxmtnuewcixbbmhnzzc.supabase.co/rest/v1/user_event_usage?select=*', { headers: headersAnon });
    if (res.status === 401 || res.status === 403) {
        console.log("❌ Accès Anonyme REFUSÉ (Normal si RLS est ON).");
    } else {
        console.log(`✅ Accès Anonyme STATUS : ${res.status}`);
    }
}

checkRLSProd();
