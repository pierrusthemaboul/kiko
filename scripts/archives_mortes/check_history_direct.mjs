import fetch from 'node-fetch';
import 'dotenv/config';

async function getHistoryDirect() {
    console.log("📡 Vérification des derniers événements enregistrés...");

    const url = 'http://127.0.0.1:54321/rest/v1/user_event_usage?select=*,evenements(titre)&order=last_seen_at.desc&limit=20';
    const headers = {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
    };

    try {
        const response = await fetch(url, { headers });
        if (!response.ok) {
            const err = await response.text();
            throw new Error(`HTTP ${response.status}: ${err}`);
        }

        const data = await response.json();

        if (data.length === 0) {
            console.log("📭 Aucun enregistrement trouvé. Cela peut être normal si tu joues en mode 'Invité' (les données sont alors uniquement dans le téléphone via AsyncStorage).");
        } else {
            console.log(`\n✅ ${data.length} derniers événements enregistrés en base :\n`);
            data.forEach((u, i) => {
                const titre = u.evenements ? u.evenements.titre : 'Inconnu';
                const version = u.app_version || 'N/A';
                console.log(`${i + 1}. [${u.last_seen_at}] ${titre} (v${version}) - Vu ${u.times_seen} fois (User: ${u.user_id.slice(0, 8)})`);
            });
        }
    } catch (err) {
        console.error("❌ Erreur accès base :", err.message);
    }
}

getHistoryDirect();
