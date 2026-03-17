import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { getSupabase } from './AGENTS/shared_utils.mjs';

const supabase = getSupabase('prod');

async function runPreparateurRegen() {
    console.log("\n" + "=".repeat(40));
    console.log("♻️  PRÉPARATEUR DE RÉGÉNÉRATION (RECYCLAGE KIKO)");
    console.log("=".repeat(40));

    // 1. Lire la file d'attente des régénérations
    console.log("🔍 Vérification de la table 'aregenerer'...");
    const { data: queueItems, error } = await supabase
        .from('aregenerer')
        .select('*')
        .eq('status', 'pending');

    if (error) {
        console.error("❌ Erreur de connexion ou table introuvable:", error.message);
        console.log("👉 Avez-vous exécuté le script SQL 'setup_aregenerer.sql' dans Supabase ?");
        process.exit(1);
    }

    if (!queueItems || queueItems.length === 0) {
        console.log("∅ Aucun événement en attente de régénération.");
        return;
    }

    console.log(`📑 ${queueItems.length} événement(s) à recycler.`);

    // 2. On prépare le payload exact pour tromper CHRONOS (il croit que ça vient de l'orchestrateur)
    const payloadEvents = queueItems.map(item => ({
        id: item.evenement_id, // L'ID d'origine (même si chronos/artisan n'en ont pas besoin)
        titre: item.titre,
        year: item.year
    }));

    const orchestratorPath = path.resolve('./tools/machine_a_evenements/orchestrator_result.json');
    fs.writeFileSync(orchestratorPath, JSON.stringify({ events: payloadEvents }, null, 2));

    try {
        // --- ÉTAPE 1 : CHRONOS ---
        console.log(`\n⏳ [CHRONOS] Audit des ancres historiques pour les événements recyclés...`);
        execSync(`node agent.js`, {
            cwd: path.resolve('./tools/machine_a_evenements/AGENTS/CHRONOS'),
            stdio: 'inherit'
        });

        // --- ÉTAPE 2 : ARTISAN ---
        console.log(`\n🎨 [ARTISAN] Sculpture des métadonnées pour les événements recyclés...`);
        execSync(`node agent.js`, {
            cwd: path.resolve('./tools/machine_a_evenements/AGENTS/ARTISAN'),
            stdio: 'inherit'
        });

        // --- ÉTAPE 3 : TRANSFERT VERS LA QUEUE DE CHAMBRE NOIRE ---
        console.log(`\n🚀 [REXP] Transfert vers la File d'Attente de la Chambre Noire...`);

        const artisanOutputPath = path.resolve('./tools/machine_a_evenements/AGENTS/ARTISAN/STORAGE/OUTPUT/artisan_finished_products.json');

        if (!fs.existsSync(artisanOutputPath)) {
            console.error("❌ ARTISAN n'a pas produit le fichier attendu.");
            return;
        }

        const artisanResults = JSON.parse(fs.readFileSync(artisanOutputPath, 'utf8'));

        for (let i = 0; i < artisanResults.length; i++) {
            const artisanEvent = artisanResults[i];

            // Retrouver l'événement original complet depuis aregenerer
            // Artisan a pu modifier le titre, on se base donc sur l'index (car ils sont traités en batch synchrone)
            const originalItem = queueItems[i];

            // ⚠️ C'est ici la magie !
            // On glisse "ORIGINAL_UUID:" dans error_log. REXP (lors de l'export final) 
            // le détectera et fera un UPDATE au lieu d'un INSERT !
            const payloadQueue = {
                titre: artisanEvent.titre,
                year: artisanEvent.year,
                type: typeof artisanEvent.type === 'string' ? [artisanEvent.type] : (artisanEvent.type || ['Histoire']),
                region: artisanEvent.region || 'Monde',
                description: artisanEvent.description_flux || artisanEvent.description, // Le prompt pour Trinity
                specific_location: artisanEvent.description_detaillee, // Le texte FR
                notoriete: artisanEvent.notoriete || 0,
                status: 'pending',
                error_log: `ORIGINAL_UUID:${originalItem.evenement_id}`
            };

            const { error: insertError } = await supabase.from('queue_sevent').insert([payloadQueue]);

            if (insertError) {
                console.error(`❌ Erreur insertion dans queue_sevent pour "${payloadQueue.titre}":`, insertError.message);
            } else {
                console.log(`✅ [ÉTIQUETÉ POUR ÉCRASEMENT] "${payloadQueue.titre}" placé en salle d'attente.`);

                // Mettre à jour l'état dans aregenerer pour qu'il ne soit plus repris au prochain run
                await supabase.from('aregenerer').update({ status: 'processed' }).eq('id', originalItem.id);
            }
        }

        console.log("\n✨ Recyclage préparé avec succès !");
        console.log("👉 Lancez maintenant 'node tools/machine_a_evenements/chambre_noire.mjs' pour développer la nouvelle image et écraser l'ancienne.");

    } catch (err) {
        console.error(`\n💥 Erreur fatale au cours du processus :`, err.message);
    }
}

runPreparateurRegen();

