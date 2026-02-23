import pkg from 'pg';
const { Client } = pkg;

async function checkHistoryRaw() {
    const client = new Client({
        connectionString: "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
    });

    try {
        await client.connect();
        console.log("🐘 Connecté à Postgres en direct !");

        const res = await client.query(`
            SELECT 
                u.last_seen_at, 
                u.times_seen, 
                e.titre,
                u.user_id
            FROM public.user_event_usage u
            JOIN public.evenements e ON u.event_id = e.id
            ORDER BY u.last_seen_at DESC
            LIMIT 20
        `);

        if (res.rows.length === 0) {
            console.log("📭 Aucun enregistrement trouvé dans la table.");
        } else {
            console.log(`\n📋 ${res.rows.length} derniers événements joués :\n`);
            res.rows.forEach((row, i) => {
                console.log(`${i + 1}. [${row.last_seen_at.toISOString()}] ${row.titre} - Vu ${row.times_seen} fois (User ID: ${row.user_id.slice(0, 8)}...)`);
            });
        }

        // On va aussi recharger le schéma PostgREST pendant qu'on y est
        await client.query("NOTIFY pgrst, 'reload schema';");
        console.log("\n🚀 Signal 'reload schema' envoyé à PostgREST.");

    } catch (err) {
        console.error("❌ Erreur SQL :", err.message);
    } finally {
        await client.end();
    }
}

checkHistoryRaw();
