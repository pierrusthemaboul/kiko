const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env' });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

const KEYWORDS = [
    'traité', 'accord', 'convention', 'organisation', 'signature', 
    'loi', 'réunion', 'sommet', 'conférence', 'commission', 
    'conseil', 'pacte', 'charte', 'institué', 'création de l\'organisation',
    'ministre', 'diplomatie', 'négociation', 'parlement'
];

async function identifyBureaucraticEvents() {
    console.log("🕵️ Recherche des 'Criminels de la Réunion' dans Supabase...");

    const { data: events, error } = await supabase
        .from('evenements')
        .select('id, titre, description_detaillee, illustration_url')
        // .limit(100); // Pour tester

    if (error) {
        console.error("❌ Erreur Supabase:", error);
        return;
    }

    const targets = events.filter(event => {
        const text = (event.titre + " " + (event.description_detaillee || "")).toLowerCase();
        return KEYWORDS.some(kw => text.includes(kw));
    });

    console.log(`✅ Identification terminée. ${targets.length} candidats potentiels trouvés sur ${events.length} événements.`);

    const output = {
        scan_date: new Date().toISOString(),
        total_events: events.length,
        targets_count: targets.length,
        targets: targets
    };

    fs.writeFileSync('bureaucratic_targets.json', JSON.stringify(output, null, 2));
    console.log("💾 Liste sauvegardée dans 'bureaucratic_targets.json'");
}

identifyBureaucraticEvents().catch(console.error);

