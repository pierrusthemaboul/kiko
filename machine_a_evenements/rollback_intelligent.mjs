import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function deepRollback() {
    console.log("🕵️ [DEEP ROLLBACK] Recherche des illustrations d'origine par titre...");

    // 1. Charger le backup JSON
    const backup = JSON.parse(fs.readFileSync(path.join(__dirname, 'post_1945_events.json'), 'utf8'));
    console.log(`📦 Backup chargé (${backup.length} événements).`);

    // 2. Récupérer les événements modifiés aujourd'hui (ceux avec honor_)
    const { data: modified, error } = await supabase
        .from('evenements')
        .select('id, titre, illustration_url, date_formatee')
        .ilike('illustration_url', '%honor_%');

    if (error) {
        console.error(error.message);
        return;
    }

    console.log(`🔍 ${modified.length} événements à examiner.`);

    let restoredCount = 0;
    const failedToRestore = [];

    for (const event of modified) {
        // Recherche dans le backup par titre (contenant le mot clé principal)
        // On nettoie un peu le titre pour la recherche
        const cleanTitre = event.titre.toLowerCase()
            .replace("mort de ", "")
            .replace("décès de ", "")
            .replace("disparition de ", "")
            .split(":")[0].trim();

        const match = backup.find(b => {
            const bt = b.titre.toLowerCase();
            return bt.includes(cleanTitre) || cleanTitre.includes(bt) || b.id === event.id;
        });

        if (match && match.illustration_url) {
            console.log(`✅ MATCH TROUVÉ pour "${event.titre}"`);
            console.log(`   🔙 Restauration de : ${match.illustration_url}`);

            const { error: updError } = await supabase
                .from('evenements')
                .update({
                    illustration_url: match.illustration_url,
                    donnee_corrigee: false // On rétablit l'état originel
                })
                .eq('id', event.id);

            if (!updError) restoredCount++;
        } else {
            failedToRestore.push(event);
        }
    }

    console.log(`\n🎉 Restauration terminée : ${restoredCount} images rétablies.`);

    if (failedToRestore.length > 0) {
        console.log(`⚠️ ${failedToRestore.length} événements n'ont pas pu être restaurés automatiquement (non trouvés dans le backup ou pas d'URL) :`);
        failedToRestore.forEach(e => console.log(`   - [${e.date_formatee}] ${e.titre}`));
    }
}

deepRollback();
