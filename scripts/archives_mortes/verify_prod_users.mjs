import fetch from 'node-fetch';
import 'dotenv/config';

async function verifyUsersAndData() {
    const emails = ['pierre.cousin7@gmail.com', 'cath301168@aol.fr'];
    console.log(`🔍 Vérification des comptes pour : ${emails.join(', ')}`);

    const headers = {
        'apikey': process.env.SUPABASE_PROD_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_PROD_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
    };

    try {
        // 1. On cherche les IDs dans auth.users (necessite le service role)
        // Note: l'API REST de Supabase n'expose pas directement auth.users par defaut
        // Mais on peut essayer de voir si la table user_event_usage contient des ID

        const urlUsage = 'https://ppxmtnuewcixbbmhnzzc.supabase.co/rest/v1/user_event_usage?select=user_id,count=exact';
        const resUsage = await fetch(urlUsage, { headers });
        const dataUsage = await resUsage.json();

        console.log(`📊 Nombre total de lignes dans user_event_usage : ${dataUsage.length}`);

        if (dataUsage.length > 0) {
            console.log("Les IDs présents sont :", [...new Set(dataUsage.map(d => d.user_id))]);
        } else {
            console.log("❌ La table est absolument vide.");
        }

        // 2. On vérifie les erreurs d'upsert potentielles en testant une insertion manuelle avec un ID bidon (si possible)
        // Ou mieux, on regarde si on peut trouver le profil dans une table public (si elle existe)
        const urlProfiles = 'https://ppxmtnuewcixbbmhnzzc.supabase.co/rest/v1/profiles?email=in.(' + emails.map(e => `"${e}"`).join(',') + ')';
        const resProfiles = await fetch(urlProfiles, { headers });
        if (resProfiles.ok) {
            const profiles = await resProfiles.json();
            console.log(`👥 Profils trouvés : ${profiles.length}`);
            profiles.forEach(p => console.log(`- ${p.email} : ${p.id} (Level: ${p.level})`));
        }

    } catch (err) {
        console.error("❌ Erreur :", err.message);
    }
}

verifyUsersAndData();
