
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { getSupabase } from './AGENTS/shared_utils.mjs';

const supabase = getSupabase('prod');

async function runChambreNoire() {
    console.log("\n" + "=".repeat(40));
    console.log("📸 CHAMBRE NOIRE - PRODUCTION VISUELLE");
    console.log("=".repeat(40));

    // 1. Lire la file d'attente
    const { data: queueItems, error } = await supabase
        .from('queue_sevent')
        .select('*')
        .eq('status', 'pending');

    if (error) {
        console.error("❌ Erreur lecture file d'attente:", error.message);
        return;
    }

    if (!queueItems || queueItems.length === 0) {
        console.log("∅ Aucun événement en attente dans la file.");
        return;
    }

    console.log(`📑 ${queueItems.length} événement(s) à traiter.`);
    const MAX_RETRIES = 3;

    for (const item of queueItems) {
        console.log(`\n🎬 Traitement de : "${item.titre}"...`);
        let attempt = 0;
        let success = false;
        let lastError = null;
        let feedback = "";

        while (attempt < MAX_RETRIES && !success) {
            attempt++;
            if (attempt > 1) {
                console.log(`\n🔄 [RETRY ${attempt}/${MAX_RETRIES}] Tentative de correction pour "${item.titre}"...`);
            }

            try {
                // --- ÉTAPE 1 : TRINITY (Génération) ---
                const task = {
                    id: item.id,
                    titre: item.titre,
                    year: item.year,
                    description: item.description, // English prompt
                    specific_location: item.specific_location, // French description
                    type: item.type,
                    region: item.region,
                    notoriete: item.notoriete,
                    feedback: feedback,
                    internal_metadata: item.error_log // On fait suivre l'UUID caché dans error_log
                };

                const trinityInputPath = path.resolve('./machine_a_evenements/AGENTS/TRINITY/STORAGE/INPUT/task.json');
                fs.writeFileSync(trinityInputPath, JSON.stringify(task, null, 2));

                console.log(`⏳ [TRINITY] Développement de l'image (Attempt ${attempt})...`);
                execSync(`node agent.js`, {
                    cwd: path.resolve('./machine_a_evenements/AGENTS/TRINITY'),
                    stdio: 'inherit'
                });

                // --- ÉTAPE 2 : VERITAS (Validation) ---
                console.log("⚖️ [VERITAS] Inspection historique...");
                execSync(`node agent.js`, {
                    cwd: path.resolve('./machine_a_evenements/AGENTS/VERITAS'),
                    stdio: 'inherit'
                });

                const veritasOutputPath = path.resolve('./machine_a_evenements/AGENTS/VERITAS/STORAGE/OUTPUT/veritas_result.json');
                const validationResult = JSON.parse(fs.readFileSync(veritasOutputPath, 'utf8'));

                if (validationResult.validation.isValid) {
                    console.log("✅ [CHAMBRE NOIRE] Image validée !");
                    success = true;

                    // --- ÉTAPE 3 : EXPORT (REXP) ---
                    console.log("📦 [REXP] Archivage et publication...");
                    const rexpInputPath = path.resolve('./machine_a_evenements/AGENTS/REXP/STORAGE/INPUT/final_task.json');
                    fs.writeFileSync(rexpInputPath, JSON.stringify(validationResult, null, 2));

                    execSync(`node agent.js --final`, {
                        cwd: path.resolve('./machine_a_evenements/AGENTS/REXP'),
                        stdio: 'inherit'
                    });

                    // Supprimer de la file d'attente
                    await supabase.from('queue_sevent').delete().eq('id', item.id);
                } else {
                    lastError = validationResult.validation.explanation;
                    feedback = lastError; // On stocke le feedback pour le prochain cycle Trinity
                    console.log(`❌ [CHAMBRE NOIRE] Image rejetée : ${lastError}`);
                }

            } catch (err) {
                console.error(`💥 Erreur au cycle ${attempt} pour "${item.titre}":`, err.message);
                lastError = err.message;
            }
        }

        if (!success) {
            console.log(`\n⚠️ [CHAMBRE NOIRE] Épuisement des tentatives pour "${item.titre}".`);
            // On remet en pending mais avec l'erreur pour info, ou on laisse en pending pour repasser plus tard
            await supabase.from('queue_sevent').update({
                status: 'pending', // On laisse en pending pour qu'il puisse être retenté plus tard (ou 'error' si tu préfères)
                error_log: `Echec après 3 tentatives. Dernière erreur: ${lastError}`
            }).eq('id', item.id);
        }
    }

    console.log("\n✨ Session Chambre Noire terminée.");
}

runChambreNoire();
