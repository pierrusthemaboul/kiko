import fetch from 'node-fetch';
import 'dotenv/config';

async function checkProdConstraints() {
    console.log("🔍 Vérification des contraintes en PRODUCTION...");

    // On essaie de provoquer une erreur d'upsert pour voir le message d'erreur
    const headers = {
        'apikey': process.env.SUPABASE_PROD_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_PROD_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
    };

    try {
        const url = 'https://ppxmtnuewcixbbmhnzzc.supabase.co/rest/v1/user_event_usage?on_conflict=user_id,event_id';
        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                user_id: '00000000-0000-0000-0000-000000000000',
                event_id: '00000000-0000-0000-0000-000000000000',
                times_seen: 1
            })
        });

        const err = await res.json();
        console.log("Réponse (devrait être une erreur de FK ou de contrainte) :");
        console.log(err);
    } catch (err) {
        console.error("❌ Erreur :", err.message);
    }
}

checkProdConstraints();
