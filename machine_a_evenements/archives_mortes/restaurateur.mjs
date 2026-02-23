import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function restore() {
    console.log("🛠️ [RESTAURATEUR] Restauration de la précision historique...");

    // 1. Charger le backup partiel (Post-1945)
    let backupMap = new Map();
    try {
        const backupData = JSON.parse(fs.readFileSync(path.join(__dirname, 'post_1945_events.json'), 'utf8'));
        backupData.forEach(e => backupMap.set(e.id, e));
        console.log(`📦 Backup chargé : ${backupMap.size} événements.`);
    } catch (e) {
        console.error("❌ Impossible de charger le backup JSON.");
    }

    // 2. Trouver les événements modifiés par le purificateur
    // On cherche ceux qui ont donnee_corrigee = true OU des titres suspects
    const suspects = [
        "L'Héritage de", "Héritage de", "L'ère ", "L'Ère ", "Hommage à",
        "Vision et", "Un talent", "Un Règne", "Un Empire", "Un Roi",
        "Légende et", "Un Phare d'Espoir"
    ];

    let allMatches = [];
    for (const s of suspects) {
        const { data } = await supabase.from('evenements').select('*').ilike('titre', `%${s}%`);
        if (data) allMatches = allMatches.concat(data);
    }

    const uniqueMatches = Array.from(new Map(allMatches.map(item => [item.id, item])).values());
    console.log(`🔍 ${uniqueMatches.length} événements suspects trouvés en production.`);

    for (const event of uniqueMatches) {
        console.log(`\n🔄 Restauration de : "${event.titre}"...`);

        if (backupMap.has(event.id)) {
            // RESTAURATION PARFAITE (Backup JSON)
            const original = backupMap.get(event.id);
            const { error } = await supabase
                .from('evenements')
                .update({
                    titre: original.titre,
                    description_detaillee: original.description_detaillee,
                    donnee_corrigee: false // On remet à l'état initial
                })
                .eq('id', event.id);

            if (!error) console.log(`   ✅ Restauration complète via backup JSON : "${original.titre}"`);
            else console.error(`   ❌ Erreur update : ${error.message}`);
        } else {
            // RESTAURATION INTELLIGENTE (Si pas dans le backup, ex: événements anciens)
            // On peut essayer de déduire le titre d'origine ou utiliser un audit précédent
            console.log(`   ⚠️ Pas de backup JSON pour cet ID (Probablement un événement ancien). Tentative de restauration intelligente...`);

            // On peut tenter de chercher si le titre d'origine est dans la description (souvent le purificateur y laisse des indices)
            // Ou on laisse l'utilisateur valider, mais ici on va essayer de restaurer les termes "Mort", "Assassinat", etc.
            // Pour Clovis par exemple : "L'Héritage de Clovis : Unificateur des Francs" -> "Mort de Clovis Ier"
            // On va utiliser un petit prompt spécifique pour RESTAURER LA PRÉCISION.
        }
    }

    console.log("\n✨ Phase 1 de restauration terminée.");
}

restore();
