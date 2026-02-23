import fetch from 'node-fetch';
import 'dotenv/config';

async function listAllEnglishTitles() {
    const baseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co/rest/v1/evenements?select=id,titre';
    const headers = {
        'apikey': process.env.SUPABASE_PROD_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_PROD_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Range-Unit': 'items'
    };

    let allEvents = [];
    let from = 0;
    const limit = 1000;

    try {
        while (true) {
            const range = `${from}-${from + limit - 1}`;
            const response = await fetch(baseUrl, {
                headers: { ...headers, 'Range': range }
            });
            const data = await response.json();

            if (data.length === 0) break;

            allEvents = allEvents.concat(data);
            if (data.length < limit) break;
            from += limit;
        }

        console.log(`📊 Total événements récupérés : ${allEvents.length}`);

        // Mots typiquement anglais (avec séparation pour éviter les faux positifs comme "Werther")
        const englishWords = [
            /\bthe\b/i,
            /\band\b/i,
            /\bof\b/i,
            /\bwith\b/i,
            /\bfor\b/i,
            /\bin\b(?!\s+(?:fine|extremis|situ|vitro|vivo))\s+/i, // "in" suivi d'espace, mais pas "in fine" etc.
            /\bto\b/i,
            /\bat\b/i,
            /\bby\b/i,
            /\bfrom\b/i,
            /\bon\b/i,
            /\bwhich\b/i,
            /\bthat\b/i,
            /\bthis\b/i,
            /\bthese\b/i,
            /\bthose\b/i,
            /\bwho\b/i,
            /\bis\b/i,
            /\bare\b/i,
            /\bwas\b/i,
            /\bwere\b/i,
            /\bbegins\b/i,
            /\bends\b/i,
            /\bcompletion\b/i,
            /\bprotests\b/i,
            /\bagainst\b/i,
            /\bannexation\b/i,
            /\belection\b/i,
            /\bmobilization\b/i,
            /\beruption\b/i,
            /\bcreation\b/i,
            /\blaunch\b/i,
            /\bopening\b/i,
            /\bdiscovery\b/i,
            /\bfounding\b/i,
            /\bbattle\b\s+of/i,
            /\btreaty\b\s+of/i
        ];

        const suspected = allEvents.filter(e => {
            const titre = e.titre;
            // Si le titre contient un mot anglais caractéristique
            return englishWords.some(regex => regex.test(titre));
        });

        // Filtrer certains cas connus comme titres d'œuvres s'ils sont entourés de guillemets
        // Mais gardons les pour le moment, le USER triera.

        console.log(`🔍 Trouvé ${suspected.length} titres suspects en anglais :`);
        console.log("-----------------------------------------");
        suspected.forEach(e => {
            console.log(`- ${e.titre} (ID: ${e.id})`);
        });
        console.log("-----------------------------------------");

    } catch (err) {
        console.error("❌ Erreur :", err.message);
    }
}

listAllEnglishTitles();
