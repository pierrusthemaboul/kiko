import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const LOCAL_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const LOCAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const localDb = createClient(LOCAL_URL, LOCAL_KEY);

function cleanTitle(title) {
    if (!title) return '';
    return title
        .toLowerCase()
        // Remplacer les accents
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        // Retirer la ponctuation et les apostrophes
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"\[\]]/g, " ")
        // Retirer les déterminants courants de début ou au milieu (simplifié)
        .replace(/\b(le|la|les|l|un|une|des|de|du|d|au|aux)\b/g, " ")
        // Remplacer les espaces multiples par un seul
        .replace(/\s{2,}/g, " ")
        .trim();
}

async function runCleanup() {
    console.log("======================================================");
    console.log("  🧹 DÉMARRAGE DU NETTOYEUR SQL (Filtre 1 - Exact Match)");
    console.log("======================================================\n");

    console.log("📥 Téléchargement de la table 'boumboum'...");

    let allRecords = [];
    let page = 0;
    while (true) {
        const { data, error } = await localDb.from('boumboum').select('*').range(page * 1000, (page + 1) * 1000 - 1);
        if (error) {
            console.error("Erreur de lecture :", error.message);
            return;
        }
        if (!data || data.length === 0) break;
        allRecords = allRecords.concat(data);
        page++;
    }

    console.log(`📊 Total récupéré : ${allRecords.length} événements.`);

    // Groupement par clé canonique
    const groups = {};
    for (const record of allRecords) {
        const key = cleanTitle(record.titre);
        if (!groups[key]) groups[key] = [];
        groups[key].push(record);
    }

    const idsToDelete = [];
    let duplicatesCount = 0;

    console.log("\n🔍 Analyse des doublons stricts ou très proches...");

    for (const key in groups) {
        const group = groups[key];
        if (group.length > 1) {
            duplicatesCount++;
            console.log(`\n  ⚠️ Doublon trouvé pour la clé : "${key}"`);

            // On trie pour garder le meilleur. 
            // - Les VERIFIED d'abord
            // - Puis les pending
            // - Puis les CONFLIT
            group.sort((a, b) => {
                const weightRow = (r) => {
                    if (r.status && r.status.includes('VERIFIED')) return 3;
                    if (r.status === 'pending') return 2;
                    return 1; // conflits ou autres
                };
                return weightRow(b) - weightRow(a);
            });

            const keep = group[0];
            console.log(`      > GARDE : [${keep.year}] "${keep.titre}" (Statut: ${keep.status})`);

            for (let i = 1; i < group.length; i++) {
                const discard = group[i];
                console.log(`      > SUPPRIME : [${discard.year}] "${discard.titre}" (Statut: ${discard.status})`);
                idsToDelete.push(discard.id);
            }
        }
    }

    if (idsToDelete.length === 0) {
        console.log("\n✅ Aucun doublon strict trouvé. La base est parfaitement propre au niveau 1 !");
        return;
    }

    console.log(`\n🗑️ Suppression de ${idsToDelete.length} enregistrements redondants en cours...`);

    // Suppression par lots pour ne pas casser l'URL
    const chunkSize = 100;
    for (let i = 0; i < idsToDelete.length; i += chunkSize) {
        const chunk = idsToDelete.slice(i, i + chunkSize);
        const { error } = await localDb.from('boumboum').delete().in('id', chunk);
        if (error) {
            console.error("❌ Erreur lors de la suppression du lot", error.message);
        }
    }

    console.log(`🎉 SUCCÈS : Grand coup de balai terminé ! La base est allégée.`);
}

runCleanup();

