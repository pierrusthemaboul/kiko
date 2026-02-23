import fetch from 'node-fetch';
import 'dotenv/config';

async function findUserIds() {
    const emails = ['pierre.cousin7@gmail.com', 'cath301168@aol.fr'];
    console.log(`🔍 Recherche des IDs pour : ${emails.join(', ')}`);

    const headers = {
        'apikey': process.env.SUPABASE_PROD_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_PROD_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
    };

    try {
        // On essaie plusieurs tables communes pour les profils
        const tables = ['profiles', 'users_public', 'user_data'];
        for (const table of tables) {
            console.log(`Tentative sur la table : ${table}...`);
            const url = `https://ppxmtnuewcixbbmhnzzc.supabase.co/rest/v1/${table}?select=id,email`;
            const res = await fetch(url, { headers });
            if (res.ok) {
                const data = await res.json();
                const found = data.filter(u => emails.includes(u.email));
                if (found.length > 0) {
                    console.log(`✅ Trouvé dans ${table} !`);
                    found.forEach(u => console.log(`- ${u.email} : ${u.id}`));
                    return;
                }
            }
        }
        console.log("❌ Impossible de trouver les IDs via l'API REST.");
    } catch (err) {
        console.error("❌ Erreur :", err.message);
    }
}

findUserIds();
