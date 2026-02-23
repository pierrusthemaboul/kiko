
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function forceExport() {
    console.log("🚀 RÉCUPÉRATION DE LA SESSION DU BUREAU 2...");

    // 1. Charger les résultats intermédiaires
    const resultPath = 'machine_a_evenements/orchestrator2_result.json';
    if (!fs.existsSync(resultPath)) {
        console.error("❌ Aucun résultat intermédiaire trouvé à exporter.");
        return;
    }

    const data = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
    console.log(`📦 Événements trouvés : ${data.events.length} (${data.pillers_obtained} piliers, ${data.bonus_obtained} bonus)`);

    if (data.events.length === 0) {
        console.log("⚠️ Liste vide, rien à exporter.");
        return;
    }

    console.log("\n" + "═".repeat(50));
    console.log("🛠️  PHASE D'ENRICHISSEMENT FORCÉE");
    console.log("═".repeat(50));

    try {
        // STEP 4: CHRONOS
        console.log(`\n⏳ [CHRONOS] Audit des ancres historiques...`);
        execSync(`node agent.js`, {
            cwd: path.resolve('./machine_a_evenements/AGENTS/CHRONOS'),
            stdio: 'inherit'
        });

        // STEP 5: ARTISAN2
        console.log(`\n🎨 [ARTISAN2] Enrichissement premium...`);
        execSync(`node agent.js`, {
            cwd: path.resolve('./machine_a_evenements/AGENTS/ARTISAN2'),
            stdio: 'inherit'
        });

        // STEP 6: REXP
        const artisan2Output = path.resolve('./machine_a_evenements/AGENTS/ARTISAN2/STORAGE/OUTPUT/artisan2_finished_products.json');
        const artisanOutput = path.resolve('./machine_a_evenements/AGENTS/ARTISAN/STORAGE/OUTPUT/artisan_finished_products.json');
        if (fs.existsSync(artisan2Output)) {
            fs.copyFileSync(artisan2Output, artisanOutput);
        }

        console.log(`\n🚀 [REXP] Insertion finale dans queue_sevent...`);
        execSync(`node agent.js`, {
            cwd: path.resolve('./machine_a_evenements/AGENTS/REXP'),
            stdio: 'inherit'
        });

        console.log("\n✅ EXPORTATION RÉUSSIE ! Tes événements sont en base.");
    } catch (error) {
        console.error(`\n❌ Erreur pendant l'export :`, error.message);
    }
}

forceExport();
