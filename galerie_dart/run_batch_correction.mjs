import fs from 'fs/promises';
import path from 'path';
import { orchestrateIllustration } from './orchestrateur_images.mjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGETS_FILE = path.join(__dirname, 'bureaucratic_targets.json');
const OUTPUT_DIR = path.join(__dirname, 'batch_corrections');
const LOG_FILE = path.join(OUTPUT_DIR, 'batch_log.json');

async function runBatchCorrection() {
    console.log("🎬 Démarrage de la correction en lot...");
    
    const data = JSON.parse(await fs.readFile(TARGETS_FILE, 'utf-8'));
    const targets = data.targets;
    
    console.log(`📡 ${targets.length} événements à traiter.`);
    
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    const results = [];
    
    // Pour le test, on en fait juste 5
    const testTargets = targets.slice(0, 5);
    
    for (const event of testTargets) {
        const result = await orchestrateIllustration(event.titre, event.id, OUTPUT_DIR);
        if (result) {
            results.push(result);
            // Sauvegarde progressive
            await fs.writeFile(LOG_FILE, JSON.stringify(results, null, 2));
        }
    }
    
    console.log(`\n🎉 Batch terminé ! ${results.length} images générées.`);
    console.log(`📂 Voir le dossier : ${OUTPUT_DIR}`);
}

runBatchCorrection().catch(console.error);
