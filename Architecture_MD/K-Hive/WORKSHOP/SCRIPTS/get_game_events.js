import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Configuration (Fallback comme pour les autres scripts)
const supabaseUrl = 'https://ppxmtnuewcixbbmhnzzc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBweG10bnVld2NpeGJibWhuenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY4OTkxMjcsImV4cCI6MjA0MjQ3NTEyN30.0z2be74E3db-XvyIKXPlogI__9Ric1Il4cZ1Fs7TJ5U';

const supabase = createClient(supabaseUrl, supabaseKey);

// Arguments : --search "Napoléon" ou rien pour aléatoire
const args = process.argv.slice(2);
const searchIndex = args.indexOf('--search');
const searchTerm = searchIndex !== -1 ? args[searchIndex + 1] : null;

async function fetchGameContent() {
    console.log("🎲 Recherche dans le Catalogue du Jeu...");

    let query = supabase
        .from('evenements')
        .select('id, titre, date_formatee, region, illustration_url, description_detaillee')
        .limit(5);

    if (searchTerm) {
        console.log(`🔍 Filtre : "${searchTerm}"`);
        query = query.ilike('titre', `%${searchTerm}%`);
    } else {
        // Mode aléatoire (hack : on prend une range au pif si possible, ou juste les derniers)
        // Note: Supabase n'a pas de .random() natif simple via API JS sans RPC
        // On va prendre les 5 derniers pour l'instant
        query = query.order('created_at', { ascending: false });
    }

    const { data: events, error } = await query;

    if (error) {
        console.error("❌ Erreur Supabase :", error.message);
        return;
    }

    if (!events || events.length === 0) {
        console.log("🚫 Aucun événement trouvé.");
        return;
    }

    // Formatage pour Marc
    let output = "# 🎮 CONTENU DU JEU DISPONIBLE\n\n";
    events.forEach(evt => {
        const imgUrl = evt.illustration_url || "AUCUNE_IMAGE";

        output += `## 📜 ${evt.titre}\n`;
        output += `- **Date** : ${evt.date_formatee}\n`;
        output += `- **Région** : ${evt.region}\n`;
        output += `- **Image Officielle** : ${imgUrl}\n`;
        output += `- **Contexte** : ${evt.description_detaillee || "N/A"}\n\n`;
    });

    // Sauvegarde pour l'agent
    const reportPath = './Architecture_MD/K-Hive/DATA_INBOX/GAME_CONTENT_SUGGESTIONS.md';
    fs.writeFileSync(reportPath, output);

    console.log(output);
    console.log(`✅ Suggestions générées dans : ${reportPath}`);
}

fetchGameContent();
