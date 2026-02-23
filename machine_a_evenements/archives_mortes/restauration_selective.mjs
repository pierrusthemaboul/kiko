import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function selectiveRollback() {
    console.log("🔍 [RESTREINT] Restauration ciblée des illustrations...");

    // 1. Charger le backup initial (celui avant mes bêtises d'aujourd'hui)
    const backupData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'titles_report_prod.json'), 'utf8'));
    const backupMap = new Map(backupData.evenements.map(e => [e.id, e]));
    console.log(`📦 Backup chargé : ${backupData.evenements.length} événements.`);

    // 2. Récupérer les événements modifiés aujourd'hui (ceux avec honor_)
    const { data: currentEvents, error } = await supabase
        .from('evenements')
        .select('id, titre, illustration_url')
        .ilike('illustration_url', '%honor_%');

    if (error) {
        console.error(error.message);
        return;
    }

    console.log(`📡 ${currentEvents.length} événements portent une image "honor_".`);

    const deathKeywords = ["Mort de", "Décès de", "Assassinat", "Suicide", "Exécution", "Pendaison", "Disparition de"];

    let restoredCount = 0;
    let discussedCount = 0;

    for (const current of currentEvents) {
        const backup = backupMap.get(current.id);

        // Est-ce un "vrai" décès de personne ?
        const isActuallyDeath = deathKeywords.some(kw => current.titre.includes(kw));

        if (backup && backup.illustration_url) {
            if (!isActuallyDeath) {
                // FAUX POSITIF (ex: Jeudi Noir, Dolly, Euro) -> RESTAURATION IMMÉDIATE
                console.log(`✅ RESTAURATION (Faux Positif) : "${current.titre}"`);
                await supabase
                    .from('evenements')
                    .update({ illustration_url: backup.illustration_url })
                    .eq('id', current.id);
                restoredCount++;
            } else {
                // VRAI DÉCÈS -> ON GARDE POUR DISCUSSION
                console.log(`⏳ À DISCUTER (Vrai Décès) : "${current.titre}"`);
                discussedCount++;
            }
        } else {
            // Pas de backup trouvé pour cet ID
            console.log(`❓ INCONNU (Pas de backup) : "${current.titre}"`);
        }
    }

    console.log(`\n✨ Résultat : ${restoredCount} images d'origine restaurées (Faux positifs).`);
    console.log(`📢 ${discussedCount} images de décès sont en attente de discussion.`);
}

selectiveRollback();
