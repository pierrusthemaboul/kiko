import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const inputPath = path.join(__dirname, 'visual_reference_dataset_clean.json');
    const outputPath = path.join(__dirname, 'isolated_events.json'); // peintre_expert attend ce nom
    
    console.log("🔍 Extraction des REPLACE de visual_reference_dataset_clean.json...");
    const data = JSON.parse(await fs.readFile(inputPath, 'utf8'));
    
    const replaceEvents = [];
    for (const cat of Object.keys(data)) {
        for (const item of data[cat]) {
            if (item.validation_ref && item.validation_ref.startsWith('REPLACE')) {
                // On simplifie pour peintre_expert
                replaceEvents.push({
                    id: item.id,
                    titre: item.titre,
                    date: "" // On laisse le script chercher sur Wiki
                });
            }
        }
    }
    
    await fs.writeFile(outputPath, JSON.stringify(replaceEvents, null, 2));
    console.log(`✅ ${replaceEvents.length} événements isolés dans isolated_events.json.`);
}

main();
