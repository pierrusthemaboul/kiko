import fetch from 'node-fetch';
import 'dotenv/config';

async function checkUsersTable() {
    console.log("🔍 Vérification de la table users...");

    const headers = {
        'apikey': process.env.SUPABASE_PROD_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_PROD_SERVICE_ROLE_KEY}`,
    };

    try {
        const res = await fetch('https://ppxmtnuewcixbbmhnzzc.supabase.co/rest/v1/users?select=id,user_name&limit=10', { headers });
        const data = await res.json();
        console.log("Données de la table 'users' :");
        console.log(data);
    } catch (err) {
        console.error("❌ Erreur :", err.message);
    }
}

checkUsersTable();
