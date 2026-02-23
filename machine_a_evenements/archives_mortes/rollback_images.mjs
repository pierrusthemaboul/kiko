import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_PROD_SERVICE_ROLE_KEY);

async function rollbackMistakes() {
    console.log("⏪ [ROLLBACK] Restauration des illustrations d'origine...");

    // 1. Charger le backup complet
    const backup = JSON.parse(fs.readFileSync(path.join(__dirname, 'post_1945_events.json'), 'utf8'));
    const backupMap = new Map(backup.map(e => [e.id, e]));
    console.log(`📦 Backup chargé (${backup.length} événements).`);

    // 2. Trouver les événements que j'ai "réparé" par erreur (commencent par honor_)
    const { data: modified, error } = await supabase
        .from('evenements')
        .select('id, titre, illustration_url')
        .ilike('illustration_url', '%honor_%');

    if (error) return;

    console.log(`🔍 ${modified.length} événements portent actuellement une image "Honor".`);

    const safeKeywords = [
        "Mort de", "Décès de", "Assassinat", "Suicide", "Exécution", "Pendaison"
    ];

    for (const event of modified) {
        // Si l'événement est dans le backup ET ne contient pas de mots morbides
        const isMorbide = safeKeywords.some(kw => event.titre.includes(kw));

        if (backupMap.has(event.id)) {
            const original = backupMap.get(event.id);

            if (!isMorbide) {
                console.log(`♻️ Restauration de l'ancienne image pour : "${event.titre}"`);
                console.log(`   🔙 ${original.illustration_url}`);

                await supabase
                    .from('evenements')
                    .update({ illustration_url: original.illustration_url })
                    .eq('id', event.id);
            } else {
                console.log(`🛡️ Conservation de la nouvelle image pour (Morbide) : "${event.titre}"`);
            }
        }
    }

    // Cas spécial manuel pour Dolly et Jeudi Noir si le titre a bougé
    const fixes = [
        { id: '1586b5ad-aa21-4e5b-ab72-121657ca246a', url: 'https://ppxmtnuewcixbbmhnzzc.supabase.co/storage/v1/object/public/evenements-image/krach%20wall%20street%201929.webp' }, // Exemple d'ID, à vérifier
        { id: 'efe10074-086f-4537-b042-2888ed0d06d6', url: 'https://ppxmtnuewcixbbmhnzzc.supabase.co/storage/v1/object/public/evenements-image/dolly%20the%20sheep.webp' }
    ];

    console.log("\n✨ Tentative de restauration terminée.");
}

rollbackMistakes();
